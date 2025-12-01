using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Tests.Unit.Infrastructure.Repositories;

/// <summary>
/// Test DbContext for NoteEmbedding repository testing
/// Excludes pgvector-specific properties that aren't compatible with InMemory provider
/// </summary>
public class NoteEmbeddingTestDbContext : DbContext
{
    public NoteEmbeddingTestDbContext(DbContextOptions<NoteEmbeddingTestDbContext> options)
        : base(options)
    {
    }

    public DbSet<NoteEmbedding> NoteEmbeddings { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Ignore pgvector Vector type for InMemory testing
        modelBuilder.Entity<NoteEmbedding>()
            .Ignore(e => e.Embedding);

        // Ignore PostgreSQL-specific types that aren't compatible with InMemory provider
        modelBuilder.Entity<NoteEmbedding>()
            .Ignore(e => e.SearchVector);

        // Configure NoteTags as a simple property (InMemory doesn't support PostgreSQL array types)
        modelBuilder.Entity<NoteEmbedding>()
            .Property(e => e.NoteTags)
            .HasConversion(
                v => string.Join(",", v),
                v => v.Split(",", StringSplitOptions.RemoveEmptyEntries).ToList());
    }
}

/// <summary>
/// Test-specific implementation of INoteEmbeddingRepository using InMemory database
/// </summary>
public class TestNoteEmbeddingRepository : INoteEmbeddingRepository
{
    private readonly NoteEmbeddingTestDbContext _context;
    private readonly ILogger<TestNoteEmbeddingRepository> _logger;

    public TestNoteEmbeddingRepository(NoteEmbeddingTestDbContext context, ILogger<TestNoteEmbeddingRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<NoteEmbedding> CreateAsync(NoteEmbedding embedding)
    {
        try
        {
            _logger.LogDebug("Creating note embedding. NoteId: {NoteId}, ChunkIndex: {ChunkIndex}", embedding.NoteId, embedding.ChunkIndex);

            if (string.IsNullOrEmpty(embedding.Id))
            {
                embedding.Id = Guid.NewGuid().ToString();
            }

            embedding.CreatedAt = DateTime.UtcNow;

            _context.NoteEmbeddings.Add(embedding);
            await _context.SaveChangesAsync();

            return embedding;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating note embedding. NoteId: {NoteId}", embedding.NoteId);
            throw new RepositoryException("Failed to create note embedding", ex);
        }
    }

    public async Task<IEnumerable<NoteEmbedding>> CreateBatchAsync(IEnumerable<NoteEmbedding> embeddings)
    {
        try
        {
            var embeddingsList = embeddings.ToList();
            _logger.LogDebug("Creating batch of note embeddings. Count: {Count}", embeddingsList.Count);

            var now = DateTime.UtcNow;
            foreach (var embedding in embeddingsList)
            {
                if (string.IsNullOrEmpty(embedding.Id))
                {
                    embedding.Id = Guid.NewGuid().ToString();
                }
                embedding.CreatedAt = now;
            }

            _context.NoteEmbeddings.AddRange(embeddingsList);
            await _context.SaveChangesAsync();

            return embeddingsList;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating batch of note embeddings");
            throw new RepositoryException("Failed to create batch of note embeddings", ex);
        }
    }

    public async Task<NoteEmbedding?> GetByIdAsync(string id)
    {
        try
        {
            _logger.LogDebug("Retrieving note embedding. EmbeddingId: {EmbeddingId}", id);
            var embedding = await _context.NoteEmbeddings.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);

            if (embedding == null)
            {
                _logger.LogDebug("Note embedding not found. EmbeddingId: {EmbeddingId}", id);
            }

            return embedding;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving note embedding. EmbeddingId: {EmbeddingId}", id);
            throw new RepositoryException($"Failed to retrieve note embedding with ID '{id}'", ex);
        }
    }

