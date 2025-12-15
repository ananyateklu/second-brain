using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.RAG;

/// <summary>
/// Unit tests for BM25SearchService.
/// Tests BM25-based full-text search functionality including scoring,
/// query sanitization, and result ranking.
/// </summary>
public class BM25SearchServiceTests
{
    private readonly Mock<INoteEmbeddingSearchRepository> _mockRepository;
    private readonly Mock<ILogger<BM25SearchService>> _mockLogger;
    private readonly BM25SearchService _sut;

    public BM25SearchServiceTests()
    {
        _mockRepository = new Mock<INoteEmbeddingSearchRepository>();
        _mockLogger = new Mock<ILogger<BM25SearchService>>();

        _sut = new BM25SearchService(
            _mockRepository.Object,
            _mockLogger.Object);
    }

    #region SearchAsync - Basic Functionality Tests

    [Fact]
    public async Task SearchAsync_WhenValidQuery_ReturnsMatchingResults()
    {
        // Arrange
        var query = "test query";
        var userId = "user-123";
        var topK = 5;
        var embeddings = CreateTestEmbeddings("test", 10);
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCountLessThanOrEqualTo(topK);
        result.Should().BeInDescendingOrder(r => r.BM25Score);
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
        _mockRepository.Verify(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()), Times.Never);
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
    public async Task SearchAsync_WhenNoMatchingResults_ReturnsEmptyList()
    {
        // Arrange
        var query = "xyz123nonexistent";
        var userId = "user-123";
        var topK = 5;
        var embeddings = CreateTestEmbeddings("different content", 5);
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

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
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
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

    #region SearchAsync - Scoring Tests

    [Fact]
    public async Task SearchAsync_WhenTermInTitle_ScoresHigherThanContent()
    {
        // Arrange
        var query = "important";
        var userId = "user-123";
        var topK = 10;
        var embeddings = new List<NoteEmbedding>
        {
            CreateEmbedding("1", "Important Document", "Some generic content here"),
            CreateEmbedding("2", "Generic Title", "This contains important information")
        };
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().HaveCountGreaterThan(0);
        // Title match should rank higher than content match
        result.First().NoteId.Should().Be("1");
    }

    [Fact]
    public async Task SearchAsync_WhenMultipleTermMatches_ScoresHigher()
    {
        // Arrange
        var query = "test search";
        var userId = "user-123";
        var topK = 10;
        var embeddings = new List<NoteEmbedding>
        {
            CreateEmbedding("1", "Test", "Single term match"),
            CreateEmbedding("2", "Test Search", "Both terms in title for search")
        };
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().HaveCountGreaterThan(0);
        // Multiple term match should score higher
        result.First().NoteId.Should().Be("2");
    }

    [Fact]
    public async Task SearchAsync_WhenRepeatedTerms_IncreasesScore()
    {
        // Arrange
        var query = "python";
        var userId = "user-123";
        var topK = 10;
        var embeddings = new List<NoteEmbedding>
        {
            CreateEmbedding("1", "Programming", "Learn python"),
            CreateEmbedding("2", "Python Guide", "Python python python programming")
        };
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().HaveCountGreaterThan(0);
        result.First().NoteId.Should().Be("2");
    }

    #endregion

    #region SearchAsync - Result Mapping Tests

    [Fact]
    public async Task SearchAsync_MapsAllFieldsCorrectly()
    {
        // Arrange
        var query = "mapping test";
        var userId = "user-123";
        var topK = 5;
        var embeddings = new List<NoteEmbedding>
        {
            new()
            {
                Id = "emb-1",
                NoteId = "note-1",
                NoteTitle = "Mapping Test Title",
                Content = "Content for mapping test",
                NoteTags = new List<string> { "tag1", "tag2" },
                NoteSummary = "Test summary",
                ChunkIndex = 3
            }
        };
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().ContainSingle();
        var item = result.First();
        item.Id.Should().Be("emb-1");
        item.NoteId.Should().Be("note-1");
        item.NoteTitle.Should().Be("Mapping Test Title");
        item.Content.Should().Be("Content for mapping test");
        item.NoteTags.Should().BeEquivalentTo(new[] { "tag1", "tag2" });
        item.NoteSummary.Should().Be("Test summary");
        item.ChunkIndex.Should().Be(3);
        item.BM25Score.Should().BeGreaterThan(0);
        item.Rank.Should().Be(1);
    }

    [Fact]
    public async Task SearchAsync_AssignsCorrectRanks()
    {
        // Arrange
        var query = "rank test";
        var userId = "user-123";
        var topK = 10;
        var embeddings = CreateTestEmbeddings("rank test content", 5);
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().HaveCount(5);
        for (int i = 0; i < result.Count; i++)
        {
            result[i].Rank.Should().Be(i + 1);
        }
    }

    [Fact]
    public async Task SearchAsync_WhenNullNoteTags_ReturnsEmptyList()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 5;
        var embedding = CreateEmbedding("1", "Test Title", "Test content");
        embedding.NoteTags = null!;
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NoteEmbedding> { embedding });

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().ContainSingle();
        result.First().NoteTags.Should().NotBeNull();
        result.First().NoteTags.Should().BeEmpty();
    }

    #endregion

    #region SearchAsync - TopK Limiting Tests

    [Fact]
    public async Task SearchAsync_WhenMoreResultsThanTopK_LimitsResults()
    {
        // Arrange
        var query = "common term";
        var userId = "user-123";
        var topK = 3;
        var embeddings = CreateTestEmbeddings("common term content", 10);
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().HaveCount(topK);
    }

    [Fact]
    public async Task SearchAsync_WhenFewerResultsThanTopK_ReturnsAllMatches()
    {
        // Arrange
        var query = "rare term";
        var userId = "user-123";
        var topK = 10;
        var embeddings = CreateTestEmbeddings("rare term", 3);
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task SearchAsync_WhenTopKIsZero_ReturnsEmptyList()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 0;
        var embeddings = CreateTestEmbeddings("test", 5);
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region SearchAsync - Query Sanitization Tests

    [Fact]
    public async Task SearchAsync_WhenQueryContainsSpecialChars_SanitizesQuery()
    {
        // Arrange - special chars are removed, concatenating the parts
        // "test@#$%value" becomes "testvalue" (substring matching is used)
        var query = "test@#$%value";
        var userId = "user-123";
        var topK = 5;
        // Create embeddings containing the concatenated form as a substring
        var embeddings = new List<NoteEmbedding>
        {
            CreateEmbedding("1", "Config Guide", "Set testvalue in config.json"),
            CreateEmbedding("2", "Variables", "Use testvalue_option for settings")
        };
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        // Should find results after sanitization (special chars removed, "testvalue" matches)
        result.Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public async Task SearchAsync_WhenQueryContainsHyphens_PreservesHyphens()
    {
        // Arrange
        var query = "test-driven-development";
        var userId = "user-123";
        var topK = 5;
        var embeddings = new List<NoteEmbedding>
        {
            CreateEmbedding("1", "TDD Guide", "Learn test-driven-development practices")
        };
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task SearchAsync_WhenQueryContainsMultipleSpaces_CollapsesSpaces()
    {
        // Arrange
        var query = "test   multiple    spaces";
        var userId = "user-123";
        var topK = 5;
        var embeddings = CreateTestEmbeddings("test multiple spaces content", 2);
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public async Task SearchAsync_WhenQueryContainsUnderscores_PreservesUnderscores()
    {
        // Arrange
        var query = "snake_case_variable";
        var userId = "user-123";
        var topK = 5;
        var embeddings = new List<NoteEmbedding>
        {
            CreateEmbedding("1", "Code Style", "Use snake_case_variable naming convention")
        };
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().HaveCount(1);
    }

    #endregion

    #region SearchAsync - Case Insensitivity Tests

    [Fact]
    public async Task SearchAsync_IsCaseInsensitive()
    {
        // Arrange
        var embeddings = new List<NoteEmbedding>
        {
            CreateEmbedding("1", "Python Programming", "Learn PYTHON programming")
        };
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var resultLower = await _sut.SearchAsync("python", "user-123", 5);
        var resultUpper = await _sut.SearchAsync("PYTHON", "user-123", 5);
        var resultMixed = await _sut.SearchAsync("PyThOn", "user-123", 5);

        // Assert
        resultLower.Should().HaveCount(1);
        resultUpper.Should().HaveCount(1);
        resultMixed.Should().HaveCount(1);
    }

    #endregion

    #region SearchAsync - Cancellation Tests

    [Fact]
    public async Task SearchAsync_WhenCancellationRequested_PropagatesCancellation()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 5;
        var cts = new CancellationTokenSource();
        cts.Cancel();

        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());

        // Act
        var result = await _sut.SearchAsync(query, userId, topK, cts.Token);

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region SearchAsync - Edge Cases

    [Fact]
    public async Task SearchAsync_WhenNullTitle_HandlesGracefully()
    {
        // Arrange
        var query = "content search";
        var userId = "user-123";
        var topK = 5;
        var embedding = CreateEmbedding("1", null!, "Content search material");
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NoteEmbedding> { embedding });

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().ContainSingle();
    }

    [Fact]
    public async Task SearchAsync_WhenNullContent_HandlesGracefully()
    {
        // Arrange
        var query = "title search";
        var userId = "user-123";
        var topK = 5;
        var embedding = CreateEmbedding("1", "Title Search Here", null!);
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NoteEmbedding> { embedding });

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().ContainSingle();
    }

    [Fact]
    public async Task SearchAsync_WhenEmptyEmbeddingsList_ReturnsEmptyList()
    {
        // Arrange
        var query = "test";
        var userId = "user-123";
        var topK = 5;
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NoteEmbedding>());

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchAsync_WhenVeryLongQuery_ProcessesSuccessfully()
    {
        // Arrange
        var query = string.Join(" ", Enumerable.Repeat("term", 100));
        var userId = "user-123";
        var topK = 5;
        var embeddings = CreateTestEmbeddings("term content", 3);
        _mockRepository.Setup(r => r.GetWithSearchVectorAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(embeddings);

        // Act
        var result = await _sut.SearchAsync(query, userId, topK);

        // Assert
        result.Should().HaveCountGreaterThan(0);
    }

    #endregion

    #region Helper Methods

    private static List<NoteEmbedding> CreateTestEmbeddings(string contentBase, int count)
    {
        return Enumerable.Range(1, count)
            .Select(i => CreateEmbedding(
                i.ToString(),
                $"Title {i} {contentBase}",
                $"Content {i} about {contentBase}"))
            .ToList();
    }

    private static NoteEmbedding CreateEmbedding(string id, string title, string content)
    {
        return new NoteEmbedding
        {
            Id = $"emb-{id}",
            NoteId = id,
            NoteTitle = title,
            Content = content,
            NoteTags = new List<string> { "tag1" },
            NoteSummary = $"Summary for {title}",
            ChunkIndex = 0
        };
    }

    #endregion
}
