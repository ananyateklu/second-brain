using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.RAG;

/// <summary>
/// Unit tests for NativeHybridSearchService.
/// Tests native PostgreSQL hybrid search combining vector and BM25 with RRF.
/// </summary>
public class NativeHybridSearchServiceTests
{
    private readonly Mock<INoteEmbeddingSearchRepository> _mockRepository;
    private readonly Mock<ILogger<NativeHybridSearchService>> _mockLogger;
    private readonly RagSettings _settings;
    private readonly NativeHybridSearchService _sut;

    public NativeHybridSearchServiceTests()
    {
        _mockRepository = new Mock<INoteEmbeddingSearchRepository>();
        _mockLogger = new Mock<ILogger<NativeHybridSearchService>>();
        _settings = new RagSettings
        {
            EnableHybridSearch = true,
            VectorWeight = 0.7f,
            BM25Weight = 0.3f,
            RRFConstant = 60,
            InitialRetrievalCount = 20
        };

        var options = Options.Create(_settings);
        _sut = new NativeHybridSearchService(
            _mockRepository.Object,
            options,
            _mockLogger.Object);
    }

    #region SearchAsync - Basic Functionality Tests

    [Fact]
    public async Task SearchAsync_WhenValidInputs_ReturnsResults()
    {
        // Arrange
        var query = "test query";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;
        var nativeResults = CreateNativeHybridResults(3);
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                query, embedding, userId, topK, It.IsAny<int>(),
                _settings.VectorWeight, _settings.BM25Weight, _settings.RRFConstant,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(nativeResults);

        // Act
        var result = await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task SearchAsync_WhenEmptyQuery_ReturnsEmptyList()
    {
        // Arrange
        var query = "";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;

        // Act
        var result = await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        result.Should().BeEmpty();
        _mockRepository.Verify(r => r.SearchWithNativeHybridAsync(
            It.IsAny<string>(), It.IsAny<List<double>>(), It.IsAny<string>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<float>(), It.IsAny<float>(),
            It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SearchAsync_WhenWhitespaceQuery_ReturnsEmptyList()
    {
        // Arrange
        var query = "   ";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;

        // Act
        var result = await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchAsync_WhenNullEmbedding_ReturnsEmptyList()
    {
        // Arrange
        var query = "test";
        List<double>? embedding = null;
        var userId = "user-123";
        var topK = 5;

        // Act
        var result = await _sut.SearchAsync(query, embedding!, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchAsync_WhenEmptyEmbedding_ReturnsEmptyList()
    {
        // Arrange
        var query = "test";
        var embedding = new List<double>();
        var userId = "user-123";
        var topK = 5;

        // Act
        var result = await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region SearchAsync - Hybrid Search Disabled Tests

    [Fact]
    public async Task SearchAsync_WhenHybridSearchDisabled_UsesVectorOnlySearch()
    {
        // Arrange
        var disabledSettings = new RagSettings
        {
            EnableHybridSearch = false,
            VectorWeight = 0.7f,
            BM25Weight = 0.3f,
            RRFConstant = 60
        };
        var options = Options.Create(disabledSettings);
        var sut = new NativeHybridSearchService(
            _mockRepository.Object,
            options,
            _mockLogger.Object);

        var query = "test";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;
        var nativeResults = CreateNativeHybridResults(2);
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                "", embedding, userId, topK, topK,
                1.0f, 0.0f, It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(nativeResults);

        // Act
        var result = await sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        result.Should().HaveCount(2);
        _mockRepository.Verify(r => r.SearchWithNativeHybridAsync(
            "", embedding, userId, topK, topK,
            1.0f, 0.0f, It.IsAny<int>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region SearchAsync - Result Mapping Tests

    [Fact]
    public async Task SearchAsync_MapsAllFieldsCorrectly()
    {
        // Arrange
        var query = "test";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;
        var nativeResult = new NativeHybridSearchResult
        {
            Id = "emb-1",
            NoteId = "note-1",
            NoteTitle = "Test Title",
            Content = "Test content",
            NoteTags = new List<string> { "tag1", "tag2" },
            NoteSummary = "Test summary",
            ChunkIndex = 2,
            VectorScore = 0.85f,
            BM25Score = 0.75f,
            VectorRank = 1,
            BM25Rank = 2,
            RRFScore = 0.8f,
            FoundInVectorSearch = true,
            FoundInBM25Search = true
        };
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                query, embedding, userId, topK, It.IsAny<int>(),
                It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeHybridSearchResult> { nativeResult });

        // Act
        var result = await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        result.Should().ContainSingle();
        var item = result.First();
        item.Id.Should().Be("emb-1");
        item.NoteId.Should().Be("note-1");
        item.NoteTitle.Should().Be("Test Title");
        item.Content.Should().Be("Test content");
        item.NoteTags.Should().BeEquivalentTo(new[] { "tag1", "tag2" });
        item.NoteSummary.Should().Be("Test summary");
        item.ChunkIndex.Should().Be(2);
        item.VectorScore.Should().Be(0.85f);
        item.BM25Score.Should().Be(0.75f);
        item.VectorRank.Should().Be(1);
        item.BM25Rank.Should().Be(2);
        item.RRFScore.Should().Be(0.8f);
        item.FoundInVectorSearch.Should().BeTrue();
        item.FoundInBM25Search.Should().BeTrue();
    }

    [Fact]
    public async Task SearchAsync_AddsSearchTypeMetadata()
    {
        // Arrange
        var query = "test";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;
        var nativeResult = new NativeHybridSearchResult
        {
            Id = "emb-1",
            NoteId = "note-1",
            NoteTitle = "Test",
            Content = "Content",
            NoteTags = new List<string>(),
            ChunkIndex = 0,
            VectorScore = 0.8f,
            BM25Score = 0.7f,
            VectorRank = 1,
            BM25Rank = 2,
            RRFScore = 0.75f,
            FoundInVectorSearch = true,
            FoundInBM25Search = true
        };
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                query, embedding, userId, topK, It.IsAny<int>(),
                It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeHybridSearchResult> { nativeResult });

        // Act
        var result = await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        result.Should().ContainSingle();
        result.First().Metadata.Should().ContainKey("searchType");
        result.First().Metadata["searchType"].Should().Be("native_hybrid");
    }

    #endregion

    #region SearchAsync - Initial Retrieval Count Tests

    [Fact]
    public async Task SearchAsync_CalculatesInitialRetrievalCountCorrectly()
    {
        // Arrange
        var query = "test";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;
        var expectedInitialCount = Math.Max(topK * 3, _settings.InitialRetrievalCount);

        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                query, embedding, userId, topK, expectedInitialCount,
                It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeHybridSearchResult>());

        // Act
        await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        _mockRepository.Verify(r => r.SearchWithNativeHybridAsync(
            query, embedding, userId, topK, expectedInitialCount,
            It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SearchAsync_UsesConfiguredInitialRetrievalCountWhenLarger()
    {
        // Arrange
        var highInitialCount = new RagSettings
        {
            EnableHybridSearch = true,
            VectorWeight = 0.7f,
            BM25Weight = 0.3f,
            RRFConstant = 60,
            InitialRetrievalCount = 100
        };
        var options = Options.Create(highInitialCount);
        var sut = new NativeHybridSearchService(
            _mockRepository.Object,
            options,
            _mockLogger.Object);

        var query = "test";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;

        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                query, embedding, userId, topK, 100,
                It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeHybridSearchResult>());

        // Act
        await sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        _mockRepository.Verify(r => r.SearchWithNativeHybridAsync(
            query, embedding, userId, topK, 100,
            It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region SearchAsync - Weight Configuration Tests

    [Fact]
    public async Task SearchAsync_PassesConfiguredWeightsToRepository()
    {
        // Arrange
        var customSettings = new RagSettings
        {
            EnableHybridSearch = true,
            VectorWeight = 0.8f,
            BM25Weight = 0.2f,
            RRFConstant = 70,
            InitialRetrievalCount = 20
        };
        var options = Options.Create(customSettings);
        var sut = new NativeHybridSearchService(
            _mockRepository.Object,
            options,
            _mockLogger.Object);

        var query = "test";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;

        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                query, embedding, userId, topK, It.IsAny<int>(),
                0.8f, 0.2f, 70,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeHybridSearchResult>());

        // Act
        await sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        _mockRepository.Verify(r => r.SearchWithNativeHybridAsync(
            query, embedding, userId, topK, It.IsAny<int>(),
            0.8f, 0.2f, 70,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region IsAvailableAsync Tests

    [Fact]
    public async Task IsAvailableAsync_WhenRepositorySucceeds_ReturnsTrue()
    {
        // Arrange
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                "test", It.IsAny<List<double>>(), "test-availability-check",
                1, 1, It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeHybridSearchResult>());

        // Act
        var result = await _sut.IsAvailableAsync();

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsAvailableAsync_WhenRepositoryThrows_ReturnsFalse()
    {
        // Arrange
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                "test", It.IsAny<List<double>>(), "test-availability-check",
                1, 1, It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database unavailable"));

        // Act
        var result = await _sut.IsAvailableAsync();

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsAvailableAsync_PassesCancellationToken()
    {
        // Arrange
        var cts = new CancellationTokenSource();
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                "test", It.IsAny<List<double>>(), "test-availability-check",
                1, 1, It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                cts.Token))
            .ReturnsAsync(new List<NativeHybridSearchResult>());

        // Act
        await _sut.IsAvailableAsync(cts.Token);

        // Assert
        _mockRepository.Verify(r => r.SearchWithNativeHybridAsync(
            "test", It.IsAny<List<double>>(), "test-availability-check",
            1, 1, It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
            cts.Token), Times.Once);
    }

    [Fact]
    public async Task IsAvailableAsync_UsesZeroVectorForCheck()
    {
        // Arrange
        List<double>? capturedEmbedding = null;
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                "test", It.IsAny<List<double>>(), "test-availability-check",
                1, 1, It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, List<double>, string, int, int, float, float, int, CancellationToken>(
                (q, e, u, t, i, vw, bw, rrf, ct) => capturedEmbedding = e)
            .ReturnsAsync(new List<NativeHybridSearchResult>());

        // Act
        await _sut.IsAvailableAsync();

        // Assert
        capturedEmbedding.Should().NotBeNull();
        capturedEmbedding.Should().HaveCount(1536);
        capturedEmbedding!.Should().OnlyContain(v => v == 0.0);
    }

    #endregion

    #region Logging Tests

    [Fact]
    public async Task SearchAsync_LogsSearchStart()
    {
        // Arrange
        var query = "test query for logging";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                query, embedding, userId, topK, It.IsAny<int>(),
                It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeHybridSearchResult>());

        // Act
        await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Starting native hybrid search")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SearchAsync_LogsCompletionWithResultCount()
    {
        // Arrange
        var query = "test";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;
        var nativeResults = CreateNativeHybridResults(3);
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                query, embedding, userId, topK, It.IsAny<int>(),
                It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(nativeResults);

        // Act
        await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("completed")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SearchAsync_WhenEmptyQuery_LogsWarning()
    {
        // Arrange
        var query = "";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;

        // Act
        await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("empty query")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SearchAsync_WhenEmptyEmbedding_LogsWarning()
    {
        // Arrange
        var query = "test";
        var embedding = new List<double>();
        var userId = "user-123";
        var topK = 5;

        // Act
        await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("empty embedding")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task SearchAsync_WhenLongQuery_TruncatesForLogging()
    {
        // Arrange
        var query = new string('a', 200);
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                query, embedding, userId, topK, It.IsAny<int>(),
                It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeHybridSearchResult>());

        // Act & Assert - should not throw
        await _sut.SearchAsync(query, embedding, userId, topK);
    }

    [Fact]
    public async Task SearchAsync_WhenNoResults_ReturnsEmptyList()
    {
        // Arrange
        var query = "test";
        var embedding = CreateTestEmbedding();
        var userId = "user-123";
        var topK = 5;
        _mockRepository.Setup(r => r.SearchWithNativeHybridAsync(
                query, embedding, userId, topK, It.IsAny<int>(),
                It.IsAny<float>(), It.IsAny<float>(), It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeHybridSearchResult>());

        // Act
        var result = await _sut.SearchAsync(query, embedding, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region Helper Methods

    private static List<double> CreateTestEmbedding(int dimensions = 1536)
    {
        return Enumerable.Range(0, dimensions)
            .Select(i => (double)i / dimensions)
            .ToList();
    }

    private static List<NativeHybridSearchResult> CreateNativeHybridResults(int count)
    {
        return Enumerable.Range(1, count)
            .Select(i => new NativeHybridSearchResult
            {
                Id = $"emb-{i}",
                NoteId = $"note-{i}",
                NoteTitle = $"Title {i}",
                Content = $"Content {i}",
                NoteTags = new List<string> { "tag1" },
                ChunkIndex = 0,
                VectorScore = 1.0f - (i * 0.1f),
                BM25Score = 0.9f - (i * 0.1f),
                VectorRank = i,
                BM25Rank = i,
                RRFScore = 0.8f - (i * 0.05f),
                FoundInVectorSearch = true,
                FoundInBM25Search = true
            })
            .ToList();
    }

    #endregion
}
