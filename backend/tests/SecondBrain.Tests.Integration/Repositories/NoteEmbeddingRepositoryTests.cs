using Microsoft.Extensions.Logging;
using Pgvector;
using SecondBrain.Core.Entities;
using SecondBrain.Infrastructure.Repositories;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.Repositories;

[Collection("PostgreSQL")]
public class NoteEmbeddingRepositoryTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly Mock<ILogger<SqlNoteEmbeddingRepository>> _mockLogger;
    private SqlNoteEmbeddingRepository _sut = null!;

    public NoteEmbeddingRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
        _mockLogger = new Mock<ILogger<SqlNoteEmbeddingRepository>>();
    }

    public async Task InitializeAsync()
    {
        // Clean up embeddings before each test
        await using var dbContext = _fixture.CreateDbContext();
        dbContext.NoteEmbeddings.RemoveRange(dbContext.NoteEmbeddings);
        await dbContext.SaveChangesAsync();

        // Create a fresh repository for each test
        _sut = new SqlNoteEmbeddingRepository(_fixture.CreateDbContext(), _mockLogger.Object);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WhenValidEmbedding_CreatesAndReturnsEmbedding()
    {
        // Arrange
        var embedding = CreateTestEmbedding("emb-1", "note-1", "user-123", 0);

        // Act
        var created = await _sut.CreateAsync(embedding);

        // Assert
        created.Should().NotBeNull();
        created.Id.Should().Be("emb-1");
        created.NoteId.Should().Be("note-1");
        created.UserId.Should().Be("user-123");
        created.ChunkIndex.Should().Be(0);
        created.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CreateAsync_WhenNoId_GeneratesId()
    {
        // Arrange
        var embedding = CreateTestEmbedding("", "note-1", "user-123", 0);
        embedding.Id = "";

        // Act
        var created = await _sut.CreateAsync(embedding);

        // Assert
        created.Id.Should().NotBeNullOrEmpty();
        Guid.TryParse(created.Id, out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateAsync_SetsTimestamp()
    {
        // Arrange
        var embedding = CreateTestEmbedding("emb-1", "note-1", "user-123", 0);
        embedding.CreatedAt = default;
        var beforeCreate = DateTime.UtcNow;

        // Act
        var created = await _sut.CreateAsync(embedding);
        var afterCreate = DateTime.UtcNow;

        // Assert
        created.CreatedAt.Should().BeOnOrAfter(beforeCreate).And.BeOnOrBefore(afterCreate);
    }

    [Fact]
    public async Task CreateAsync_PersistsAllProperties()
    {
        // Arrange
        var embedding = CreateTestEmbedding("emb-1", "note-1", "user-123", 0);
        embedding.Content = "Test content";
        embedding.EmbeddingProvider = "openai";
        embedding.EmbeddingModel = "text-embedding-ada-002";
        embedding.NoteTitle = "Test Note";
        embedding.NoteTags = new List<string> { "tag1", "tag2" };

        // Act
        await _sut.CreateAsync(embedding);
        var retrieved = await _sut.GetByIdAsync("emb-1");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Content.Should().Be("Test content");
        retrieved.EmbeddingProvider.Should().Be("openai");
        retrieved.EmbeddingModel.Should().Be("text-embedding-ada-002");
        retrieved.NoteTitle.Should().Be("Test Note");
        retrieved.NoteTags.Should().BeEquivalentTo(new[] { "tag1", "tag2" });
    }

    #endregion

    #region CreateBatchAsync Tests

    [Fact]
    public async Task CreateBatchAsync_WhenValidEmbeddings_CreatesAllEmbeddings()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-123", 0),
            CreateTestEmbedding("emb-2", "note-1", "user-123", 1),
            CreateTestEmbedding("emb-3", "note-1", "user-123", 2)
        };

        // Act
        var created = await _sut.CreateBatchAsync(embeddings);

        // Assert
        created.Should().HaveCount(3);
        created.Select(e => e.Id).Should().BeEquivalentTo(new[] { "emb-1", "emb-2", "emb-3" });
    }

    [Fact]
    public async Task CreateBatchAsync_WhenNoIds_GeneratesIds()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("", "note-1", "user-123", 0),
            CreateTestEmbedding("", "note-1", "user-123", 1)
        };
        embeddings[0].Id = "";
        embeddings[1].Id = "";

        // Act
        var created = await _sut.CreateBatchAsync(embeddings);

        // Assert
        created.Should().HaveCount(2);
        created.All(e => !string.IsNullOrEmpty(e.Id)).Should().BeTrue();
        created.All(e => Guid.TryParse(e.Id, out _)).Should().BeTrue();
    }

    [Fact]
    public async Task CreateBatchAsync_SetsTimestamps()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-123", 0),
            CreateTestEmbedding("emb-2", "note-1", "user-123", 1)
        };
        embeddings[0].CreatedAt = default;
        embeddings[1].CreatedAt = default;
        var beforeCreate = DateTime.UtcNow;

        // Act
        var created = await _sut.CreateBatchAsync(embeddings);
        var afterCreate = DateTime.UtcNow;

        // Assert
        created.All(e => e.CreatedAt >= beforeCreate && e.CreatedAt <= afterCreate).Should().BeTrue();
    }

    [Fact]
    public async Task CreateBatchAsync_WhenEmptyList_ReturnsEmptyList()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>();

        // Act
        var created = await _sut.CreateBatchAsync(embeddings);

        // Assert
        created.Should().BeEmpty();
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenEmbeddingExists_ReturnsEmbedding()
    {
        // Arrange
        var embedding = CreateTestEmbedding("emb-1", "note-1", "user-123", 0);
        await _sut.CreateAsync(embedding);

        // Act
        var retrieved = await _sut.GetByIdAsync("emb-1");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Id.Should().Be("emb-1");
        retrieved.NoteId.Should().Be("note-1");
    }

    [Fact]
    public async Task GetByIdAsync_WhenEmbeddingDoesNotExist_ReturnsNull()
    {
        // Act
        var retrieved = await _sut.GetByIdAsync("non-existent");

        // Assert
        retrieved.Should().BeNull();
    }

    #endregion

    #region GetByNoteIdAsync Tests

    [Fact]
    public async Task GetByNoteIdAsync_WhenEmbeddingsExist_ReturnsAllEmbeddingsForNote()
    {
        // Arrange
        var note1Embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-123", 0),
            CreateTestEmbedding("emb-2", "note-1", "user-123", 1),
            CreateTestEmbedding("emb-3", "note-1", "user-123", 2)
        };
        var note2Embedding = CreateTestEmbedding("emb-4", "note-2", "user-123", 0);

        await _sut.CreateBatchAsync(note1Embeddings);
        await _sut.CreateAsync(note2Embedding);

        // Act
        var result = await _sut.GetByNoteIdAsync("note-1");

        // Assert
        result.Should().HaveCount(3);
        result.Select(e => e.Id).Should().BeEquivalentTo(new[] { "emb-1", "emb-2", "emb-3" });
    }

    [Fact]
    public async Task GetByNoteIdAsync_ReturnsEmbeddingsOrderedByChunkIndex()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-3", "note-1", "user-123", 2),
            CreateTestEmbedding("emb-1", "note-1", "user-123", 0),
            CreateTestEmbedding("emb-2", "note-1", "user-123", 1)
        };
        await _sut.CreateBatchAsync(embeddings);

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
        var result = await _sut.GetByNoteIdAsync("non-existent");

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region GetByUserIdAsync Tests

    [Fact]
    public async Task GetByUserIdAsync_WhenEmbeddingsExist_ReturnsAllEmbeddingsForUser()
    {
        // Arrange
        var user1Embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-123", 0),
            CreateTestEmbedding("emb-2", "note-2", "user-123", 0)
        };
        var user2Embedding = CreateTestEmbedding("emb-3", "note-3", "user-456", 0);

        await _sut.CreateBatchAsync(user1Embeddings);
        await _sut.CreateAsync(user2Embedding);

        // Act
        var result = await _sut.GetByUserIdAsync("user-123");

        // Assert
        result.Should().HaveCount(2);
        result.Select(e => e.Id).Should().BeEquivalentTo(new[] { "emb-1", "emb-2" });
    }

    [Fact]
    public async Task GetByUserIdAsync_WhenNoEmbeddings_ReturnsEmptyList()
    {
        // Act
        var result = await _sut.GetByUserIdAsync("user-with-no-embeddings");

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
            CreateTestEmbedding("emb-1", "note-1", "user-123", 0),
            CreateTestEmbedding("emb-2", "note-1", "user-123", 1),
            CreateTestEmbedding("emb-3", "note-2", "user-123", 0)
        };
        await _sut.CreateBatchAsync(embeddings);

        // Act
        var deleted = await _sut.DeleteByNoteIdAsync("note-1");

        // Assert
        deleted.Should().BeTrue();

        var remaining = await _sut.GetByNoteIdAsync("note-1");
        remaining.Should().BeEmpty();

        var otherNoteEmbeddings = await _sut.GetByNoteIdAsync("note-2");
        otherNoteEmbeddings.Should().HaveCount(1);
    }

    [Fact]
    public async Task DeleteByNoteIdAsync_WhenNoEmbeddings_ReturnsTrue()
    {
        // Act
        var deleted = await _sut.DeleteByNoteIdAsync("non-existent");

        // Assert
        deleted.Should().BeTrue();
    }

    #endregion

    #region DeleteByUserIdAsync Tests

    [Fact]
    public async Task DeleteByUserIdAsync_WhenEmbeddingsExist_DeletesAndReturnsTrue()
    {
        // Arrange
        var user1Embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-123", 0),
            CreateTestEmbedding("emb-2", "note-2", "user-123", 0)
        };
        var user2Embedding = CreateTestEmbedding("emb-3", "note-3", "user-456", 0);

        await _sut.CreateBatchAsync(user1Embeddings);
        await _sut.CreateAsync(user2Embedding);

        // Act
        var deleted = await _sut.DeleteByUserIdAsync("user-123");

        // Assert
        deleted.Should().BeTrue();

        var user1Remaining = await _sut.GetByUserIdAsync("user-123");
        user1Remaining.Should().BeEmpty();

        var user2Remaining = await _sut.GetByUserIdAsync("user-456");
        user2Remaining.Should().HaveCount(1);
    }

    [Fact]
    public async Task DeleteByUserIdAsync_WhenNoEmbeddings_ReturnsTrue()
    {
        // Act
        var deleted = await _sut.DeleteByUserIdAsync("user-with-no-embeddings");

        // Assert
        deleted.Should().BeTrue();
    }

    #endregion

    #region CountByUserIdAsync Tests

    [Fact]
    public async Task CountByUserIdAsync_WhenEmbeddingsExist_ReturnsCorrectCount()
    {
        // Arrange
        var user1Embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-123", 0),
            CreateTestEmbedding("emb-2", "note-1", "user-123", 1),
            CreateTestEmbedding("emb-3", "note-2", "user-123", 0)
        };
        var user2Embedding = CreateTestEmbedding("emb-4", "note-3", "user-456", 0);

        await _sut.CreateBatchAsync(user1Embeddings);
        await _sut.CreateAsync(user2Embedding);

        // Act
        var count = await _sut.CountByUserIdAsync("user-123");

        // Assert
        count.Should().Be(3);
    }

    [Fact]
    public async Task CountByUserIdAsync_WhenNoEmbeddings_ReturnsZero()
    {
        // Act
        var count = await _sut.CountByUserIdAsync("user-with-no-embeddings");

        // Assert
        count.Should().Be(0);
    }

    #endregion

    #region Helper Methods

    private static NoteEmbedding CreateTestEmbedding(string id, string noteId, string userId, int chunkIndex)
    {
        // Create a test vector with 1536 dimensions (OpenAI embedding size)
        var testVectorData = new float[1536];
        for (int i = 0; i < 1536; i++)
        {
            testVectorData[i] = 0.001f * (i + 1);
        }
        var testVector = new Vector(testVectorData);

        return new NoteEmbedding
        {
            Id = id,
            NoteId = noteId,
            UserId = userId,
            ChunkIndex = chunkIndex,
            Content = $"Content for chunk {chunkIndex}",
            Embedding = testVector,
            EmbeddingProvider = "openai",
            EmbeddingModel = "text-embedding-ada-002",
            NoteTitle = "Test Note",
            NoteTags = new List<string>(),
            CreatedAt = DateTime.UtcNow
        };
    }

    #endregion
}

