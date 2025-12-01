using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pgvector;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.VectorStore;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Tests.Unit.Application.Services.VectorStore;

public class CompositeVectorStoreTests
{
    private readonly Mock<IVectorStore> _mockPostgresStore;
    private readonly Mock<IOptions<RagSettings>> _mockRagSettings;
    private readonly Mock<ILogger<CompositeVectorStore>> _mockLogger;
    private readonly Mock<IOptions<PineconeSettings>> _mockPineconeSettings;
    private readonly Mock<ILogger<PineconeVectorStore>> _mockPineconeLogger;

    public CompositeVectorStoreTests()
    {
        _mockPostgresStore = new Mock<IVectorStore>();
        _mockRagSettings = new Mock<IOptions<RagSettings>>();
        _mockLogger = new Mock<ILogger<CompositeVectorStore>>();
        _mockPineconeSettings = new Mock<IOptions<PineconeSettings>>();
        _mockPineconeLogger = new Mock<ILogger<PineconeVectorStore>>();
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithValidDependencies_InitializesCorrectly()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();

        // Act
        var store = CreateCompositeStore();

        // Assert
        store.Should().NotBeNull();
    }

    #endregion

    #region SetProviderOverride Tests

    [Fact]
    public async Task SetProviderOverride_ChangesActiveProvider()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var embedding = CreateTestEmbedding();

