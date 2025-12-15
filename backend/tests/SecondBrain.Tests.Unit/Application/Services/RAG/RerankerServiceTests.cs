using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.RAG;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.RAG;

/// <summary>
/// Unit tests for RerankerService.
/// Tests LLM-based relevance scoring and result reranking.
/// </summary>
public class RerankerServiceTests
{
    private readonly Mock<IAIProviderFactory> _mockAIProviderFactory;
    private readonly Mock<IAIProvider> _mockAIProvider;
    private readonly Mock<IStructuredOutputService> _mockStructuredOutput;
    private readonly Mock<IOptions<RagSettings>> _mockSettings;
    private readonly Mock<ILogger<RerankerService>> _mockLogger;

    private readonly RagSettings _defaultSettings;

    public RerankerServiceTests()
    {
        _mockAIProviderFactory = new Mock<IAIProviderFactory>();
        _mockAIProvider = new Mock<IAIProvider>();
        _mockStructuredOutput = new Mock<IStructuredOutputService>();
        _mockSettings = new Mock<IOptions<RagSettings>>();
        _mockLogger = new Mock<ILogger<RerankerService>>();

        _defaultSettings = new RagSettings
        {
            EnableReranking = true,
            RerankingProvider = "OpenAI",
            MinRerankScore = 3.0f,
            LogDetailedMetrics = false
        };

        _mockSettings.Setup(s => s.Value).Returns(_defaultSettings);
        _mockAIProviderFactory.Setup(f => f.GetProvider(It.IsAny<string>())).Returns(_mockAIProvider.Object);
    }

    #region RerankAsync Tests - Basic Functionality

    [Fact]
    public async Task RerankAsync_WhenNoResults_ReturnsEmptyList()
    {
        // Arrange
        var sut = CreateService();
        var emptyResults = new List<HybridSearchResult>();

        // Act
        var result = await sut.RerankAsync("test query", emptyResults, 5);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task RerankAsync_WhenRerankingDisabled_ReturnsUnrankedResults()
    {
        // Arrange
        _defaultSettings.EnableReranking = false;
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(3);

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 3);

        // Assert
        result.Should().HaveCount(3);
        result.Should().AllSatisfy(r => r.WasReranked.Should().BeFalse());
        _mockAIProvider.Verify(p => p.GenerateCompletionAsync(
            It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RerankAsync_WhenProviderUnavailable_ReturnsUnrankedResults()
    {
        // Arrange
        _mockAIProviderFactory.Setup(f => f.GetProvider(It.IsAny<string>())).Returns((IAIProvider?)null);
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(3);

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 3);

        // Assert
        result.Should().HaveCount(3);
        result.Should().AllSatisfy(r => r.WasReranked.Should().BeFalse());
    }

    [Fact]
    public async Task RerankAsync_SortsResultsByRelevanceScore()
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(3);

        // Setup AI to return different scores
        var scoreResponses = new Queue<string>(new[] { "7", "9", "5" });
        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new AIResponse { Success = true, Content = scoreResponses.Dequeue() });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 3);

