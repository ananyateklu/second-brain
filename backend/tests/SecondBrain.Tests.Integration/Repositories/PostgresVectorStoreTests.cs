using Microsoft.Extensions.Logging;
using Pgvector;
using SecondBrain.Core.Entities;
using SecondBrain.Infrastructure.VectorStore;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.Repositories;

[Collection("PostgreSQL")]
public class PostgresVectorStoreTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly Mock<ILogger<PostgresVectorStore>> _mockLogger;
    private PostgresVectorStore _sut = null!;

    public PostgresVectorStoreTests(PostgresFixture fixture)
    {
        _fixture = fixture;
        _mockLogger = new Mock<ILogger<PostgresVectorStore>>();
    }

    public async Task InitializeAsync()
    {
        // Clean up embeddings before each test
        await using var dbContext = _fixture.CreateDbContext();
        dbContext.NoteEmbeddings.RemoveRange(dbContext.NoteEmbeddings);
        await dbContext.SaveChangesAsync();

        // Create a fresh vector store for each test
        _sut = new PostgresVectorStore(_fixture.CreateDbContext(), _mockLogger.Object);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    #region UpsertAsync Tests

    [Fact]
    public async Task UpsertAsync_WithNewEmbedding_ReturnsTrue()
    {
        // Arrange
        var embedding = CreateTestEmbedding("emb-1", "note-1", "user-1");

        // Act
        var result = await _sut.UpsertAsync(embedding);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task UpsertAsync_WithExistingId_UpdatesEmbedding()
    {
        // Arrange
        var embedding1 = CreateTestEmbedding("emb-1", "note-1", "user-1", "Original content");
        await _sut.UpsertAsync(embedding1);

        var embedding2 = CreateTestEmbedding("emb-1", "note-1", "user-1", "Updated content");

        // Act
        var result = await _sut.UpsertAsync(embedding2);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task UpsertAsync_WithEmptyId_GeneratesId()
    {
        // Arrange
        var embedding = CreateTestEmbedding("", "note-1", "user-1");

        // Act
        var result = await _sut.UpsertAsync(embedding);

        // Assert
        result.Should().BeTrue();
        embedding.Id.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task UpsertAsync_SetsCreatedAt()
    {
        // Arrange
        var beforeUpsert = DateTime.UtcNow;
        var embedding = CreateTestEmbedding("emb-1", "note-1", "user-1");

        // Act
        await _sut.UpsertAsync(embedding);

        // Assert
        embedding.CreatedAt.Should().BeOnOrAfter(beforeUpsert);
    }

    #endregion

    #region UpsertBatchAsync Tests

    [Fact]
    public async Task UpsertBatchAsync_WithMultipleEmbeddings_ReturnsTrue()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-1"),
            CreateTestEmbedding("emb-2", "note-2", "user-1"),
            CreateTestEmbedding("emb-3", "note-3", "user-1")
        };

        // Act
        var result = await _sut.UpsertBatchAsync(embeddings);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task UpsertBatchAsync_WithEmptyList_ReturnsTrue()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>();

        // Act
        var result = await _sut.UpsertBatchAsync(embeddings);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task UpsertBatchAsync_WithMixedNewAndExisting_UpdatesAndAdds()
    {
        // Arrange
        await _sut.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1", "Original"));

        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-1", "Updated"),
            CreateTestEmbedding("emb-2", "note-2", "user-1", "New")
        };

        // Act
        var result = await _sut.UpsertBatchAsync(embeddings);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task UpsertBatchAsync_WithEmptyIds_GeneratesIds()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("", "note-1", "user-1"),
            CreateTestEmbedding("", "note-2", "user-1")
        };

        // Act
        var result = await _sut.UpsertBatchAsync(embeddings);

        // Assert
        result.Should().BeTrue();
        embeddings[0].Id.Should().NotBeNullOrEmpty();
        embeddings[1].Id.Should().NotBeNullOrEmpty();
        embeddings[0].Id.Should().NotBe(embeddings[1].Id);
    }

    #endregion

    #region SearchAsync Tests

    [Fact]
    public async Task SearchAsync_WithEmbeddings_ReturnsResults()
    {
        // Arrange
        await _sut.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _sut.UpsertAsync(CreateTestEmbedding("emb-2", "note-2", "user-1"));

        // Create a query embedding (same dimension as stored embeddings)
        var queryEmbedding = Enumerable.Range(0, 1536).Select(i => (double)i / 1536.0).ToList();

        // Act
        var results = await _sut.SearchAsync(queryEmbedding, "user-1", topK: 5, similarityThreshold: 0.0f);

        // Assert
        results.Should().NotBeEmpty();
    }

    [Fact]
    public async Task SearchAsync_RespectsTopK()
    {
        // Arrange
        for (int i = 0; i < 10; i++)
        {
            await _sut.UpsertAsync(CreateTestEmbedding($"emb-{i}", $"note-{i}", "user-1"));
        }

        var queryEmbedding = Enumerable.Range(0, 1536).Select(i => (double)i / 1536.0).ToList();

        // Act
        var results = await _sut.SearchAsync(queryEmbedding, "user-1", topK: 3, similarityThreshold: 0.0f);

        // Assert
        results.Should().HaveCountLessThanOrEqualTo(3);
    }

    [Fact]
    public async Task SearchAsync_WithNoEmbeddings_ReturnsEmptyList()
    {
        // Arrange
        var queryEmbedding = Enumerable.Range(0, 1536).Select(i => (double)i / 1536.0).ToList();

        // Act
        var results = await _sut.SearchAsync(queryEmbedding, "user-1", topK: 5);

        // Assert
        results.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchAsync_ReturnsCorrectMetadata()
    {
        // Arrange
        var embedding = CreateTestEmbedding("emb-1", "note-1", "user-1", "Test content");
        embedding.NoteTitle = "Test Note Title";
        embedding.NoteTags = new List<string> { "tag1", "tag2" };
        await _sut.UpsertAsync(embedding);

        var queryEmbedding = Enumerable.Range(0, 1536).Select(i => (double)i / 1536.0).ToList();

        // Act
        var results = await _sut.SearchAsync(queryEmbedding, "user-1", topK: 5, similarityThreshold: 0.0f);

        // Assert
        results.Should().NotBeEmpty();
        var result = results.First();
        result.NoteTitle.Should().Be("Test Note Title");
        result.NoteTags.Should().Contain("tag1");
        result.Metadata.Should().ContainKey("embeddingProvider");
        result.Metadata.Should().ContainKey("embeddingModel");
    }

    #endregion

    #region DeleteByNoteIdAsync Tests

    [Fact]
    public async Task DeleteByNoteIdAsync_WhenEmbeddingsExist_ReturnsTrue()
    {
        // Arrange
        await _sut.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _sut.UpsertAsync(CreateTestEmbedding("emb-2", "note-1", "user-1")); // Same note, different chunk

        // Act
        var result = await _sut.DeleteByNoteIdAsync("note-1");

        // Assert
        result.Should().BeTrue();
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
    public async Task DeleteByNoteIdAsync_OnlyDeletesTargetNote()
    {
        // Arrange
        await _sut.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _sut.UpsertAsync(CreateTestEmbedding("emb-2", "note-2", "user-1"));

        // Act
        await _sut.DeleteByNoteIdAsync("note-1");

        // Assert
        var stats = await _sut.GetIndexStatsAsync("user-1");
        stats.TotalEmbeddings.Should().Be(1);
    }

    #endregion

    #region DeleteByUserIdAsync Tests

    [Fact]
    public async Task DeleteByUserIdAsync_WhenEmbeddingsExist_ReturnsTrue()
    {
        // Arrange
        await _sut.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _sut.UpsertAsync(CreateTestEmbedding("emb-2", "note-2", "user-1"));

        // Act
        var result = await _sut.DeleteByUserIdAsync("user-1");

        // Assert
        result.Should().BeTrue();
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
    public async Task DeleteByUserIdAsync_OnlyDeletesTargetUser()
    {
        // Arrange
        await _sut.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _sut.UpsertAsync(CreateTestEmbedding("emb-2", "note-2", "user-2"));

        // Act
        await _sut.DeleteByUserIdAsync("user-1");

        // Assert
        var stats = await _sut.GetIndexStatsAsync("user-2");
        stats.TotalEmbeddings.Should().Be(1);
    }

    #endregion

    #region GetIndexStatsAsync Tests

    [Fact]
    public async Task GetIndexStatsAsync_ReturnsCorrectStats()
    {
        // Arrange
        await _sut.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _sut.UpsertAsync(CreateTestEmbedding("emb-2", "note-1", "user-1", chunkIndex: 1)); // Same note, different chunk
        await _sut.UpsertAsync(CreateTestEmbedding("emb-3", "note-2", "user-1"));

        // Act
        var stats = await _sut.GetIndexStatsAsync("user-1");

        // Assert
        stats.UserId.Should().Be("user-1");
        stats.TotalEmbeddings.Should().Be(3);
        stats.UniqueNotes.Should().Be(2);
        stats.VectorStoreProvider.Should().Be("PostgreSQL");
        stats.EmbeddingProvider.Should().Be("test-provider");
    }

    [Fact]
    public async Task GetIndexStatsAsync_WithNoEmbeddings_ReturnsZeroStats()
    {
        // Act
        var stats = await _sut.GetIndexStatsAsync("user-1");

        // Assert
        stats.UserId.Should().Be("user-1");
        stats.TotalEmbeddings.Should().Be(0);
        stats.UniqueNotes.Should().Be(0);
        stats.LastIndexedAt.Should().BeNull();
    }

    [Fact]
    public async Task GetIndexStatsAsync_ReturnsLastIndexedAt()
    {
        // Arrange
        var beforeInsert = DateTime.UtcNow;
        await _sut.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));

        // Act
        var stats = await _sut.GetIndexStatsAsync("user-1");

        // Assert
        stats.LastIndexedAt.Should().NotBeNull();
        stats.LastIndexedAt!.Value.Should().BeOnOrAfter(beforeInsert);
    }

    #endregion

    #region Helper Methods

    private static NoteEmbedding CreateTestEmbedding(
        string id,
        string noteId,
        string userId,
        string content = "Test content",
        int chunkIndex = 0)
    {
        // Create a deterministic embedding vector based on the content
        var embeddingValues = new float[1536];
        var hash = content.GetHashCode();
        for (int i = 0; i < 1536; i++)
        {
            embeddingValues[i] = (float)Math.Sin(hash + i) * 0.5f + 0.5f;
        }

        return new NoteEmbedding
        {
            Id = id,
            NoteId = noteId,
            UserId = userId,
            Content = content,
            ChunkIndex = chunkIndex,
            NoteTitle = "Test Note",
            NoteTags = new List<string> { "test" },
            EmbeddingProvider = "test-provider",
            EmbeddingModel = "test-model",
            Embedding = new Vector(embeddingValues)
        };
    }

    #endregion
}