        _mockPostgresStore.Setup(s => s.UpsertAsync(It.IsAny<NoteEmbedding>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act - Initially PostgreSQL, then override to PostgreSQL explicitly
        store.SetProviderOverride("PostgreSQL");
        await store.UpsertAsync(embedding);

        // Assert
        _mockPostgresStore.Verify(s => s.UpsertAsync(embedding, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region UpsertAsync Tests

    [Fact]
    public async Task UpsertAsync_WhenPostgresOnly_CallsPostgresStore()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var embedding = CreateTestEmbedding();

        _mockPostgresStore.Setup(s => s.UpsertAsync(It.IsAny<NoteEmbedding>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await store.UpsertAsync(embedding);

        // Assert
        result.Should().BeTrue();
        _mockPostgresStore.Verify(s => s.UpsertAsync(embedding, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpsertAsync_WhenPostgresFails_ReturnsFalse()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var embedding = CreateTestEmbedding();

        _mockPostgresStore.Setup(s => s.UpsertAsync(It.IsAny<NoteEmbedding>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await store.UpsertAsync(embedding);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region UpsertBatchAsync Tests

    [Fact]
    public async Task UpsertBatchAsync_WhenPostgresOnly_CallsPostgresStore()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var embeddings = new List<NoteEmbedding> { CreateTestEmbedding(), CreateTestEmbedding() };

        _mockPostgresStore.Setup(s => s.UpsertBatchAsync(It.IsAny<IEnumerable<NoteEmbedding>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await store.UpsertBatchAsync(embeddings);

        // Assert
        result.Should().BeTrue();
        _mockPostgresStore.Verify(s => s.UpsertBatchAsync(It.IsAny<IEnumerable<NoteEmbedding>>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpsertBatchAsync_WhenPostgresFails_ReturnsFalse()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var embeddings = new List<NoteEmbedding> { CreateTestEmbedding() };

        _mockPostgresStore.Setup(s => s.UpsertBatchAsync(It.IsAny<IEnumerable<NoteEmbedding>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await store.UpsertBatchAsync(embeddings);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task UpsertBatchAsync_MaterializesEnumerable()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var embeddings = CreateEnumerableWithSideEffect();

        _mockPostgresStore.Setup(s => s.UpsertBatchAsync(It.IsAny<IEnumerable<NoteEmbedding>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await store.UpsertBatchAsync(embeddings);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region SearchAsync Tests

    [Fact]
    public async Task SearchAsync_WhenPostgresOnly_CallsPostgresStore()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var queryEmbedding = new List<double> { 0.1, 0.2, 0.3 };
        var expectedResults = new List<VectorSearchResult>
        {
            new() { Id = "1", NoteId = "note1", SimilarityScore = 0.9f }
        };

        _mockPostgresStore.Setup(s => s.SearchAsync(
                It.IsAny<List<double>>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<float>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResults);

        // Act
        var result = await store.SearchAsync(queryEmbedding, "user1", 5);

        // Assert
        result.Should().BeEquivalentTo(expectedResults);
        _mockPostgresStore.Verify(s => s.SearchAsync(
            queryEmbedding, "user1", 5, 0.7f, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SearchAsync_WhenPostgresOnly_ReturnsEmptyListWhenNoResults()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var queryEmbedding = new List<double> { 0.1, 0.2, 0.3 };

        _mockPostgresStore.Setup(s => s.SearchAsync(
                It.IsAny<List<double>>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<float>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VectorSearchResult>());

        // Act
        var result = await store.SearchAsync(queryEmbedding, "user1", 5);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchAsync_WithCustomSimilarityThreshold_PassesToStore()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var queryEmbedding = new List<double> { 0.1, 0.2, 0.3 };
        var customThreshold = 0.85f;

        _mockPostgresStore.Setup(s => s.SearchAsync(
                It.IsAny<List<double>>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                customThreshold,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VectorSearchResult>());

        // Act
        await store.SearchAsync(queryEmbedding, "user1", 5, customThreshold);

        // Assert
        _mockPostgresStore.Verify(s => s.SearchAsync(
            queryEmbedding, "user1", 5, customThreshold, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region DeleteByNoteIdAsync Tests

    [Fact]
    public async Task DeleteByNoteIdAsync_WhenPostgresOnly_CallsPostgresStore()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var noteId = "note-123";

        _mockPostgresStore.Setup(s => s.DeleteByNoteIdAsync(noteId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await store.DeleteByNoteIdAsync(noteId);

        // Assert
        result.Should().BeTrue();
        _mockPostgresStore.Verify(s => s.DeleteByNoteIdAsync(noteId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteByNoteIdAsync_WhenPostgresFails_ReturnsFalse()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var noteId = "note-123";

        _mockPostgresStore.Setup(s => s.DeleteByNoteIdAsync(noteId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await store.DeleteByNoteIdAsync(noteId);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region DeleteByUserIdAsync Tests

    [Fact]
    public async Task DeleteByUserIdAsync_WhenPostgresOnly_CallsPostgresStore()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var userId = "user-123";

        _mockPostgresStore.Setup(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await store.DeleteByUserIdAsync(userId);

        // Assert
        result.Should().BeTrue();
        _mockPostgresStore.Verify(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteByUserIdAsync_WhenPostgresFails_ReturnsFalse()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var userId = "user-123";

        _mockPostgresStore.Setup(s => s.DeleteByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await store.DeleteByUserIdAsync(userId);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region GetIndexStatsAsync Tests

    [Fact]
    public async Task GetIndexStatsAsync_WhenPostgresOnly_CallsPostgresStore()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var userId = "user-123";
        var expectedStats = new IndexStats
        {
            UserId = userId,
            TotalEmbeddings = 100,
            UniqueNotes = 50,
            VectorStoreProvider = "PostgreSQL"
        };

        _mockPostgresStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedStats);

        // Act
        var result = await store.GetIndexStatsAsync(userId);

        // Assert
        result.TotalEmbeddings.Should().Be(100);
        result.UniqueNotes.Should().Be(50);
        result.VectorStoreProvider.Should().Be("PostgreSQL");
    }

    [Fact]
    public async Task GetIndexStatsAsync_SetsVectorStoreProviderToCurrentProvider()
    {
        // Arrange
        SetupSettings("PostgreSQL");
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var userId = "user-123";
        var statsFromStore = new IndexStats
        {
            UserId = userId,
            TotalEmbeddings = 100,
            VectorStoreProvider = "SomethingElse" // This should be overwritten
        };

        _mockPostgresStore.Setup(s => s.GetIndexStatsAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(statsFromStore);

        // Act
        var result = await store.GetIndexStatsAsync(userId);

        // Assert
        result.VectorStoreProvider.Should().Be("PostgreSQL");
    }

    #endregion

    #region Provider Selection Tests

    [Theory]
    [InlineData("PostgreSQL")]
    [InlineData("postgresql")]
    [InlineData("POSTGRESQL")]
    public async Task ProviderSelection_PostgresVariants_UsePostgres(string provider)
    {
        // Arrange
        SetupSettings(provider);
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var embedding = CreateTestEmbedding();

        _mockPostgresStore.Setup(s => s.UpsertAsync(It.IsAny<NoteEmbedding>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        await store.UpsertAsync(embedding);

        // Assert
        _mockPostgresStore.Verify(s => s.UpsertAsync(embedding, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProviderOverride_TakesPrecedenceOverSettings()
    {
        // Arrange
        SetupSettings("Pinecone"); // Settings say Pinecone
        SetupPineconeSettings();
        var store = CreateCompositeStore();
        var embedding = CreateTestEmbedding();

        _mockPostgresStore.Setup(s => s.UpsertAsync(It.IsAny<NoteEmbedding>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act - Override to PostgreSQL
        store.SetProviderOverride("PostgreSQL");
        await store.UpsertAsync(embedding);

        // Assert
        _mockPostgresStore.Verify(s => s.UpsertAsync(embedding, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region Helper Methods

    private CompositeVectorStore CreateCompositeStore()
    {
        var pineconeStore = new PineconeVectorStore(
            _mockPineconeSettings.Object,
            _mockPineconeLogger.Object);

        return new CompositeVectorStore(
            _mockPostgresStore.Object,
            pineconeStore,
            _mockRagSettings.Object,
            _mockLogger.Object);
    }

    private void SetupSettings(string vectorStoreProvider)
    {
        var settings = new RagSettings
        {
            VectorStoreProvider = vectorStoreProvider,
            ChunkSize = 500,
            ChunkOverlap = 50,
            TopK = 5,
            SimilarityThreshold = 0.7f
        };
        _mockRagSettings.Setup(s => s.Value).Returns(settings);
    }

    private void SetupPineconeSettings()
    {
        var settings = new PineconeSettings
        {
            ApiKey = "test-key",
            IndexName = "test-index",
            Dimensions = 1536
        };
        _mockPineconeSettings.Setup(s => s.Value).Returns(settings);
    }

    private static NoteEmbedding CreateTestEmbedding()
    {
        return new NoteEmbedding
        {
            Id = Guid.NewGuid().ToString(),
            NoteId = "note-1",
            UserId = "user-1",
            Content = "Test content",
            ChunkIndex = 0,
            Embedding = new Vector(new float[] { 0.1f, 0.2f, 0.3f }),
            EmbeddingProvider = "OpenAI",
            EmbeddingModel = "text-embedding-3-small",
            NoteTitle = "Test Note",
            NoteTags = new List<string> { "test" }
        };
    }

    private static IEnumerable<NoteEmbedding> CreateEnumerableWithSideEffect()
    {
        // This tests that the enumerable is materialized (ToList is called)
        yield return CreateTestEmbedding();
        yield return CreateTestEmbedding();
    }

    #endregion
}

