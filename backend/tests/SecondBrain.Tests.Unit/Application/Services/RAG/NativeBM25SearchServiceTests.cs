using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.RAG;

/// <summary>
/// Unit tests for NativeBM25SearchService.
/// Tests native PostgreSQL BM25 search using ts_rank_cd for full-text ranking.
/// </summary>
public class NativeBM25SearchServiceTests
{
    private readonly Mock<INoteEmbeddingSearchRepository> _mockRepository;
    private readonly Mock<ILogger<NativeBM25SearchService>> _mockLogger;
    private readonly NativeBM25SearchService _sut;

    public NativeBM25SearchServiceTests()
    {
        _mockRepository = new Mock<INoteEmbeddingSearchRepository>();
        _mockLogger = new Mock<ILogger<NativeBM25SearchService>>();

        _sut = new NativeBM25SearchService(
            _mockRepository.Object,
            _mockLogger.Object);
    }

    #region SearchAsync - Basic Functionality Tests

    [Fact]
    public async Task SearchAsync_WhenValidQuery_ReturnsResults()
    {
        // Arrange
        var query = "test query";
        var userId = "user-123";
        var topK = 5;
        var nativeResults = CreateNativeResults(3);
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nativeResults);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task SearchAsync_WhenEmptyQuery_ReturnsEmptyList()
    {
        // Arrange
        var query = "";
        var userId = "user-123";
        var topK = 5;

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().BeEmpty();
        _mockRepository.Verify(r => r.SearchWithNativeBM25Async(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(),
            It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SearchAsync_WhenWhitespaceQuery_ReturnsEmptyList()
    {
        // Arrange
        var query = "   ";
        var userId = "user-123";
        var topK = 5;

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchAsync_WhenNullQuery_ReturnsEmptyList()
    {
        // Arrange
        string? query = null;
        var userId = "user-123";
        var topK = 5;

        // Act
        var result = await _sut.SearchAsync(query!, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchAsync_WhenExceptionThrown_ReturnsEmptyListAndLogsError()
    {
        // Arrange
        var query = "test query";
        var userId = "user-123";
        var topK = 5;
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, false, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().BeEmpty();
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => true),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region SearchAsync - Result Mapping Tests

    [Fact]
    public async Task SearchAsync_MapsAllFieldsCorrectly()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 5;
        var nativeResult = new NativeBM25Result
        {
            Id = "emb-1",
            NoteId = "note-1",
            NoteTitle = "Test Title",
            Content = "Test content",
            NoteTags = new List<string> { "tag1", "tag2" },
            ChunkIndex = 2,
            BM25Score = 0.85f
        };
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeBM25Result> { nativeResult });

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().ContainSingle();
        var item = result.First();
        item.Id.Should().Be("emb-1");
        item.NoteId.Should().Be("note-1");
        item.NoteTitle.Should().Be("Test Title");
        item.Content.Should().Be("Test content");
        item.NoteTags.Should().BeEquivalentTo(new[] { "tag1", "tag2" });
        item.ChunkIndex.Should().Be(2);
        item.BM25Score.Should().Be(0.85f);
        item.Rank.Should().Be(1);
    }

    [Fact]
    public async Task SearchAsync_AssignsCorrectRanks()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 10;
        var nativeResults = CreateNativeResults(5);
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nativeResults);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().HaveCount(5);
        for (int i = 0; i < result.Count; i++)
        {
            result[i].Rank.Should().Be(i + 1);
        }
    }

    #endregion

    #region SearchAsync - Repository Interaction Tests

    [Fact]
    public async Task SearchAsync_PassesCorrectParametersToRepository()
    {
        // Arrange
        var query = "search term";
        var userId = "user-456";
        var topK = 7;
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeBM25Result>());

        // Act
        await _sut.SearchAsync(query, userId, topK);

        // Assert
        _mockRepository.Verify(r => r.SearchWithNativeBM25Async(
            query, userId, topK, false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SearchAsync_PassesCancellationToken()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 5;
        var cts = new CancellationTokenSource();
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, false, cts.Token))
            .ReturnsAsync(new List<NativeBM25Result>());

        // Act
        await _sut.SearchAsync(query, userId, topK, cts.Token);

        // Assert
        _mockRepository.Verify(r => r.SearchWithNativeBM25Async(
            query, userId, topK, false, cts.Token), Times.Once);
    }

    #endregion

    #region SearchWithHighlightAsync - Basic Functionality Tests

    [Fact]
    public async Task SearchWithHighlightAsync_WhenValidQuery_ReturnsResultsWithHighlights()
    {
        // Arrange
        var query = "test query";
        var userId = "user-123";
        var topK = 5;
        var nativeResults = new List<NativeBM25Result>
        {
            new()
            {
                Id = "emb-1",
                NoteId = "note-1",
                NoteTitle = "Test Title",
                Content = "Test content",
                NoteTags = new List<string>(),
                ChunkIndex = 0,
                BM25Score = 0.8f,
                HighlightedContent = "<mark>test</mark> content with highlights"
            }
        };
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nativeResults);

        // Act
        var result = await _sut.SearchWithHighlightAsync(query, userId, topK);

        // Assert
        result.Should().ContainSingle();
        result.First().HighlightedContent.Should().Contain("<mark>");
    }

