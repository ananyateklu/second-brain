using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.VectorStore;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.RAG;

/// <summary>
/// Unit tests for HybridSearchService.
/// Tests vector + BM25 search fusion using Reciprocal Rank Fusion (RRF).
/// </summary>
public class HybridSearchServiceTests
{
    private readonly Mock<IVectorStore> _mockVectorStore;
    private readonly Mock<IBM25SearchService> _mockBm25Service;
    private readonly Mock<IOptions<RagSettings>> _mockSettings;
    private readonly Mock<ILogger<HybridSearchService>> _mockLogger;

    private readonly RagSettings _defaultSettings;

    public HybridSearchServiceTests()
    {
        _mockVectorStore = new Mock<IVectorStore>();
        _mockBm25Service = new Mock<IBM25SearchService>();
        _mockSettings = new Mock<IOptions<RagSettings>>();
        _mockLogger = new Mock<ILogger<HybridSearchService>>();

        _defaultSettings = new RagSettings
        {
            EnableHybridSearch = true,
            TopK = 5,
            InitialRetrievalCount = 20,
            VectorWeight = 0.7f,
            BM25Weight = 0.3f,
            RRFConstant = 60
        };

        _mockSettings.Setup(s => s.Value).Returns(_defaultSettings);
    }

    #region SearchAsync Tests - Basic Functionality