    public async Task<IEnumerable<NoteEmbedding>> GetByNoteIdAsync(string noteId)
    {
        try
        {
            _logger.LogDebug("Retrieving embeddings for note. NoteId: {NoteId}", noteId);
            var embeddings = await _context.NoteEmbeddings
                .AsNoTracking()
                .Where(e => e.NoteId == noteId)
                .OrderBy(e => e.ChunkIndex)
                .ToListAsync();

            return embeddings;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving embeddings for note. NoteId: {NoteId}", noteId);
            throw new RepositoryException($"Failed to retrieve embeddings for note '{noteId}'", ex);
        }
    }

    public async Task<IEnumerable<NoteEmbedding>> GetByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Retrieving embeddings for user. UserId: {UserId}", userId);
            var embeddings = await _context.NoteEmbeddings
                .AsNoTracking()
                .Where(e => e.UserId == userId)
                .ToListAsync();

            return embeddings;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving embeddings for user. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to retrieve embeddings for user '{userId}'", ex);
        }
    }

    public async Task<bool> DeleteByNoteIdAsync(string noteId)
    {
        try
        {
            _logger.LogDebug("Deleting embeddings for note. NoteId: {NoteId}", noteId);
            var embeddings = await _context.NoteEmbeddings
                .Where(e => e.NoteId == noteId)
                .ToListAsync();

            if (embeddings.Count == 0)
            {
                _logger.LogDebug("No embeddings found for note. NoteId: {NoteId}", noteId);
                return true;
            }

            _context.NoteEmbeddings.RemoveRange(embeddings);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting embeddings for note. NoteId: {NoteId}", noteId);
            throw new RepositoryException($"Failed to delete embeddings for note '{noteId}'", ex);
        }
    }

    public async Task<bool> DeleteByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Deleting embeddings for user. UserId: {UserId}", userId);
            var embeddings = await _context.NoteEmbeddings
                .Where(e => e.UserId == userId)
                .ToListAsync();

            if (embeddings.Count == 0)
            {
                _logger.LogDebug("No embeddings found for user. UserId: {UserId}", userId);
                return true;
            }

            _context.NoteEmbeddings.RemoveRange(embeddings);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting embeddings for user. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to delete embeddings for user '{userId}'", ex);
        }
    }

    public async Task<int> CountByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Counting embeddings for user. UserId: {UserId}", userId);
            var count = await _context.NoteEmbeddings
                .Where(e => e.UserId == userId)
                .CountAsync();

            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error counting embeddings for user. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to count embeddings for user '{userId}'", ex);
        }
    }
}

public class SqlNoteEmbeddingRepositoryInMemoryTests : IDisposable
{
    private readonly NoteEmbeddingTestDbContext _context;
    private readonly INoteEmbeddingRepository _sut;
    private readonly Mock<ILogger<TestNoteEmbeddingRepository>> _mockLogger;