    [Fact]
    public async Task SearchWithHighlightAsync_WhenEmptyQuery_ReturnsEmptyList()
    {
        // Arrange
        var query = "";
        var userId = "user-123";
        var topK = 5;

        // Act
        var result = await _sut.SearchWithHighlightAsync(query, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchWithHighlightAsync_WhenWhitespaceQuery_ReturnsEmptyList()
    {
        // Arrange
        var query = "   ";
        var userId = "user-123";
        var topK = 5;

        // Act
        var result = await _sut.SearchWithHighlightAsync(query, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchWithHighlightAsync_WhenNullQuery_ReturnsEmptyList()
    {
        // Arrange
        string? query = null;
        var userId = "user-123";
        var topK = 5;

        // Act
        var result = await _sut.SearchWithHighlightAsync(query!, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchWithHighlightAsync_WhenExceptionThrown_ReturnsEmptyList()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 5;
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, true, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.SearchWithHighlightAsync(query, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region SearchWithHighlightAsync - Result Mapping Tests

    [Fact]
    public async Task SearchWithHighlightAsync_MapsAllFieldsIncludingHighlight()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 5;
        var nativeResult = new NativeBM25Result
        {
            Id = "emb-1",
            NoteId = "note-1",
            NoteTitle = "Test Title",
            Content = "Original content",
            NoteTags = new List<string> { "tag1" },
            ChunkIndex = 1,
            BM25Score = 0.9f,
            HighlightedContent = "<mark>test</mark> highlighted"
        };
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeBM25Result> { nativeResult });

        // Act
        var result = await _sut.SearchWithHighlightAsync(query, userId, topK);

        // Assert
        result.Should().ContainSingle();
        var item = result.First();
        item.Id.Should().Be("emb-1");
        item.NoteId.Should().Be("note-1");
        item.Content.Should().Be("Original content");
        item.HighlightedContent.Should().Be("<mark>test</mark> highlighted");
    }

    [Fact]
    public async Task SearchWithHighlightAsync_WhenNullHighlightedContent_ReturnsEmptyString()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 5;
        var nativeResult = new NativeBM25Result
        {
            Id = "emb-1",
            NoteId = "note-1",
            NoteTitle = "Test",
            Content = "Content",
            NoteTags = new List<string>(),
            ChunkIndex = 0,
            BM25Score = 0.5f,
            HighlightedContent = null
        };
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeBM25Result> { nativeResult });

        // Act
        var result = await _sut.SearchWithHighlightAsync(query, userId, topK);

        // Assert
        result.Should().ContainSingle();
        result.First().HighlightedContent.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchWithHighlightAsync_AssignsCorrectRanks()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 10;
        var nativeResults = CreateNativeResultsWithHighlights(4);
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nativeResults);

        // Act
        var result = await _sut.SearchWithHighlightAsync(query, userId, topK);

        // Assert
        result.Should().HaveCount(4);
        for (int i = 0; i < result.Count; i++)
        {
            result[i].Rank.Should().Be(i + 1);
        }
    }

    #endregion

    #region SearchWithHighlightAsync - Repository Interaction Tests

    [Fact]
    public async Task SearchWithHighlightAsync_RequestsHighlightsFromRepository()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 5;
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeBM25Result>());

        // Act
        await _sut.SearchWithHighlightAsync(query, userId, topK);

        // Assert
        _mockRepository.Verify(r => r.SearchWithNativeBM25Async(
            query, userId, topK, true, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region Logging Tests

    [Fact]
    public async Task SearchAsync_LogsSearchStart()
    {
        // Arrange
        var query = "test query";
        var userId = "user-123";
        var topK = 5;
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NativeBM25Result>());

        // Act
        await _sut.SearchAsync(query, userId, topK);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Starting native BM25 search")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SearchAsync_LogsSearchCompletion()
    {
        // Arrange
        var query = "test query";
        var userId = "user-123";
        var topK = 5;
        var nativeResults = CreateNativeResults(3);
        _mockRepository.Setup(r => r.SearchWithNativeBM25Async(
                query, userId, topK, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nativeResults);

        // Act
        await _sut.SearchAsync(query, userId, topK);

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

    #endregion

    #region Helper Methods

    private static List<NativeBM25Result> CreateNativeResults(int count)
    {
        return Enumerable.Range(1, count)
            .Select(i => new NativeBM25Result
            {
                Id = $"emb-{i}",
                NoteId = $"note-{i}",
                NoteTitle = $"Title {i}",
                Content = $"Content {i}",
                NoteTags = new List<string> { "tag1" },
                ChunkIndex = 0,
                BM25Score = 1.0f - (i * 0.1f)
            })
            .ToList();
    }

    private static List<NativeBM25Result> CreateNativeResultsWithHighlights(int count)
    {
        return Enumerable.Range(1, count)
            .Select(i => new NativeBM25Result
            {
                Id = $"emb-{i}",
                NoteId = $"note-{i}",
                NoteTitle = $"Title {i}",
                Content = $"Content {i}",
                NoteTags = new List<string> { "tag1" },
                ChunkIndex = 0,
                BM25Score = 1.0f - (i * 0.1f),
                HighlightedContent = $"<mark>highlighted</mark> content {i}"
            })
            .ToList();
    }

    #endregion
}
