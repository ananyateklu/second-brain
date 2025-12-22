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

    // Static semaphore to serialize database initialization across concurrent test instances in CI
    private static readonly SemaphoreSlim _initializationLock = new(1, 1);
    private static bool _databaseInitialized;

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

            // Use a lock to serialize database initialization in CI where multiple test instances
            // may run concurrently against the same shared database
            _initializationLock.Wait();
            try
            {
                // Skip if already initialized by another test instance
                if (!_databaseInitialized || _ciConnectionString == null)
                {
                    using var scope = services.BuildServiceProvider().CreateScope();
                    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                    // EnsureCreated can fail if tables/types already exist from concurrent initialization.
                    // In CI, extensions may be pre-created by the workflow, but EF Core still tries to
                    // create them via AlterDatabase annotations, causing race conditions on type creation.
                    try
                    {
                        dbContext.Database.EnsureCreated();
                    }
                    catch (Npgsql.PostgresException ex) when (IsExpectedConcurrencyException(ex))
                    {
                        // Expected in CI when concurrent test instances race on database initialization.
                        // The schema already exists from another test instance or the CI setup - safe to continue.
                    }

                    // Apply versioning stored procedures (not created by EF Core)
                    ApplyVersioningSchema(dbContext).GetAwaiter().GetResult();

                    // Seed test data
                    SeedTestData(dbContext).GetAwaiter().GetResult();

                    _databaseInitialized = true;
                }
            }
            finally
            {
                _initializationLock.Release();
            }
        });
    }

    /// <summary>
    /// Applies versioning stored procedures that are not created by EF Core migrations.
    /// This includes the note version functions required for temporal versioning.
    /// </summary>
    private async Task ApplyVersioningSchema(ApplicationDbContext dbContext)
    {
        // In CI, multiple test instances may run concurrently against the same database.
        // We need to handle race conditions where multiple instances try to create
        // extensions/columns simultaneously. PostgreSQL error 23505 (unique_violation)
        // indicates the object already exists - we can safely ignore this.

        // Ensure btree_gist extension exists for temporal features
        // Wrap in try-catch to handle CI race conditions
        try
        {
            await dbContext.Database.ExecuteSqlRawAsync(@"
                CREATE EXTENSION IF NOT EXISTS btree_gist;
            ");
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
        {
            // Extension already exists (race condition in CI) - ignore
        }

        // Add columns if not exist - these are idempotent
        try
        {
            await dbContext.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE note_versions
                ADD COLUMN IF NOT EXISTS content_json JSONB DEFAULT NULL;
            ");
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42701")
        {
            // Column already exists - ignore
        }

        try
        {
            await dbContext.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE note_versions
                ADD COLUMN IF NOT EXISTS content_format INTEGER DEFAULT 0;
            ");
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42701")
        {
            // Column already exists - ignore
        }

        try
        {
            await dbContext.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE note_versions
                ADD COLUMN IF NOT EXISTS image_ids TEXT[] DEFAULT ARRAY[]::TEXT[];
            ");
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42701")
        {
            // Column already exists - ignore
        }

        // Create/replace the versioning function with all 12 parameters
        // Even CREATE OR REPLACE can fail with 23505 in concurrent environments
        try
        {
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
                    p_source VARCHAR(50) DEFAULT 'web',
                    p_content_json JSONB DEFAULT NULL,
                    p_content_format INTEGER DEFAULT 0,
                    p_image_ids TEXT[] DEFAULT ARRAY[]::TEXT[]
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
                        content_json,
                        content_format,
                        tags,
                        is_archived,
                        folder,
                        modified_by,
                        version_number,
                        change_summary,
                        source,
                        image_ids,
                        created_at
                    ) VALUES (
                        gen_random_uuid()::text,
                        p_note_id,
                        tstzrange(v_now, NULL, '[)'),
                        p_title,
                        p_content,
                        p_content_json,
                        p_content_format,
                        p_tags,
                        p_is_archived,
                        p_folder,
                        p_modified_by,
                        v_new_version_number,
                        p_change_summary,
                        p_source,
                        p_image_ids,
                        v_now
                    );

                    RETURN v_new_version_number;
                END;
                $$ LANGUAGE plpgsql;
            ");
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505" || ex.SqlState == "42723")
        {
            // 23505: unique_violation (function already exists from concurrent creation)
            // 42723: duplicate_function
            // Function already exists - ignore
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
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
        {
            // 23505: unique_violation - user already exists from another concurrent test
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

    /// <summary>
    /// Determines if a PostgresException is an expected concurrency-related error
    /// that can be safely ignored during parallel test initialization.
    /// </summary>
    /// <param name="ex">The PostgreSQL exception to check.</param>
    /// <returns>True if the exception is expected and can be ignored.</returns>
    private static bool IsExpectedConcurrencyException(Npgsql.PostgresException ex)
    {
        // PostgreSQL error codes that indicate concurrent schema creation race conditions:
        // - 23505: unique_violation - type/constraint already exists (pg_type_typname_nsp_index)
        // - 42P07: duplicate_table - table already exists
        // - 42710: duplicate_object - extension/type/function already exists
        // - 42P16: invalid_table_definition - can occur during concurrent ALTER TABLE
        //
        // Also check the constraint name for type-specific race conditions
        var expectedCodes = new[] { "23505", "42P07", "42710", "42P16" };

        if (expectedCodes.Contains(ex.SqlState))
        {
            return true;
        }

        // Check for specific constraint violations related to type creation
        // The pg_type_typname_nsp_index constraint is violated when creating types concurrently
        if (ex.ConstraintName?.Contains("pg_type", StringComparison.OrdinalIgnoreCase) == true)
        {
            return true;
        }

        // Check message for extension-related errors
        if (ex.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase) &&
            (ex.Message.Contains("extension", StringComparison.OrdinalIgnoreCase) ||
             ex.Message.Contains("type", StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        return false;
    }
}

/// <summary>
/// Collection definition for sharing the WebApplicationFactory across tests.
/// </summary>
[CollectionDefinition("WebApplication")]
public class WebApplicationCollection : ICollectionFixture<WebApplicationFactoryFixture>
{
}