    [Fact]
    public async Task SearchAsync_WhenHybridDisabled_ReturnsVectorOnlyResults()
    {
        // Arrange
        _defaultSettings.EnableHybridSearch = false;
        var sut = CreateService();
        var queryEmbedding = CreateTestEmbedding();
        var vectorResults = CreateVectorSearchResults(3);

        _mockVectorStore.Setup(v => v.SearchAsync(
            queryEmbedding, "user-123", 5, 0.3f, It.IsAny<CancellationToken>()))
            .ReturnsAsync(vectorResults);

        // Act
        var results = await sut.SearchAsync("test query", queryEmbedding, "user-123", 5, 0.3f);

        // Assert
        results.Should().HaveCount(3);
        results.Should().AllSatisfy(r => r.FoundInVectorSearch.Should().BeTrue());
        results.Should().AllSatisfy(r => r.FoundInBM25Search.Should().BeFalse());
        _mockBm25Service.Verify(b => b.SearchAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SearchAsync_WhenHybridEnabled_CombinesVectorAndBM25Results()
    {
        // Arrange
        var sut = CreateService();
        var queryEmbedding = CreateTestEmbedding();

        var vectorResults = CreateVectorSearchResults(3);
        var bm25Results = CreateBM25SearchResults(3);

        _mockVectorStore.Setup(v => v.SearchAsync(
            It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(vectorResults);

        _mockBm25Service.Setup(b => b.SearchAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(bm25Results);

        // Act
        var results = await sut.SearchAsync("test query", queryEmbedding, "user-123", 5, 0.3f);

        // Assert
        results.Should().NotBeEmpty();
        _mockVectorStore.Verify(v => v.SearchAsync(
            It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()), Times.Once);
        _mockBm25Service.Verify(b => b.SearchAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SearchAsync_WithOverlappingResults_DeduplicatesAndBoostsScore()
    {
        // Arrange
        var sut = CreateService();
        var queryEmbedding = CreateTestEmbedding();

        // Create overlapping results (same IDs in both vector and BM25)
        var vectorResults = new List<VectorSearchResult>
        {
            CreateVectorResult("id-1", "note-1", 0.95f),
            CreateVectorResult("id-2", "note-2", 0.85f)
        };

        var bm25Results = new List<BM25SearchResult>
        {
            CreateBM25Result("id-1", "note-1", 0.9f), // Overlaps with vector
            CreateBM25Result("id-3", "note-3", 0.8f)  // Unique to BM25
        };

        _mockVectorStore.Setup(v => v.SearchAsync(
            It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(vectorResults);

        _mockBm25Service.Setup(b => b.SearchAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(bm25Results);

        // Act
        var results = await sut.SearchAsync("test query", queryEmbedding, "user-123", 5, 0.3f);

        // Assert
        results.Should().HaveCount(3); // 2 unique from vector + 1 unique from BM25

        var overlappingResult = results.First(r => r.Id == "id-1");
        overlappingResult.FoundInVectorSearch.Should().BeTrue();
        overlappingResult.FoundInBM25Search.Should().BeTrue();
        overlappingResult.VectorScore.Should().BeApproximately(0.95f, 0.01f);
        overlappingResult.BM25Score.Should().BeApproximately(0.9f, 0.01f);
    }

    [Fact]
    public async Task SearchAsync_ReturnsResultsSortedByRRFScore()
    {
        // Arrange
        var sut = CreateService();
        var queryEmbedding = CreateTestEmbedding();

        var vectorResults = CreateVectorSearchResults(5);
        var bm25Results = CreateBM25SearchResults(5);

        _mockVectorStore.Setup(v => v.SearchAsync(
            It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(vectorResults);

        _mockBm25Service.Setup(b => b.SearchAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(bm25Results);

        // Act
        var results = await sut.SearchAsync("test query", queryEmbedding, "user-123", 10, 0.3f);

        // Assert
        for (int i = 1; i < results.Count; i++)
        {
            results[i - 1].RRFScore.Should().BeGreaterThanOrEqualTo(results[i].RRFScore);
        }
    }

    [Fact]
    public async Task SearchAsync_RespectsTopKLimit()
    {
        // Arrange
        var sut = CreateService();
        var queryEmbedding = CreateTestEmbedding();

        var vectorResults = CreateVectorSearchResults(10);
        var bm25Results = CreateBM25SearchResults(10);

        _mockVectorStore.Setup(v => v.SearchAsync(
            It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(vectorResults);

        _mockBm25Service.Setup(b => b.SearchAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(bm25Results);

        // Act
        var results = await sut.SearchAsync("test query", queryEmbedding, "user-123", 5, 0.3f);

        // Assert
        results.Should().HaveCountLessThanOrEqualTo(5);
    }

    #endregion

    #region RRF Score Calculation Tests

    [Fact]
    public async Task SearchAsync_CalculatesRRFScoreWithConfiguredWeights()
    {
        // Arrange
        _defaultSettings.VectorWeight = 0.8f;
        _defaultSettings.BM25Weight = 0.2f;
        var sut = CreateService();
        var queryEmbedding = CreateTestEmbedding();

        var vectorResults = new List<VectorSearchResult>
        {
            CreateVectorResult("id-1", "note-1", 0.95f)
        };

        var bm25Results = new List<BM25SearchResult>
        {
            CreateBM25Result("id-1", "note-1", 0.85f)
        };

        _mockVectorStore.Setup(v => v.SearchAsync(
            It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(vectorResults);

        _mockBm25Service.Setup(b => b.SearchAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(bm25Results);

        // Act
        var results = await sut.SearchAsync("test query", queryEmbedding, "user-123", 5, 0.3f);

        // Assert
        results.Should().ContainSingle();
        // RRF = vectorWeight * (1/(k+rank)) + bm25Weight * (1/(k+rank))
        // Both are rank 1, k=60
        // Expected: 0.8 * (1/61) + 0.2 * (1/61) = 1/61 ≈ 0.01639
        var expectedRRF = (0.8f / 61f) + (0.2f / 61f);
        results[0].RRFScore.Should().BeApproximately(expectedRRF, 0.001f);
    }

    [Fact]
    public async Task SearchAsync_UsesConfiguredRRFConstant()
    {
        // Arrange
        _defaultSettings.RRFConstant = 100; // Different from default 60
        var sut = CreateService();
        var queryEmbedding = CreateTestEmbedding();

        var vectorResults = new List<VectorSearchResult>
        {
            CreateVectorResult("id-1", "note-1", 0.95f)
        };

        _mockVectorStore.Setup(v => v.SearchAsync(
            It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(vectorResults);

        _mockBm25Service.Setup(b => b.SearchAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<BM25SearchResult>());

        // Act
        var results = await sut.SearchAsync("test query", queryEmbedding, "user-123", 5, 0.3f);

        // Assert
        // RRF = vectorWeight * (1/(k+rank)) = 0.7 * (1/101) ≈ 0.00693
        var expectedRRF = 0.7f / 101f;
        results[0].RRFScore.Should().BeApproximately(expectedRRF, 0.001f);
    }

    #endregion

    #region Edge Cases Tests

    [Fact]
    public async Task SearchAsync_WhenVectorReturnsEmpty_ReturnsBM25OnlyResults()
    {
        // Arrange
        var sut = CreateService();
        var queryEmbedding = CreateTestEmbedding();

        _mockVectorStore.Setup(v => v.SearchAsync(
            It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VectorSearchResult>());

        var bm25Results = CreateBM25SearchResults(3);
        _mockBm25Service.Setup(b => b.SearchAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(bm25Results);

        // Act
        var results = await sut.SearchAsync("test query", queryEmbedding, "user-123", 5, 0.3f);

        // Assert
        results.Should().HaveCount(3);
        results.Should().AllSatisfy(r =>
        {
            r.FoundInVectorSearch.Should().BeFalse();
            r.FoundInBM25Search.Should().BeTrue();
        });
    }

    [Fact]
    public async Task SearchAsync_WhenBM25ReturnsEmpty_ReturnsVectorOnlyResults()
    {
        // Arrange
        var sut = CreateService();
        var queryEmbedding = CreateTestEmbedding();

        var vectorResults = CreateVectorSearchResults(3);
        _mockVectorStore.Setup(v => v.SearchAsync(
            It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(vectorResults);

        _mockBm25Service.Setup(b => b.SearchAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<BM25SearchResult>());

        // Act
        var results = await sut.SearchAsync("test query", queryEmbedding, "user-123", 5, 0.3f);

        // Assert
        results.Should().HaveCount(3);
        results.Should().AllSatisfy(r =>
        {
            r.FoundInVectorSearch.Should().BeTrue();
            r.FoundInBM25Search.Should().BeFalse();
        });
    }

    [Fact]
    public async Task SearchAsync_WhenBothReturnEmpty_ReturnsEmptyList()
    {
        // Arrange
        var sut = CreateService();
        var queryEmbedding = CreateTestEmbedding();

        _mockVectorStore.Setup(v => v.SearchAsync(
            It.IsAny<List<double>>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VectorSearchResult>());

        _mockBm25Service.Setup(b => b.SearchAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<BM25SearchResult>());

        // Act
        var results = await sut.SearchAsync("test query", queryEmbedding, "user-123", 5, 0.3f);

        // Assert
        results.Should().BeEmpty();
    }

    #endregion

    #region Helper Methods

    private HybridSearchService CreateService()
    {
        return new HybridSearchService(
            _mockVectorStore.Object,
            _mockBm25Service.Object,
            _mockSettings.Object,
            _mockLogger.Object);
    }

    private static List<double> CreateTestEmbedding()
    {
        return Enumerable.Range(0, 1536).Select(i => (double)i * 0.001).ToList();
    }

    private static List<VectorSearchResult> CreateVectorSearchResults(int count)
    {
        return Enumerable.Range(1, count).Select(i => CreateVectorResult(string.Format("vec-id-{0}", i), string.Format("note-{0}", i), 0.95f - (i * 0.05f))).ToList();
    }

    private static VectorSearchResult CreateVectorResult(string id, string noteId, float score)
    {
        return new VectorSearchResult
        {
            Id = id,
            NoteId = noteId,
            Content = string.Format("Content for {0}", id),
            NoteTitle = string.Format("Note {0}", noteId),
            NoteTags = new List<string> { "test" },
            ChunkIndex = 0,
            SimilarityScore = score,
            Metadata = new Dictionary<string, object>()
        };
    }

    private static List<BM25SearchResult> CreateBM25SearchResults(int count)
    {
        return Enumerable.Range(1, count).Select(i => CreateBM25Result(string.Format("bm25-id-{0}", i), string.Format("note-bm25-{0}", i), 0.9f - (i * 0.05f))).ToList();
    }

    private static BM25SearchResult CreateBM25Result(string id, string noteId, float score)
    {
        return new BM25SearchResult
        {
            Id = id,
            NoteId = noteId,
            Content = string.Format("Content for {0}", id),
            NoteTitle = string.Format("Note {0}", noteId),
            NoteTags = new List<string> { "test" },
            ChunkIndex = 0,
            BM25Score = score
        };
    }

    #endregion
}
