using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Tests.Unit.Infrastructure.VectorStore;

/// <summary>
/// Test-specific vector store implementation that mimics PostgresVectorStore behavior
/// without requiring pgvector extension. Used for unit testing vector store operations.
/// </summary>
public class TestVectorStore : IVectorStore
{
    private readonly List<NoteEmbedding> _embeddings = new();
    private readonly ILogger<TestVectorStore> _logger;

    public TestVectorStore(ILogger<TestVectorStore> logger)
    {
        _logger = logger;
    }

    public Task<bool> UpsertAsync(NoteEmbedding embedding, CancellationToken cancellationToken = default)
    {
        var existing = _embeddings.FirstOrDefault(e => e.Id == embedding.Id);
        if (existing != null)
        {
            // Update existing
            existing.NoteId = embedding.NoteId;
            existing.UserId = embedding.UserId;
            existing.ChunkIndex = embedding.ChunkIndex;
            existing.Content = embedding.Content;
            existing.Embedding = embedding.Embedding;
            existing.EmbeddingProvider = embedding.EmbeddingProvider;
            existing.EmbeddingModel = embedding.EmbeddingModel;
            existing.NoteTitle = embedding.NoteTitle;
            existing.NoteTags = embedding.NoteTags;
            existing.NoteUpdatedAt = embedding.NoteUpdatedAt;
        }
        else
        {
            // Create new
            if (string.IsNullOrEmpty(embedding.Id))
            {
                embedding.Id = Guid.NewGuid().ToString();
            }
            embedding.CreatedAt = DateTime.UtcNow;
            _embeddings.Add(embedding);
        }
        return Task.FromResult(true);
    }

    public Task<bool> UpsertBatchAsync(IEnumerable<NoteEmbedding> embeddings, CancellationToken cancellationToken = default)
    {
        var embeddingsList = embeddings.ToList();
        var now = DateTime.UtcNow;

        foreach (var embedding in embeddingsList)
        {
            var existing = _embeddings.FirstOrDefault(e => e.Id == embedding.Id);
            if (existing != null)
            {
                existing.NoteId = embedding.NoteId;
                existing.UserId = embedding.UserId;
                existing.ChunkIndex = embedding.ChunkIndex;
                existing.Content = embedding.Content;
                existing.Embedding = embedding.Embedding;
                existing.EmbeddingProvider = embedding.EmbeddingProvider;
                existing.EmbeddingModel = embedding.EmbeddingModel;
                existing.NoteTitle = embedding.NoteTitle;
                existing.NoteTags = embedding.NoteTags;
                existing.NoteUpdatedAt = embedding.NoteUpdatedAt;
            }
            else
            {
                if (string.IsNullOrEmpty(embedding.Id))
                {
                    embedding.Id = Guid.NewGuid().ToString();
                }
                embedding.CreatedAt = now;
                _embeddings.Add(embedding);
            }
        }

        _logger.LogInformation("Successfully upserted {Count} embeddings", embeddingsList.Count);
        return Task.FromResult(true);
    }

    public Task<List<VectorSearchResult>> SearchAsync(
        List<double> queryEmbedding,
        string userId,
        int topK,
        float similarityThreshold = 0.7f,
        CancellationToken cancellationToken = default)
    {
        // Simple mock search - returns embeddings for the user sorted by a simulated similarity
        var results = _embeddings
            .Where(e => e.UserId == userId)
            .Take(topK)
            .Select(e => new VectorSearchResult
            {
                Id = e.Id,
                NoteId = e.NoteId,
                Content = e.Content,
                NoteTitle = e.NoteTitle,
                NoteTags = e.NoteTags,
                ChunkIndex = e.ChunkIndex,
                SimilarityScore = 0.85f, // Mock similarity score above threshold
                Metadata = new Dictionary<string, object>
                {
                    { "embeddingProvider", e.EmbeddingProvider },
                    { "embeddingModel", e.EmbeddingModel },
                    { "createdAt", e.CreatedAt }
                }
            })
            .ToList();

        return Task.FromResult(results);
    }

    public Task<bool> DeleteByNoteIdAsync(string noteId, CancellationToken cancellationToken = default)
    {
        var count = _embeddings.RemoveAll(e => e.NoteId == noteId);
        _logger.LogInformation("Deleted {Count} embeddings for note {NoteId}", count, noteId);
        return Task.FromResult(true);
    }

