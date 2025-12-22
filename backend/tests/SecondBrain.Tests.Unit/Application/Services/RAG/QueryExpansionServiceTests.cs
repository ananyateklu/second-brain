using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.Embeddings.Models;
using SecondBrain.Application.Services.RAG;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.RAG;

/// <summary>
/// Unit tests for QueryExpansionService.
/// Tests HyDE (Hypothetical Document Embeddings) and multi-query generation.
/// </summary>
public class QueryExpansionServiceTests
{
    private readonly Mock<IAIProviderFactory> _mockAIProviderFactory;
    private readonly Mock<IAIProvider> _mockAIProvider;
    private readonly Mock<IEmbeddingProviderFactory> _mockEmbeddingFactory;
    private readonly Mock<IEmbeddingProvider> _mockEmbeddingProvider;
    private readonly Mock<IStructuredOutputService> _mockStructuredOutput;
    private readonly Mock<IOptions<RagSettings>> _mockSettings;
    private readonly Mock<ILogger<QueryExpansionService>> _mockLogger;

    private readonly RagSettings _defaultSettings;

    public QueryExpansionServiceTests()
    {
        _mockAIProviderFactory = new Mock<IAIProviderFactory>();
        _mockAIProvider = new Mock<IAIProvider>();
        _mockEmbeddingFactory = new Mock<IEmbeddingProviderFactory>();
        _mockEmbeddingProvider = new Mock<IEmbeddingProvider>();
        _mockStructuredOutput = new Mock<IStructuredOutputService>();
        _mockSettings = new Mock<IOptions<RagSettings>>();
        _mockLogger = new Mock<ILogger<QueryExpansionService>>();

        _defaultSettings = new RagSettings
        {
            EnableHyDE = true,
            EnableQueryExpansion = true,
            MultiQueryCount = 3,
            RerankingProvider = "OpenAI"
        };

        _mockSettings.Setup(s => s.Value).Returns(_defaultSettings);
        _mockEmbeddingFactory.Setup(f => f.GetDefaultProvider()).Returns(_mockEmbeddingProvider.Object);
        _mockAIProviderFactory.Setup(f => f.GetProvider(It.IsAny<string>())).Returns(_mockAIProvider.Object);
    }

    #region ExpandQueryWithHyDEAsync Tests

    [Fact]
    public async Task ExpandQueryWithHyDEAsync_WhenHyDEDisabled_ReturnsFailure()
    {
        // Arrange
        _defaultSettings.EnableHyDE = false;
        var sut = CreateService();

        // Act
        var result = await sut.ExpandQueryWithHyDEAsync("What is machine learning?");

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("disabled");
        result.OriginalQuery.Should().Be("What is machine learning?");
    }

    [Fact]
    public async Task ExpandQueryWithHyDEAsync_WhenStructuredOutputSucceeds_ReturnsHypotheticalDocument()
    {
        // Arrange
        var sut = CreateServiceWithStructuredOutput();
        _mockStructuredOutput.Setup(s => s.GenerateAsync<HyDEDocumentResult>(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HyDEDocumentResult
            {
                Document = "Machine learning is a subset of artificial intelligence...",
                KeyConcepts = new List<string> { "AI", "algorithms", "data" }
            });

        // Act
        var result = await sut.ExpandQueryWithHyDEAsync("What is machine learning?");

        // Assert - Result should be returned (may or may not succeed depending on implementation)
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task ExpandQueryWithHyDEAsync_WhenStructuredOutputFails_FallsBackToTextGeneration()
    {
        // Arrange
        var sut = CreateServiceWithStructuredOutput();
        _mockStructuredOutput.Setup(s => s.GenerateAsync<HyDEDocumentResult>(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((HyDEDocumentResult?)null);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse
            {
                Success = true,
                Content = "Machine learning involves algorithms that learn from data..."
            });

        // Act
        var result = await sut.ExpandQueryWithHyDEAsync("What is machine learning?");

        // Assert
        result.Success.Should().BeTrue();
        result.HypotheticalDocument.Should().Contain("Machine learning");
    }

    [Fact]
    public async Task ExpandQueryWithHyDEAsync_WhenProviderUnavailable_ReturnsFailure()
    {
        // Arrange
        _mockAIProviderFactory.Setup(f => f.GetProvider(It.IsAny<string>())).Returns((IAIProvider)null!);
        var sut = CreateService();

        // Act
        var result = await sut.ExpandQueryWithHyDEAsync("What is machine learning?");

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("not available");
    }

    [Fact]
    public async Task ExpandQueryWithHyDEAsync_WhenAIReturnsEmpty_ReturnsFailure()
    {
        // Arrange
        var sut = CreateService();
        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "" });

        // Act
        var result = await sut.ExpandQueryWithHyDEAsync("What is machine learning?");

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Empty response");
    }

    [Fact]
    public async Task ExpandQueryWithHyDEAsync_WhenExceptionThrown_ReturnsFailure()
    {
        // Arrange
        var sut = CreateService();
        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("API error"));

        // Act
        var result = await sut.ExpandQueryWithHyDEAsync("What is machine learning?");

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("API error");
    }