        // Assert - Should be sorted by relevance score (descending)
        result.Should().HaveCount(3);
        for (int i = 1; i < result.Count; i++)
        {
            result[i - 1].RelevanceScore.Should().BeGreaterThanOrEqualTo(result[i].RelevanceScore);
        }
    }

    [Fact]
    public async Task RerankAsync_RespectsTopKLimit()
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(10);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "7" });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert
        result.Should().HaveCountLessThanOrEqualTo(5);
    }

    [Fact]
    public async Task RerankAsync_FiltersResultsBelowMinScore()
    {
        // Arrange
        _defaultSettings.MinRerankScore = 5.0f;
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(3);

        // Return scores below threshold
        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "2" });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert - All results below min score should be filtered
        result.Should().BeEmpty();
    }

    #endregion

    #region Score Parsing Tests

    [Theory]
    [InlineData("7", 7.0f)]
    [InlineData("8.5", 8.5f)]
    [InlineData("10", 10.0f)]
    [InlineData("4", 4.0f)]
    public async Task RerankAsync_ParsesValidScores(string response, float expectedScore)
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(1);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = response });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert - Note: Results with scores below MinRerankScore (3.0) would be filtered
        result.Should().ContainSingle();
        result[0].RelevanceScore.Should().Be(expectedScore);
    }

    [Theory]
    [InlineData("The relevance score is 8")]
    [InlineData("Score: 8")]
    [InlineData("8/10")]
    public async Task RerankAsync_ExtractsScoreFromText(string response)
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(1);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = response });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert - Should extract 8 from various formats
        result[0].RelevanceScore.Should().Be(8.0f);
    }

    [Fact]
    public async Task RerankAsync_ClampsScoreToValidRange()
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(2);

        var responses = new Queue<string>(new[] { "15", "-3" }); // Out of range values
        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new AIResponse { Success = true, Content = responses.Dequeue() });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert - Scores should be clamped to 0-10
        result.Should().AllSatisfy(r =>
        {
            r.RelevanceScore.Should().BeInRange(0, 10);
        });
    }

    [Fact]
    public async Task RerankAsync_WhenCannotParseScore_ReturnsNeutralScore()
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(1);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "This document is relevant" }); // No number

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert - Should return neutral score of 5
        result[0].RelevanceScore.Should().Be(5.0f);
    }

    #endregion

    #region Structured Output Tests

    [Fact]
    public async Task RerankAsync_WithStructuredOutput_FallsBackToTextScoring()
    {
        // Arrange - When structured output is provided but returns null, falls back to text parsing
        var sut = CreateServiceWithStructuredOutput();
        var hybridResults = CreateHybridSearchResults(1);

        // Structured output returns null (not supported by provider)
        _mockStructuredOutput.Setup(s => s.GenerateAsync<RelevanceScoreResult>(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RelevanceScoreResult?)null);

        // Falls back to AI provider text completion
        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "8" });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert - Should parse score from text response
        result.Should().ContainSingle();
        result[0].RelevanceScore.Should().BeGreaterThanOrEqualTo(5.0f);
    }

    [Fact]
    public async Task RerankAsync_WhenStructuredOutputFails_FallsBackToTextParsing()
    {
        // Arrange
        var sut = CreateServiceWithStructuredOutput();
        var hybridResults = CreateHybridSearchResults(1);

        _mockStructuredOutput.Setup(s => s.GenerateAsync<RelevanceScoreResult>(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RelevanceScoreResult?)null);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "7" });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert
        result[0].RelevanceScore.Should().Be(7.0f);
    }

    #endregion

    #region Result Metadata Tests

    [Fact]
    public async Task RerankAsync_PreservesOriginalRank()
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(3);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "7" });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert
        result.Should().AllSatisfy(r => r.OriginalRank.Should().BeGreaterThan(0));
    }

    [Fact]
    public async Task RerankAsync_SetsFinalRank()
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(3);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "7" });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert
        for (int i = 0; i < result.Count; i++)
        {
            result[i].FinalRank.Should().Be(i + 1);
        }
    }

    [Fact]
    public async Task RerankAsync_SetsWasRerankedFlag()
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(2);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "7" });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert
        result.Should().AllSatisfy(r => r.WasReranked.Should().BeTrue());
    }

    [Fact]
    public async Task RerankAsync_CalculatesFinalScore()
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(1);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "8" });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert
        result[0].FinalScore.Should().BeGreaterThan(0);
        // FinalScore combines rerank score and vector score
        result[0].FinalScore.Should().BeLessThanOrEqualTo(1.0f);
    }

    [Fact]
    public async Task RerankAsync_PreservesOriginalMetadata()
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(1);
        hybridResults[0].VectorScore = 0.85f;
        hybridResults[0].BM25Score = 0.75f;
        hybridResults[0].RRFScore = 0.02f;

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "7" });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert
        result[0].VectorScore.Should().Be(0.85f);
        result[0].BM25Score.Should().Be(0.75f);
        result[0].RRFScore.Should().Be(0.02f);
    }

    #endregion

    #region Error Handling Tests

    [Fact]
    public async Task RerankAsync_WhenScoringThrows_ReturnsNeutralScore()
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(1);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("API error"));

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert
        result[0].RelevanceScore.Should().Be(5.0f); // Neutral score on error
    }

    [Fact]
    public async Task RerankAsync_TruncatesLongContent()
    {
        // Arrange
        var sut = CreateService();
        var hybridResults = CreateHybridSearchResults(1);
        hybridResults[0].Content = new string('x', 5000); // Very long content

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "7" });

        // Act
        var result = await sut.RerankAsync("test query", hybridResults, 5);

        // Assert - Should complete without error
        result.Should().HaveCount(1);
    }

    #endregion

    #region Helper Methods

    private RerankerService CreateService()
    {
        return new RerankerService(
            _mockAIProviderFactory.Object,
            _mockSettings.Object,
            _mockLogger.Object,
            structuredOutputService: null);
    }

    private RerankerService CreateServiceWithStructuredOutput()
    {
        return new RerankerService(
            _mockAIProviderFactory.Object,
            _mockSettings.Object,
            _mockLogger.Object,
            _mockStructuredOutput.Object);
    }

    private static List<HybridSearchResult> CreateHybridSearchResults(int count)
    {
        return Enumerable.Range(1, count).Select(i => new HybridSearchResult
        {
            Id = string.Format("id-{0}", i),
            NoteId = string.Format("note-{0}", i),
            Content = string.Format("Content for note {0}. This contains relevant information.", i),
            NoteTitle = string.Format("Test Note {0}", i),
            NoteTags = new List<string> { "test", string.Format("tag-{0}", i) },
            ChunkIndex = 0,
            VectorScore = 0.9f - (i * 0.05f),
            BM25Score = 0.8f - (i * 0.05f),
            RRFScore = 0.02f - (i * 0.001f),
            FoundInVectorSearch = true,
            FoundInBM25Search = true,
            Metadata = new Dictionary<string, object>()
        }).ToList();
    }

    #endregion
}

// Mock structured output result class
public class RelevanceScoreResult
{
    public float Score { get; set; }
    public string? Reasoning { get; set; }
}