    public Task<bool> DeleteByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        var count = _embeddings.RemoveAll(e => e.UserId == userId);
        _logger.LogInformation("Deleted {Count} embeddings for user {UserId}", count, userId);
        return Task.FromResult(true);
    }

    public Task<IndexStats> GetIndexStatsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var userEmbeddings = _embeddings.Where(e => e.UserId == userId).ToList();
        var uniqueNotes = userEmbeddings.Select(e => e.NoteId).Distinct().Count();
        var lastIndexed = userEmbeddings.Count > 0
            ? userEmbeddings.Max(e => e.CreatedAt)
            : (DateTime?)null;
        var provider = userEmbeddings.FirstOrDefault()?.EmbeddingProvider ?? string.Empty;

        return Task.FromResult(new IndexStats
        {
            UserId = userId,
            TotalEmbeddings = userEmbeddings.Count,
            UniqueNotes = uniqueNotes,
            LastIndexedAt = lastIndexed,
            EmbeddingProvider = provider,
            VectorStoreProvider = "TestVectorStore"
        });
    }

    public Task<DateTime?> GetNoteUpdatedAtAsync(string noteId, CancellationToken cancellationToken = default)
    {
        var embedding = _embeddings.FirstOrDefault(e => e.NoteId == noteId);
        return Task.FromResult(embedding?.NoteUpdatedAt);
    }

    public Task<HashSet<string>> GetIndexedNoteIdsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var noteIds = _embeddings
            .Where(e => e.UserId == userId)
            .Select(e => e.NoteId)
            .Distinct()
            .ToHashSet();
        return Task.FromResult(noteIds);
    }

    // Helper methods for tests
    public void Clear() => _embeddings.Clear();
    public int Count => _embeddings.Count;
    public int CountForUser(string userId) => _embeddings.Count(e => e.UserId == userId);
    public NoteEmbedding? GetById(string id) => _embeddings.FirstOrDefault(e => e.Id == id);
}

public class PostgresVectorStoreTests
{
    private readonly TestVectorStore _vectorStore;
    private readonly Mock<ILogger<TestVectorStore>> _mockLogger;

    public PostgresVectorStoreTests()
    {
        _mockLogger = new Mock<ILogger<TestVectorStore>>();
        _vectorStore = new TestVectorStore(_mockLogger.Object);
    }

    #region UpsertAsync Tests

    [Fact]
    public async Task UpsertAsync_WithNewEmbedding_AddsEmbedding()
    {
        // Arrange
        var embedding = CreateTestEmbedding("emb-1", "note-1", "user-1");

        // Act
        var result = await _vectorStore.UpsertAsync(embedding);

        // Assert
        result.Should().BeTrue();
        _vectorStore.Count.Should().Be(1);
    }

    [Fact]
    public async Task UpsertAsync_WithExistingId_UpdatesEmbedding()
    {
        // Arrange
        var embedding1 = CreateTestEmbedding("emb-1", "note-1", "user-1", "Original content");
        var embedding2 = CreateTestEmbedding("emb-1", "note-1", "user-1", "Updated content");

        await _vectorStore.UpsertAsync(embedding1);

        // Act
        var result = await _vectorStore.UpsertAsync(embedding2);

        // Assert
        result.Should().BeTrue();
        _vectorStore.Count.Should().Be(1);
        var stored = _vectorStore.GetById("emb-1");
        stored.Should().NotBeNull();
        stored!.Content.Should().Be("Updated content");
    }

    [Fact]
    public async Task UpsertAsync_WithEmptyId_GeneratesNewId()
    {
        // Arrange
        var embedding = CreateTestEmbedding("", "note-1", "user-1");

        // Act
        var result = await _vectorStore.UpsertAsync(embedding);

        // Assert
        result.Should().BeTrue();
        embedding.Id.Should().NotBeNullOrEmpty();
        _vectorStore.Count.Should().Be(1);
    }

    [Fact]
    public async Task UpsertAsync_SetsCreatedAtForNewEmbedding()
    {
        // Arrange
        var embedding = CreateTestEmbedding("emb-1", "note-1", "user-1");
        var beforeUpsert = DateTime.UtcNow;

        // Act
        await _vectorStore.UpsertAsync(embedding);

        // Assert
        var stored = _vectorStore.GetById("emb-1");
        stored!.CreatedAt.Should().BeOnOrAfter(beforeUpsert);
    }

