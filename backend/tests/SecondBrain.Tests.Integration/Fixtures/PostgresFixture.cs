using Microsoft.EntityFrameworkCore;
using SecondBrain.Infrastructure.Data;
using Testcontainers.PostgreSql;

namespace SecondBrain.Tests.Integration.Fixtures;

/// <summary>
/// Fixture that provides a PostgreSQL container for integration tests
/// </summary>
public class PostgresFixture : IAsyncLifetime
{
    private PostgreSqlContainer _container = null!;
    
    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        // Use pgvector/pgvector:pg16 image to have pgvector extension available
        _container = new PostgreSqlBuilder()
            .WithImage("pgvector/pgvector:pg16")
            .WithDatabase("secondbrain_test")
            .WithUsername("testuser")
            .WithPassword("testpassword")
            .Build();

        await _container.StartAsync();

        // Initialize the database schema
        await using var dbContext = CreateDbContext();
        await dbContext.Database.EnsureCreatedAsync();
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
}

/// <summary>
/// Collection definition for sharing the PostgreSQL container across tests
/// </summary>
[CollectionDefinition("PostgreSQL")]
public class PostgresCollection : ICollectionFixture<PostgresFixture>
{
}

