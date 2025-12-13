using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Infrastructure.Data;
using Testcontainers.PostgreSql;

namespace SecondBrain.Tests.Integration.Fixtures;

/// <summary>
/// Custom WebApplicationFactory for integration testing.
/// Configures test database and mocks external services.
///
/// Supports two modes:
/// 1. Local development: Uses Testcontainers to spin up PostgreSQL
/// 2. CI environment: Uses pre-configured PostgreSQL service (via ConnectionStrings__DefaultConnection env var)
/// </summary>
public class WebApplicationFactoryFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private PostgreSqlContainer? _container;
    private string? _ciConnectionString;

    /// <summary>
    /// The connection string to the test database.
    /// Uses CI-provided connection string if available, otherwise Testcontainers.
    /// </summary>
    public string ConnectionString => _ciConnectionString ?? _container?.GetConnectionString()
        ?? throw new InvalidOperationException("Database not initialized");

    /// <summary>
    /// Whether we're running in CI mode (using pre-configured database).
    /// </summary>
    public bool IsCiMode => _ciConnectionString != null;

    /// <summary>
    /// JWT token for authenticated requests in tests.
    /// </summary>
    public string TestJwtToken { get; private set; } = string.Empty;

    /// <summary>
    /// Test user ID.
    /// </summary>
    public string TestUserId { get; private set; } = "test-user-id";

    /// <summary>
    /// FakeTimeProvider for testing time-dependent behavior.
    /// Use Advance() to move time forward in tests.
    /// </summary>
    public FakeTimeProvider FakeTimeProvider { get; } = new(DateTimeOffset.UtcNow);

    public async Task InitializeAsync()
    {
        // Check if we're in CI mode with a pre-configured database
        _ciConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

        if (_ciConnectionString != null)
        {
            // CI mode: Use the pre-configured PostgreSQL service
            // Wait for database to be ready
            await WaitForDatabaseAsync(_ciConnectionString);
        }
        else
        {
            // Local development: Use Testcontainers
            _container = new PostgreSqlBuilder()
                .WithImage("pgvector/pgvector:pg18")
                .WithDatabase("secondbrain_integration_test")
                .WithUsername("testuser")
                .WithPassword("testpassword")
                .Build();

            await _container.StartAsync();
        }
    }

    private static async Task WaitForDatabaseAsync(string connectionString, int maxRetries = 30)
    {
        using var connection = new Npgsql.NpgsqlConnection(connectionString);
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                await connection.OpenAsync();
                return;
            }
            catch
            {
                await Task.Delay(1000);
            }
        }
        throw new InvalidOperationException($"Could not connect to database after {maxRetries} retries");
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        if (_container != null)
        {
            await _container.DisposeAsync();
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // Remove existing DbContext registration
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<ApplicationDbContext>();

            // Add test DbContext
            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseNpgsql(ConnectionString, npgsqlOptions =>
                {
                    npgsqlOptions.UseVector();
                    npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
                });
            });

            // Replace AI provider factory with mock
            services.RemoveAll<IAIProviderFactory>();
            services.AddSingleton<IAIProviderFactory, MockAIProviderFactory>();

            // Replace embedding provider factory with mock
            services.RemoveAll<IEmbeddingProviderFactory>();
            services.AddSingleton<IEmbeddingProviderFactory, MockEmbeddingProviderFactory>();

            // Replace TimeProvider with FakeTimeProvider for testing time-dependent behavior
            // This enables tests to control time (e.g., token expiration, circuit breaker timeouts)
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(FakeTimeProvider);

            // Ensure database is created
            using var scope = services.BuildServiceProvider().CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            dbContext.Database.EnsureCreated();

            // Seed test data
            SeedTestData(dbContext).GetAwaiter().GetResult();
        });
    }

    private async Task SeedTestData(ApplicationDbContext dbContext)
    {
        // Only add if not exists
        if (!await dbContext.Users.AnyAsync(u => u.Id == TestUserId))
        {
            // Create test user with preferences
            var testUser = new SecondBrain.Core.Entities.User
            {
                Id = TestUserId,
                Email = "test@example.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("TestPassword123!"),
                DisplayName = "Test User",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Preferences = new SecondBrain.Core.Entities.UserPreferences
                {
                    Id = Guid.NewGuid().ToString(),
                    UserId = TestUserId,
                    ChatProvider = "openai",
                    ChatModel = "gpt-4o-mini",
                    VectorStoreProvider = "PostgreSQL",
                    DefaultNoteView = "list",
                    ItemsPerPage = 20,
                    FontSize = "medium",
                    EnableNotifications = true,
                    RagEnableHyde = true,
                    RagEnableQueryExpansion = true,
                    RagEnableHybridSearch = true,
                    RagEnableReranking = true,
                    RagEnableAnalytics = true
                }
            };

            dbContext.Users.Add(testUser);
            await dbContext.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Creates an HTTP client with authentication header set.
    /// </summary>
    public HttpClient CreateAuthenticatedClient()
    {
        var client = CreateClient();

        // Generate a test JWT token
        using var scope = Services.CreateScope();
        var jwtService = scope.ServiceProvider.GetRequiredService<SecondBrain.Application.Services.Auth.IJwtService>();

        // Create a test user entity for token generation
        var testUser = new SecondBrain.Core.Entities.User
        {
            Id = TestUserId,
            Email = "test@example.com",
            DisplayName = "Test User"
        };
        TestJwtToken = jwtService.GenerateToken(testUser);

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", TestJwtToken);

        return client;
    }

    /// <summary>
    /// Resets the database to a clean state.
    /// </summary>
    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // Clear all tables except users
        dbContext.Notes.RemoveRange(dbContext.Notes);
        dbContext.ChatConversations.RemoveRange(dbContext.ChatConversations);
        await dbContext.SaveChangesAsync();
    }
}

/// <summary>
/// Collection definition for sharing the WebApplicationFactory across tests.
/// </summary>
[CollectionDefinition("WebApplication")]
public class WebApplicationCollection : ICollectionFixture<WebApplicationFactoryFixture>
{
}