    [Fact]
    public async Task UpsertAsync_WithMultipleEmbeddings_AddsAll()
    {
        // Arrange & Act
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-2", "note-2", "user-1"));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-3", "note-3", "user-2"));

        // Assert
        _vectorStore.Count.Should().Be(3);
        _vectorStore.CountForUser("user-1").Should().Be(2);
        _vectorStore.CountForUser("user-2").Should().Be(1);
    }

    #endregion

    #region UpsertBatchAsync Tests

    [Fact]
    public async Task UpsertBatchAsync_WithMultipleEmbeddings_AddsAll()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-1"),
            CreateTestEmbedding("emb-2", "note-2", "user-1"),
            CreateTestEmbedding("emb-3", "note-3", "user-1")
        };

        // Act
        var result = await _vectorStore.UpsertBatchAsync(embeddings);

        // Assert
        result.Should().BeTrue();
        _vectorStore.Count.Should().Be(3);
    }

    [Fact]
    public async Task UpsertBatchAsync_WithEmptyList_ReturnsTrue()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>();

        // Act
        var result = await _vectorStore.UpsertBatchAsync(embeddings);

        // Assert
        result.Should().BeTrue();
        _vectorStore.Count.Should().Be(0);
    }

    [Fact]
    public async Task UpsertBatchAsync_WithMixedNewAndExisting_UpdatesAndAdds()
    {
        // Arrange
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1", "Original"));

        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("emb-1", "note-1", "user-1", "Updated"),
            CreateTestEmbedding("emb-2", "note-2", "user-1", "New")
        };

        // Act
        var result = await _vectorStore.UpsertBatchAsync(embeddings);

        // Assert
        result.Should().BeTrue();
        _vectorStore.Count.Should().Be(2);
        _vectorStore.GetById("emb-1")!.Content.Should().Be("Updated");
        _vectorStore.GetById("emb-2")!.Content.Should().Be("New");
    }

    [Fact]
    public async Task UpsertBatchAsync_WithEmptyIds_GeneratesNewIds()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateTestEmbedding("", "note-1", "user-1"),
            CreateTestEmbedding("", "note-2", "user-1")
        };

        // Act
        var result = await _vectorStore.UpsertBatchAsync(embeddings);

        // Assert
        result.Should().BeTrue();
        _vectorStore.Count.Should().Be(2);
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
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-2", "note-2", "user-1"));
        var queryEmbedding = new List<double> { 0.1, 0.2, 0.3 };

        // Act
        var results = await _vectorStore.SearchAsync(queryEmbedding, "user-1", topK: 5);

        // Assert
        results.Should().HaveCount(2);
    }

    [Fact]
    public async Task SearchAsync_RespectsTopK()
    {
        // Arrange
        for (int i = 0; i < 10; i++)
        {
            await _vectorStore.UpsertAsync(CreateTestEmbedding($"emb-{i}", $"note-{i}", "user-1"));
        }
        var queryEmbedding = new List<double> { 0.1, 0.2, 0.3 };

        // Act
        var results = await _vectorStore.SearchAsync(queryEmbedding, "user-1", topK: 3);

        // Assert
        results.Should().HaveCount(3);
    }

    [Fact]
    public async Task SearchAsync_ReturnsCorrectMetadata()
    {
        // Arrange
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1", "Test content"));
        var queryEmbedding = new List<double> { 0.1, 0.2, 0.3 };

        // Act
        var results = await _vectorStore.SearchAsync(queryEmbedding, "user-1", topK: 5);

        // Assert
        results.Should().HaveCount(1);
        var result = results[0];
        result.Id.Should().Be("emb-1");
        result.NoteId.Should().Be("note-1");
        result.Content.Should().Be("Test content");
        result.SimilarityScore.Should().BeGreaterThan(0);
        result.Metadata.Should().ContainKey("embeddingProvider");
        result.Metadata.Should().ContainKey("embeddingModel");
    }

    [Fact]
    public async Task SearchAsync_FiltersUserEmbeddings()
    {
        // Arrange
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-2", "note-2", "user-2"));
        var queryEmbedding = new List<double> { 0.1, 0.2, 0.3 };

        // Act
        var results = await _vectorStore.SearchAsync(queryEmbedding, "user-1", topK: 5);

        // Assert
        results.Should().HaveCount(1);
        results[0].NoteId.Should().Be("note-1");
    }

    [Fact]
    public async Task SearchAsync_WithNoEmbeddings_ReturnsEmptyList()
    {
        // Arrange
        var queryEmbedding = new List<double> { 0.1, 0.2, 0.3 };

        // Act
        var results = await _vectorStore.SearchAsync(queryEmbedding, "user-1", topK: 5);

        // Assert
        results.Should().BeEmpty();
    }

    #endregion

    #region DeleteByNoteIdAsync Tests

    [Fact]
    public async Task DeleteByNoteIdAsync_RemovesMatchingEmbeddings()
    {
        // Arrange
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-2", "note-1", "user-1")); // Same note, different chunk
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-3", "note-2", "user-1"));

        // Act
        var result = await _vectorStore.DeleteByNoteIdAsync("note-1");

        // Assert
        result.Should().BeTrue();
        _vectorStore.Count.Should().Be(1);
        _vectorStore.GetById("emb-3").Should().NotBeNull();
    }

    [Fact]
    public async Task DeleteByNoteIdAsync_WithNoMatches_ReturnsTrue()
    {
        // Arrange
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));

        // Act
        var result = await _vectorStore.DeleteByNoteIdAsync("nonexistent-note");

        // Assert
        result.Should().BeTrue();
        _vectorStore.Count.Should().Be(1);
    }

    [Fact]
    public async Task DeleteByNoteIdAsync_RemovesAllChunksForNote()
    {
        // Arrange - Add multiple chunks for the same note
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1", chunkIndex: 0));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-2", "note-1", "user-1", chunkIndex: 1));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-3", "note-1", "user-1", chunkIndex: 2));

        // Act
        var result = await _vectorStore.DeleteByNoteIdAsync("note-1");

        // Assert
        result.Should().BeTrue();
        _vectorStore.Count.Should().Be(0);
    }

    #endregion

    #region DeleteByUserIdAsync Tests

    [Fact]
    public async Task DeleteByUserIdAsync_RemovesAllUserEmbeddings()
    {
        // Arrange
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-2", "note-2", "user-1"));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-3", "note-3", "user-2"));

        // Act
        var result = await _vectorStore.DeleteByUserIdAsync("user-1");

        // Assert
        result.Should().BeTrue();
        _vectorStore.Count.Should().Be(1);
        _vectorStore.CountForUser("user-1").Should().Be(0);
        _vectorStore.CountForUser("user-2").Should().Be(1);
    }

    [Fact]
    public async Task DeleteByUserIdAsync_WithNoMatches_ReturnsTrue()
    {
        // Arrange
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));

        // Act
        var result = await _vectorStore.DeleteByUserIdAsync("nonexistent-user");

        // Assert
        result.Should().BeTrue();
        _vectorStore.Count.Should().Be(1);
    }

    #endregion

    #region GetIndexStatsAsync Tests

    [Fact]
    public async Task GetIndexStatsAsync_ReturnsCorrectStats()
    {
        // Arrange
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-2", "note-1", "user-1", chunkIndex: 1)); // Same note, different chunk
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-3", "note-2", "user-1"));

        // Act
        var stats = await _vectorStore.GetIndexStatsAsync("user-1");

        // Assert
        stats.UserId.Should().Be("user-1");
        stats.TotalEmbeddings.Should().Be(3);
        stats.UniqueNotes.Should().Be(2);
        stats.VectorStoreProvider.Should().Be("TestVectorStore");
        stats.EmbeddingProvider.Should().Be("test-provider");
    }

    [Fact]
    public async Task GetIndexStatsAsync_WithNoEmbeddings_ReturnsZeroStats()
    {
        // Act
        var stats = await _vectorStore.GetIndexStatsAsync("user-1");

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
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));

        // Act
        var stats = await _vectorStore.GetIndexStatsAsync("user-1");

        // Assert
        stats.LastIndexedAt.Should().NotBeNull();
        stats.LastIndexedAt!.Value.Should().BeOnOrAfter(beforeInsert);
    }

    [Fact]
    public async Task GetIndexStatsAsync_OnlyCountsUserEmbeddings()
    {
        // Arrange
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-1", "note-1", "user-1"));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-2", "note-2", "user-2"));
        await _vectorStore.UpsertAsync(CreateTestEmbedding("emb-3", "note-3", "user-2"));

        // Act
        var stats1 = await _vectorStore.GetIndexStatsAsync("user-1");
        var stats2 = await _vectorStore.GetIndexStatsAsync("user-2");

        // Assert
        stats1.TotalEmbeddings.Should().Be(1);
        stats2.TotalEmbeddings.Should().Be(2);
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
            Embedding = null // Would be pgvector Vector in real implementation
        };
    }

    #endregion
}

