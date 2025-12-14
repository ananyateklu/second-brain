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

            // Apply versioning stored procedures (not created by EF Core)
            ApplyVersioningSchema(dbContext).GetAwaiter().GetResult();

            // Seed test data
            SeedTestData(dbContext).GetAwaiter().GetResult();
        });
    }

    /// <summary>
    /// Applies versioning stored procedures that are not created by EF Core migrations.
    /// This includes the note version functions required for temporal versioning.
    /// </summary>
    private async Task ApplyVersioningSchema(ApplicationDbContext dbContext)
    {
        try
        {
            // Always create/replace the versioning function
            await dbContext.Database.ExecuteSqlRawAsync(@"
                CREATE OR REPLACE FUNCTION create_note_version(
                    p_note_id TEXT,
                    p_title VARCHAR(500),
                    p_content TEXT,
                    p_tags TEXT[],
                    p_is_archived BOOLEAN,
                    p_folder VARCHAR(256),
                    p_modified_by VARCHAR(128),
                    p_change_summary VARCHAR(500) DEFAULT NULL,
                    p_source VARCHAR(50) DEFAULT 'web'
                )
                RETURNS INT AS $$
                DECLARE
                    v_new_version_number INT;
                    v_now TIMESTAMP WITH TIME ZONE := NOW();
                BEGIN
                    -- Get the next version number
                    SELECT COALESCE(MAX(version_number), 0) + 1
                    INTO v_new_version_number
                    FROM note_versions
                    WHERE note_id = p_note_id;

                    -- Close the current version (set end time)
                    UPDATE note_versions
                    SET valid_period = tstzrange(lower(valid_period), v_now, '[)')
                    WHERE note_id = p_note_id
                      AND upper_inf(valid_period);

                    -- Insert the new version
                    INSERT INTO note_versions (
                        id,
                        note_id,
                        valid_period,
                        title,
                        content,
                        tags,
                        is_archived,
                        folder,
                        modified_by,
                        version_number,
                        change_summary,
                        source,
                        created_at
                    ) VALUES (
                        gen_random_uuid()::text,
                        p_note_id,
                        tstzrange(v_now, NULL, '[)'),
                        p_title,
                        p_content,
                        p_tags,
                        p_is_archived,
                        p_folder,
                        p_modified_by,
                        v_new_version_number,
                        p_change_summary,
                        p_source,
                        v_now
                    );

                    RETURN v_new_version_number;
                END;
                $$ LANGUAGE plpgsql;
            ");

            // Also ensure the note_versions table has proper exclusion constraint
            // (EF Core may not create the GIST index properly)
            await dbContext.Database.ExecuteSqlRawAsync(@"
                CREATE EXTENSION IF NOT EXISTS btree_gist;
            ");
        }
        catch (Exception ex)
        {
            // Log the error - this is critical for versioning to work
            Console.WriteLine($"WARNING: Version schema setup failed: {ex.Message}");
            throw; // Re-throw to fail fast if versioning isn't properly set up
        }
    }

    private async Task SeedTestData(ApplicationDbContext dbContext)
    {
        try
        {
            // Only add if not exists - use raw SQL for atomicity in CI
            var existingUser = await dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == TestUserId);

            if (existingUser == null)
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
        catch (DbUpdateException)
        {
            // Race condition: another test instance already seeded the data
            // This is expected in CI when tests run in parallel
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

        // Clear note versions first (FK constraint)
        dbContext.NoteVersions.RemoveRange(dbContext.NoteVersions);
        // Clear notes
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
