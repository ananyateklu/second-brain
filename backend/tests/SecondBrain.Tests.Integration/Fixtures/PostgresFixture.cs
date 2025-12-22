using Microsoft.EntityFrameworkCore;
using SecondBrain.Infrastructure.Data;
using Testcontainers.PostgreSql;

namespace SecondBrain.Tests.Integration.Fixtures;

/// <summary>
/// Fixture that provides a PostgreSQL container for integration tests.
/// Each test collection gets its own isolated container instance.
/// </summary>
public class PostgresFixture : IAsyncLifetime
{
    private PostgreSqlContainer _container = null!;

    // Static lock to serialize database initialization across concurrent fixture instances
    // This prevents race conditions when multiple test instances try to create extensions/types
    private static readonly SemaphoreSlim _initializationLock = new(1, 1);

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        // Use pgvector/pgvector:pg18 image for PostgreSQL 18 features
        // Required for: uuidv7(), JSON_TABLE, and other PG18 features
        _container = new PostgreSqlBuilder()
            .WithImage("pgvector/pgvector:pg18")
            .WithDatabase("secondbrain_test")
            .WithUsername("testuser")
            .WithPassword("testpassword")
            .Build();

        await _container.StartAsync();

        // Initialize the database schema with concurrency protection
        // Even with separate containers, test parallelism can cause issues
        await _initializationLock.WaitAsync();
        try
        {
            await using var dbContext = CreateDbContext();

            // EnsureCreated can fail if extensions/types race on creation.
            // This is rare with isolated containers but can happen with test parallelism.
            try
            {
                await dbContext.Database.EnsureCreatedAsync();
            }
            catch (Npgsql.PostgresException ex) when (IsExpectedConcurrencyException(ex))
            {
                // Expected during concurrent initialization - schema already exists
            }
        }
        finally
        {
            _initializationLock.Release();
        }
    }

    public async Task DisposeAsync()
    {
        await _container.DisposeAsync();
    }

    public ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(ConnectionString, npgsqlOptions =>
            {
                npgsqlOptions.UseVector();
            })
            .Options;

        return new ApplicationDbContext(options);
    }

    /// <summary>
    /// Determines if a PostgresException is an expected concurrency-related error
    /// that can be safely ignored during parallel test initialization.
    /// </summary>
    private static bool IsExpectedConcurrencyException(Npgsql.PostgresException ex)
    {
        // PostgreSQL error codes for concurrent schema creation race conditions:
        // - 23505: unique_violation (pg_type_typname_nsp_index for types)
        // - 42P07: duplicate_table
        // - 42710: duplicate_object (extension/type/function)
        // - 42P16: invalid_table_definition
        var expectedCodes = new[] { "23505", "42P07", "42710", "42P16" };

        if (expectedCodes.Contains(ex.SqlState))
        {
            return true;
        }

        // Check for type-specific constraint violations
        if (ex.ConstraintName?.Contains("pg_type", StringComparison.OrdinalIgnoreCase) == true)
        {
            return true;
        }

        // Check message for "already exists" errors
        if (ex.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }
}

/// <summary>
/// Collection definition for sharing the PostgreSQL container across tests
/// </summary>
[CollectionDefinition("PostgreSQL")]
public class PostgresCollection : ICollectionFixture<PostgresFixture>
{
}