    public SqlNoteEmbeddingRepositoryInMemoryTests()
    {
        var options = new DbContextOptionsBuilder<NoteEmbeddingTestDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .EnableSensitiveDataLogging()
            .Options;

        _context = new NoteEmbeddingTestDbContext(options);
        _context.Database.EnsureCreated();

        _mockLogger = new Mock<ILogger<TestNoteEmbeddingRepository>>();
        _sut = new TestNoteEmbeddingRepository(_context, _mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WithValidEmbedding_CreatesAndReturnsEmbedding()
    {
        // Arrange
        var embedding = new NoteEmbedding
        {
            NoteId = "note-1",
            UserId = "user-1",
            Content = "Test content",
            ChunkIndex = 0,
            EmbeddingProvider = "openai",
            EmbeddingModel = "text-embedding-3-small"
        };

        // Act
        var result = await _sut.CreateAsync(embedding);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.NoteId.Should().Be("note-1");
        result.Content.Should().Be("Test content");
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        // Verify persisted
        var persisted = await _context.NoteEmbeddings.FindAsync(result.Id);
        persisted.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateAsync_WithExistingId_UsesProvidedId()
    {
        // Arrange
        var embedding = new NoteEmbedding
        {
            Id = "custom-embedding-id",
            NoteId = "note-1",
            UserId = "user-1",
            Content = "Test content",
            ChunkIndex = 0,
            EmbeddingProvider = "openai",
            EmbeddingModel = "text-embedding-3-small"
        };

        // Act
        var result = await _sut.CreateAsync(embedding);

        // Assert
        result.Id.Should().Be("custom-embedding-id");
    }

    [Fact]
    public async Task CreateAsync_SetsCreatedAtTimestamp()
    {
        // Arrange
        var beforeCreate = DateTime.UtcNow;
        var embedding = CreateTestEmbedding("", "note-1", "user-1");

        // Act
        var result = await _sut.CreateAsync(embedding);

        // Assert
        result.CreatedAt.Should().BeOnOrAfter(beforeCreate);
    }

    #endregion

    #region CreateBatchAsync Tests

    [Fact]
    public async Task CreateBatchAsync_WithMultipleEmbeddings_CreatesAll()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("", "note-1", "user-1", 0),
            CreateTestEmbedding("", "note-1", "user-1", 1),
            CreateTestEmbedding("", "note-1", "user-1", 2)
        };

        // Act
        var result = (await _sut.CreateBatchAsync(embeddings)).ToList();

        // Assert
        result.Should().HaveCount(3);
        result.Should().OnlyContain(e => !string.IsNullOrEmpty(e.Id));

        // Verify persisted
        var persisted = await _context.NoteEmbeddings.CountAsync();
        persisted.Should().Be(3);
    }

    [Fact]
    public async Task CreateBatchAsync_SetsIdsForAllEmbeddings()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("", "note-1", "user-1", 0),
            CreateTestEmbedding("", "note-2", "user-1", 0)
        };

        // Act
        var result = (await _sut.CreateBatchAsync(embeddings)).ToList();