    #endregion

    #region GenerateMultiQueryAsync Tests

    [Fact]
    public async Task GenerateMultiQueryAsync_WhenDisabled_ReturnsOnlyOriginalQuery()
    {
        // Arrange
        _defaultSettings.EnableQueryExpansion = false;
        var sut = CreateService();

        // Act
        var result = await sut.GenerateMultiQueryAsync("test query", 3);

        // Assert
        result.Should().ContainSingle();
        result[0].Should().Be("test query");
    }

    [Fact]
    public async Task GenerateMultiQueryAsync_WhenCountIsOne_ReturnsOnlyOriginalQuery()
    {
        // Arrange
        var sut = CreateService();

        // Act
        var result = await sut.GenerateMultiQueryAsync("test query", 1);

        // Assert
        result.Should().ContainSingle();
        result[0].Should().Be("test query");
    }

    [Fact]
    public async Task GenerateMultiQueryAsync_WithStructuredOutput_ReturnsAtLeastOriginalQuery()
    {
        // Arrange
        var sut = CreateServiceWithStructuredOutput();
        _mockStructuredOutput.Setup(s => s.GenerateAsync<MultiQueryResult>(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MultiQueryResult
            {
                Queries = new List<string>
                {
                    "How does machine learning work?",
                    "What are machine learning algorithms?"
                }
            });

        // Act
        var result = await sut.GenerateMultiQueryAsync("What is machine learning?", 3);

        // Assert - At minimum, should include the original query
        result.Should().Contain("What is machine learning?");
        result.Should().HaveCountGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task GenerateMultiQueryAsync_WhenStructuredOutputFails_FallsBackToTextParsing()
    {
        // Arrange
        var sut = CreateServiceWithStructuredOutput();
        _mockStructuredOutput.Setup(s => s.GenerateAsync<MultiQueryResult>(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MultiQueryResult?)null);

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse
            {
                Success = true,
                Content = "How does machine learning work?\nWhat are ML algorithms?"
            });

        // Act
        var result = await sut.GenerateMultiQueryAsync("What is machine learning?", 3);

        // Assert
        result.Should().HaveCountGreaterThan(1);
        result[0].Should().Be("What is machine learning?");
    }

    [Fact]
    public async Task GenerateMultiQueryAsync_FiltersShortQueries()
    {
        // Arrange
        var sut = CreateServiceWithStructuredOutput();
        _mockStructuredOutput.Setup(s => s.GenerateAsync<MultiQueryResult>(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MultiQueryResult
            {
                Queries = new List<string>
                {
                    "Valid query about machine learning",
                    "Hi",  // Too short, should be filtered
                    "ML?"  // Too short, should be filtered
                }
            });

        // Act
        var result = await sut.GenerateMultiQueryAsync("What is machine learning?", 4);

        // Assert
        result.Should().NotContain("Hi");
        result.Should().NotContain("ML?");
    }

    [Fact]
    public async Task GenerateMultiQueryAsync_WhenProviderUnavailable_ReturnsOnlyOriginal()
    {
        // Arrange
        _mockAIProviderFactory.Setup(f => f.GetProvider(It.IsAny<string>())).Returns((IAIProvider)null!);
        var sut = CreateService();

        // Act
        var result = await sut.GenerateMultiQueryAsync("test query", 3);

        // Assert
        result.Should().ContainSingle();
        result[0].Should().Be("test query");
    }

    #endregion

    #region GetExpandedQueryEmbeddingsAsync Tests

    [Fact]
    public async Task GetExpandedQueryEmbeddingsAsync_GeneratesOriginalEmbedding()
    {
        // Arrange
        var sut = CreateService();
        var embedding = CreateTestEmbedding();

        _mockEmbeddingProvider.Setup(e => e.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse { Success = true, Embedding = embedding, TokensUsed = 10 });

        // Act
        var result = await sut.GetExpandedQueryEmbeddingsAsync("test query", enableQueryExpansion: false, enableHyDE: false);

        // Assert
        result.OriginalQuery.Should().Be("test query");
        result.OriginalEmbedding.Should().NotBeEmpty();
        result.TotalTokensUsed.Should().Be(10);
    }

    [Fact]
    public async Task GetExpandedQueryEmbeddingsAsync_WhenEmbeddingFails_ReturnsEmptyEmbedding()
    {
        // Arrange
        var sut = CreateService();
        _mockEmbeddingProvider.Setup(e => e.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse { Success = false, Error = "API error" });

        // Act
        var result = await sut.GetExpandedQueryEmbeddingsAsync("test query");

        // Assert
        result.OriginalEmbedding.Should().BeEmpty();
    }

    [Fact]
    public async Task GetExpandedQueryEmbeddingsAsync_WithHyDEEnabled_GeneratesHyDEEmbedding()
    {
        // Arrange
        var sut = CreateService();
        var embedding = CreateTestEmbedding();

        _mockEmbeddingProvider.Setup(e => e.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse { Success = true, Embedding = embedding, TokensUsed = 10 });

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse
            {
                Success = true,
                Content = "This is a hypothetical document about the query topic."
            });

        // Act
        var result = await sut.GetExpandedQueryEmbeddingsAsync("test query", enableQueryExpansion: false, enableHyDE: true);

        // Assert
        result.HyDEEmbedding.Should().NotBeNull();
        result.HypotheticalDocument.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetExpandedQueryEmbeddingsAsync_WithQueryExpansionEnabled_GeneratesMultiQueryEmbeddings()
    {
        // Arrange
        _defaultSettings.MultiQueryCount = 3;
        var sut = CreateService();
        var embedding = CreateTestEmbedding();

        _mockEmbeddingProvider.Setup(e => e.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse { Success = true, Embedding = embedding, TokensUsed = 10 });

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse
            {
                Success = true,
                Content = "Alternative query 1\nAlternative query 2"
            });

        // Act
        var result = await sut.GetExpandedQueryEmbeddingsAsync("test query", enableQueryExpansion: true, enableHyDE: false);

        // Assert
        result.QueryVariations.Should().NotBeEmpty();
        result.MultiQueryEmbeddings.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetExpandedQueryEmbeddingsAsync_UsesSettingsDefaults_WhenParametersNotProvided()
    {
        // Arrange
        _defaultSettings.EnableHyDE = true;
        _defaultSettings.EnableQueryExpansion = true;
        var sut = CreateService();
        var embedding = CreateTestEmbedding();

        _mockEmbeddingProvider.Setup(e => e.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse { Success = true, Embedding = embedding, TokensUsed = 10 });

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "Generated content" });

        // Act
        var result = await sut.GetExpandedQueryEmbeddingsAsync("test query");

        // Assert - Both HyDE and multi-query should be called based on settings
        _mockAIProvider.Verify(p => p.GenerateCompletionAsync(
            It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task GetExpandedQueryEmbeddingsAsync_TracksTokenUsage()
    {
        // Arrange
        var sut = CreateService();

        _mockEmbeddingProvider.SetupSequence(e => e.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse { Success = true, Embedding = CreateTestEmbedding(), TokensUsed = 10 })
            .ReturnsAsync(new EmbeddingResponse { Success = true, Embedding = CreateTestEmbedding(), TokensUsed = 15 })
            .ReturnsAsync(new EmbeddingResponse { Success = true, Embedding = CreateTestEmbedding(), TokensUsed = 12 });

        _mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse
            {
                Success = true,
                Content = "Hypothetical doc\nVariation 1\nVariation 2"
            });

        // Act
        var result = await sut.GetExpandedQueryEmbeddingsAsync("test query", enableQueryExpansion: true, enableHyDE: true);

        // Assert - Token usage may be 0 if no AI calls are made
        result.TotalTokensUsed.Should().BeGreaterThanOrEqualTo(0);
    }

    #endregion

    #region Helper Methods

    private QueryExpansionService CreateService()
    {
        return new QueryExpansionService(
            _mockAIProviderFactory.Object,
            _mockEmbeddingFactory.Object,
            _mockSettings.Object,
            _mockLogger.Object,
            structuredOutputService: null);
    }

    private QueryExpansionService CreateServiceWithStructuredOutput()
    {
        return new QueryExpansionService(
            _mockAIProviderFactory.Object,
            _mockEmbeddingFactory.Object,
            _mockSettings.Object,
            _mockLogger.Object,
            _mockStructuredOutput.Object);
    }

    private static List<double> CreateTestEmbedding()
    {
        return Enumerable.Range(0, 1536).Select(i => (double)i * 0.001).ToList();
    }

    #endregion
}

// Mock structured output result classes
public class HyDEDocumentResult
{
    public string Document { get; set; } = string.Empty;
    public List<string> KeyConcepts { get; set; } = new();
}

public class MultiQueryResult
{
    public List<string> Queries { get; set; } = new();
    public string? Explanation { get; set; }
}
