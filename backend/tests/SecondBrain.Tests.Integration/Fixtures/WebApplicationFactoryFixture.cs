using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Infrastructure.Data;
using Testcontainers.PostgreSql;

namespace SecondBrain.Tests.Integration.Fixtures;

/// <summary>
/// Custom WebApplicationFactory for integration testing.
/// Configures test database and mocks external services.
/// </summary>
public class WebApplicationFactoryFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private PostgreSqlContainer _container = null!;

    /// <summary>
    /// The connection string to the test database.
    /// </summary>
    public string ConnectionString => _container.GetConnectionString();

    /// <summary>
    /// JWT token for authenticated requests in tests.
    /// </summary>
    public string TestJwtToken { get; private set; } = string.Empty;

    /// <summary>
    /// Test user ID.
    /// </summary>
    public string TestUserId { get; private set; } = "test-user-id";

    public async Task InitializeAsync()
    {
        // Start PostgreSQL container with pgvector
        _container = new PostgreSqlBuilder()
            .WithImage("pgvector/pgvector:pg16")
            .WithDatabase("secondbrain_integration_test")
            .WithUsername("testuser")
            .WithPassword("testpassword")
            .Build();

        await _container.StartAsync();
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _container.DisposeAsync();
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
        // Create test user
        var testUser = new SecondBrain.Core.Entities.User
        {
            Id = TestUserId,
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("TestPassword123!"),
            DisplayName = "Test User",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Only add if not exists
        if (!await dbContext.Users.AnyAsync(u => u.Id == TestUserId))
        {
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
        var jwtService = scope.ServiceProvider.GetRequiredService<SecondBrain.API.Services.IJwtService>();

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