        // Assert
        result[0].Id.Should().NotBeNullOrEmpty();
        result[1].Id.Should().NotBeNullOrEmpty();
        result[0].Id.Should().NotBe(result[1].Id);
    }

    [Fact]
    public async Task CreateBatchAsync_SetsCreatedAtForAllEmbeddings()
    {
        // Arrange
        var beforeCreate = DateTime.UtcNow;
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("", "note-1", "user-1", 0),
            CreateTestEmbedding("", "note-1", "user-1", 1)
        };

        // Act
        var result = (await _sut.CreateBatchAsync(embeddings)).ToList();

        // Assert
        result.Should().OnlyContain(e => e.CreatedAt >= beforeCreate);
    }

    [Fact]
    public async Task CreateBatchAsync_WithEmptyList_ReturnsEmptyList()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>();

        // Act
        var result = await _sut.CreateBatchAsync(embeddings);

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenEmbeddingExists_ReturnsEmbedding()
    {
        // Arrange
        var embedding = CreateTestEmbedding("emb-1", "note-1", "user-1");
        await _context.NoteEmbeddings.AddAsync(embedding);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByIdAsync("emb-1");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("emb-1");
        result.NoteId.Should().Be("note-1");
    }

    [Fact]
    public async Task GetByIdAsync_WhenEmbeddingDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByIdAsync("non-existent");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsAllProperties()
    {
        // Arrange
        var embedding = CreateTestEmbedding("emb-1", "note-1", "user-1");
        embedding.NoteTitle = "Test Note";
        embedding.NoteTags = new List<string> { "tag1", "tag2" };
        embedding.EmbeddingProvider = "openai";
        embedding.EmbeddingModel = "text-embedding-3-small";
        await _context.NoteEmbeddings.AddAsync(embedding);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByIdAsync("emb-1");

        // Assert
        result.Should().NotBeNull();
        result!.NoteTitle.Should().Be("Test Note");
        result.NoteTags.Should().BeEquivalentTo(new[] { "tag1", "tag2" });
        result.EmbeddingProvider.Should().Be("openai");
        result.EmbeddingModel.Should().Be("text-embedding-3-small");
    }

    #endregion

    #region GetByNoteIdAsync Tests

    [Fact]
    public async Task GetByNoteIdAsync_ReturnsAllEmbeddingsForNote()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-1", 0),
            CreateTestEmbedding("emb-2", "note-1", "user-1", 1),
            CreateTestEmbedding("emb-3", "note-2", "user-1", 0) // Different note
        };
        await _context.NoteEmbeddings.AddRangeAsync(embeddings);
        await _context.SaveChangesAsync();

        // Act
        var result = (await _sut.GetByNoteIdAsync("note-1")).ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(e => e.NoteId == "note-1");
    }

    [Fact]
    public async Task GetByNoteIdAsync_ReturnsOrderedByChunkIndex()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-2", "note-1", "user-1", 2),
            CreateTestEmbedding("emb-1", "note-1", "user-1", 0),
            CreateTestEmbedding("emb-3", "note-1", "user-1", 1)
        };
        await _context.NoteEmbeddings.AddRangeAsync(embeddings);
        await _context.SaveChangesAsync();

        // Act
        var result = (await _sut.GetByNoteIdAsync("note-1")).ToList();

        // Assert
        result.Should().HaveCount(3);
        result[0].ChunkIndex.Should().Be(0);
        result[1].ChunkIndex.Should().Be(1);
        result[2].ChunkIndex.Should().Be(2);
    }

    [Fact]
    public async Task GetByNoteIdAsync_WhenNoEmbeddings_ReturnsEmptyList()
    {
        // Act
        var result = await _sut.GetByNoteIdAsync("non-existent-note");

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region GetByUserIdAsync Tests

    [Fact]
    public async Task GetByUserIdAsync_ReturnsAllEmbeddingsForUser()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-1", 0),
            CreateTestEmbedding("emb-2", "note-2", "user-1", 0),
            CreateTestEmbedding("emb-3", "note-3", "user-2", 0) // Different user
        };
        await _context.NoteEmbeddings.AddRangeAsync(embeddings);
        await _context.SaveChangesAsync();

        // Act
        var result = (await _sut.GetByUserIdAsync("user-1")).ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(e => e.UserId == "user-1");
    }

    [Fact]
    public async Task GetByUserIdAsync_WhenNoEmbeddings_ReturnsEmptyList()
    {
        // Act
        var result = await _sut.GetByUserIdAsync("non-existent-user");

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region DeleteByNoteIdAsync Tests

    [Fact]
    public async Task DeleteByNoteIdAsync_WhenEmbeddingsExist_DeletesAndReturnsTrue()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-1", 0),
            CreateTestEmbedding("emb-2", "note-1", "user-1", 1),
            CreateTestEmbedding("emb-3", "note-2", "user-1", 0) // Different note, should not be deleted
        };
        await _context.NoteEmbeddings.AddRangeAsync(embeddings);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        var result = await _sut.DeleteByNoteIdAsync("note-1");

        // Assert
        result.Should().BeTrue();
        var remaining = await _context.NoteEmbeddings.CountAsync();
        remaining.Should().Be(1);
        var remainingEmbedding = await _context.NoteEmbeddings.FirstAsync();
        remainingEmbedding.NoteId.Should().Be("note-2");
    }

    [Fact]
    public async Task DeleteByNoteIdAsync_WhenNoEmbeddings_ReturnsTrue()
    {
        // Act
        var result = await _sut.DeleteByNoteIdAsync("non-existent-note");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteByNoteIdAsync_DeletesAllChunks()
    {
        // Arrange - Note with multiple chunks
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-1", 0),
            CreateTestEmbedding("emb-2", "note-1", "user-1", 1),
            CreateTestEmbedding("emb-3", "note-1", "user-1", 2),
            CreateTestEmbedding("emb-4", "note-1", "user-1", 3)
        };
        await _context.NoteEmbeddings.AddRangeAsync(embeddings);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        var result = await _sut.DeleteByNoteIdAsync("note-1");

        // Assert
        result.Should().BeTrue();
        var remaining = await _context.NoteEmbeddings.CountAsync();
        remaining.Should().Be(0);
    }

    #endregion

    #region DeleteByUserIdAsync Tests

    [Fact]
    public async Task DeleteByUserIdAsync_WhenEmbeddingsExist_DeletesAndReturnsTrue()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-1", 0),
            CreateTestEmbedding("emb-2", "note-2", "user-1", 0),
            CreateTestEmbedding("emb-3", "note-3", "user-2", 0) // Different user
        };
        await _context.NoteEmbeddings.AddRangeAsync(embeddings);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        var result = await _sut.DeleteByUserIdAsync("user-1");

        // Assert
        result.Should().BeTrue();
        var remaining = await _context.NoteEmbeddings.CountAsync();
        remaining.Should().Be(1);
        var remainingEmbedding = await _context.NoteEmbeddings.FirstAsync();
        remainingEmbedding.UserId.Should().Be("user-2");
    }

    [Fact]
    public async Task DeleteByUserIdAsync_WhenNoEmbeddings_ReturnsTrue()
    {
        // Act
        var result = await _sut.DeleteByUserIdAsync("non-existent-user");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteByUserIdAsync_DeletesAllUserEmbeddings()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>();
        for (int i = 0; i < 10; i++)
        {
            embeddings.Add(CreateTestEmbedding($"emb-{i}", $"note-{i % 3}", "user-1", i % 2));
        }
        await _context.NoteEmbeddings.AddRangeAsync(embeddings);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        var result = await _sut.DeleteByUserIdAsync("user-1");

        // Assert
        result.Should().BeTrue();
        var remaining = await _context.NoteEmbeddings.CountAsync();
        remaining.Should().Be(0);
    }

    #endregion

    #region CountByUserIdAsync Tests

    [Fact]
    public async Task CountByUserIdAsync_ReturnsCorrectCount()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-1", 0),
            CreateTestEmbedding("emb-2", "note-1", "user-1", 1),
            CreateTestEmbedding("emb-3", "note-2", "user-1", 0),
            CreateTestEmbedding("emb-4", "note-3", "user-2", 0) // Different user
        };
        await _context.NoteEmbeddings.AddRangeAsync(embeddings);
        await _context.SaveChangesAsync();

        // Act
        var count = await _sut.CountByUserIdAsync("user-1");

        // Assert
        count.Should().Be(3);
    }

    [Fact]
    public async Task CountByUserIdAsync_WhenNoEmbeddings_ReturnsZero()
    {
        // Act
        var count = await _sut.CountByUserIdAsync("non-existent-user");

        // Assert
        count.Should().Be(0);
    }

    [Fact]
    public async Task CountByUserIdAsync_CountsCorrectlyWithManyEmbeddings()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>();
        for (int i = 0; i < 100; i++)
        {
            embeddings.Add(CreateTestEmbedding($"emb-{i}", $"note-{i % 10}", "user-1", i % 5));
        }
        for (int i = 0; i < 50; i++)
        {
            embeddings.Add(CreateTestEmbedding($"emb-user2-{i}", $"note-{i % 5}", "user-2", i % 3));
        }
        await _context.NoteEmbeddings.AddRangeAsync(embeddings);
        await _context.SaveChangesAsync();

        // Act
        var user1Count = await _sut.CountByUserIdAsync("user-1");
        var user2Count = await _sut.CountByUserIdAsync("user-2");

        // Assert
        user1Count.Should().Be(100);
        user2Count.Should().Be(50);
    }

    #endregion

    #region Helper Methods

    private static NoteEmbedding CreateTestEmbedding(string id, string noteId, string userId, int chunkIndex = 0)
    {
        return new NoteEmbedding
        {
            Id = id,
            NoteId = noteId,
            UserId = userId,
            Content = $"Test content for chunk {chunkIndex}",
            ChunkIndex = chunkIndex,
            NoteTitle = "Test Note",
            NoteTags = new List<string> { "test" },
            EmbeddingProvider = "openai",
            EmbeddingModel = "text-embedding-3-small",
            CreatedAt = DateTime.UtcNow
        };
    }

    #endregion
}

