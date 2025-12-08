using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.AI.StructuredOutput.Models;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.AI.StructuredOutput;

/// <summary>
/// Tests for structured output integration across services.
/// </summary>
public class StructuredOutputIntegrationTests
{
    #region QueryIntentDetector Tests

    public class QueryIntentDetectorTests
    {
        private readonly Mock<IStructuredOutputService> _structuredOutputServiceMock;
        private readonly Mock<ILogger<QueryIntentDetector>> _loggerMock;

        public QueryIntentDetectorTests()
        {
            _structuredOutputServiceMock = new Mock<IStructuredOutputService>();
            _loggerMock = new Mock<ILogger<QueryIntentDetector>>();
        }

        [Fact]
        public void ShouldRetrieveContext_WithoutAI_UsesHeuristics()
        {
            // Arrange
            var detector = new QueryIntentDetector();

            // Act & Assert - Question queries should retrieve context
            Assert.True(detector.ShouldRetrieveContext("What did I write about machine learning?"));
            Assert.True(detector.ShouldRetrieveContext("Do I have any notes about Python?"));

            // Action commands should NOT retrieve context
            Assert.False(detector.ShouldRetrieveContext("Create a new note about testing"));
            Assert.False(detector.ShouldRetrieveContext("Delete the note"));
        }

        [Fact]
        public async Task DetectIntentAsync_WithStructuredOutput_ReturnsAIClassification()
        {
            // Arrange
            var expectedIntent = new QueryIntent
            {
                IntentType = "question",
                RequiresRAG = true,
                RequiresTools = false,
                Confidence = 0.95f,
                Reasoning = "This is a question seeking information from notes"
            };

            _structuredOutputServiceMock
                .Setup(s => s.GenerateAsync<QueryIntent>(
                    It.IsAny<string>(),
                    It.IsAny<StructuredOutputOptions>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedIntent);

            var detector = new QueryIntentDetector(
                _structuredOutputServiceMock.Object,
                _loggerMock.Object);

            // Act
            var result = await detector.DetectIntentAsync("What are my notes about AI?");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("question", result.IntentType);
            Assert.True(result.RequiresRAG);
            Assert.Equal(0.95f, result.Confidence);
        }

        [Fact]
        public async Task DetectIntentAsync_WhenAIFails_FallsBackToHeuristics()
        {
            // Arrange
            _structuredOutputServiceMock
                .Setup(s => s.GenerateAsync<QueryIntent>(
                    It.IsAny<string>(),
                    It.IsAny<StructuredOutputOptions>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync((QueryIntent?)null);

            var detector = new QueryIntentDetector(
                _structuredOutputServiceMock.Object,
                _loggerMock.Object);

            // Act
            var result = await detector.DetectIntentAsync("What are my notes about AI?");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(0.7f, result.Confidence); // Heuristic confidence
            Assert.Contains("heuristic", result.Reasoning?.ToLower());
        }

        [Fact]
        public async Task DetectIntentAsync_WithoutStructuredOutputService_UsesHeuristics()
        {
            // Arrange
            var detector = new QueryIntentDetector(null, _loggerMock.Object);

            // Act
            var result = await detector.DetectIntentAsync("Create a note about testing");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("create", result.IntentType);
            Assert.False(result.RequiresRAG);
            Assert.Contains("create_note", result.SuggestedTools);
        }

        [Fact]
        public void IsAIDetectionAvailable_ReturnsCorrectState()
        {
            // Without service
            var detectorWithoutAI = new QueryIntentDetector();
            Assert.False(detectorWithoutAI.IsAIDetectionAvailable);

            // With service
            var detectorWithAI = new QueryIntentDetector(
                _structuredOutputServiceMock.Object,
                _loggerMock.Object);
            Assert.True(detectorWithAI.IsAIDetectionAvailable);
        }
    }

    #endregion

    #region RerankerService Tests

    public class RerankerServiceTests
    {
        private readonly Mock<IAIProviderFactory> _aiProviderFactoryMock;
        private readonly Mock<IStructuredOutputService> _structuredOutputServiceMock;
        private readonly Mock<ILogger<RerankerService>> _loggerMock;
        private readonly RagSettings _settings;

        public RerankerServiceTests()
        {
            _aiProviderFactoryMock = new Mock<IAIProviderFactory>();
            _structuredOutputServiceMock = new Mock<IStructuredOutputService>();
            _loggerMock = new Mock<ILogger<RerankerService>>();
            _settings = new RagSettings
            {
                EnableReranking = true,
                RerankingProvider = "OpenAI"
            };
        }

        [Fact]
        public async Task RerankAsync_WithStructuredOutput_UsesRelevanceScoreResult()
        {
            // Arrange
            var mockProvider = new Mock<IAIProvider>();
            _aiProviderFactoryMock
                .Setup(f => f.GetProvider("OpenAI"))
                .Returns(mockProvider.Object);

            _structuredOutputServiceMock
                .Setup(s => s.GenerateAsync<RelevanceScoreResult>(
                    "OpenAI",
                    It.IsAny<string>(),
                    It.IsAny<StructuredOutputOptions>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(new RelevanceScoreResult { Score = 8.5f, Reasoning = "Highly relevant" });

            var service = new RerankerService(
                _aiProviderFactoryMock.Object,
                Options.Create(_settings),
                _loggerMock.Object,
                _structuredOutputServiceMock.Object);

            var results = new List<HybridSearchResult>
            {
                new HybridSearchResult
                {
                    Id = "1",
                    NoteId = "note-1",
                    NoteTitle = "Test Note",
                    Content = "Test content",
                    VectorScore = 0.8f,
                    RRFScore = 0.5f
                }
            };

            // Act
            var reranked = await service.RerankAsync("test query", results, 5);

            // Assert
            Assert.Single(reranked);
            Assert.Equal(8.5f, reranked[0].RelevanceScore);
            Assert.True(reranked[0].WasReranked);
        }

        [Fact]
        public async Task RerankAsync_WhenDisabled_SkipsReranking()
        {
            // Arrange
            var disabledSettings = new RagSettings { EnableReranking = false };

            var service = new RerankerService(
                _aiProviderFactoryMock.Object,
                Options.Create(disabledSettings),
                _loggerMock.Object,
                _structuredOutputServiceMock.Object);

            var results = new List<HybridSearchResult>
            {
                new HybridSearchResult
                {
                    Id = "1",
                    NoteId = "note-1",
                    NoteTitle = "Test Note",
                    Content = "Test content"
                }
            };

            // Act
            var reranked = await service.RerankAsync("test query", results, 5);

            // Assert
            Assert.Single(reranked);
            Assert.False(reranked[0].WasReranked);
        }

        [Fact]
        public async Task RerankAsync_FiltersOutLowScoreResults()
        {
            // Arrange
            var settingsWithMinScore = new RagSettings
            {
                EnableReranking = true,
                RerankingProvider = "OpenAI",
                MinRerankScore = 5.0f // Set threshold to 5
            };

            var mockProvider = new Mock<IAIProvider>();
            _aiProviderFactoryMock
                .Setup(f => f.GetProvider("OpenAI"))
                .Returns(mockProvider.Object);

            var callCount = 0;
            _structuredOutputServiceMock
                .Setup(s => s.GenerateAsync<RelevanceScoreResult>(
                    "OpenAI",
                    It.IsAny<string>(),
                    It.IsAny<StructuredOutputOptions>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(() =>
                {
                    callCount++;
                    // Return alternating high and low scores
                    return new RelevanceScoreResult
                    {
                        Score = callCount % 2 == 1 ? 8.0f : 2.0f, // 8, 2, 8, 2
                        Reasoning = "Test"
                    };
                });

            var service = new RerankerService(
                _aiProviderFactoryMock.Object,
                Options.Create(settingsWithMinScore),
                _loggerMock.Object,
                _structuredOutputServiceMock.Object);

            var results = new List<HybridSearchResult>
            {
                new HybridSearchResult { Id = "1", NoteId = "note-1", NoteTitle = "Note 1", Content = "Content 1", VectorScore = 0.9f, RRFScore = 0.5f },
                new HybridSearchResult { Id = "2", NoteId = "note-2", NoteTitle = "Note 2", Content = "Content 2", VectorScore = 0.8f, RRFScore = 0.4f },
                new HybridSearchResult { Id = "3", NoteId = "note-3", NoteTitle = "Note 3", Content = "Content 3", VectorScore = 0.7f, RRFScore = 0.3f },
                new HybridSearchResult { Id = "4", NoteId = "note-4", NoteTitle = "Note 4", Content = "Content 4", VectorScore = 0.6f, RRFScore = 0.2f }
            };

            // Act
            var reranked = await service.RerankAsync("test query", results, 5);

            // Assert - Only results with score >= 5.0 should be returned (scores 8.0)
            Assert.Equal(2, reranked.Count);
            Assert.All(reranked, r => Assert.True(r.RelevanceScore >= 5.0f));
        }
    }

    #endregion

    #region TopicClusteringService Tests

    public class TopicClusteringServiceTests
    {
        private readonly Mock<IRagQueryLogRepository> _repositoryMock;
        private readonly Mock<IEmbeddingProviderFactory> _embeddingFactoryMock;
        private readonly Mock<IAIProviderFactory> _aiProviderFactoryMock;
        private readonly Mock<IStructuredOutputService> _structuredOutputServiceMock;
        private readonly Mock<ILogger<TopicClusteringService>> _loggerMock;
        private readonly RagSettings _settings;

        public TopicClusteringServiceTests()
        {
            _repositoryMock = new Mock<IRagQueryLogRepository>();
            _embeddingFactoryMock = new Mock<IEmbeddingProviderFactory>();
            _aiProviderFactoryMock = new Mock<IAIProviderFactory>();
            _structuredOutputServiceMock = new Mock<IStructuredOutputService>();
            _loggerMock = new Mock<ILogger<TopicClusteringService>>();
            _settings = new RagSettings { RerankingProvider = "OpenAI" };
        }

        [Fact]
        public async Task ClusterQueriesAsync_WithNotEnoughQueries_ReturnsError()
        {
            // Arrange
            _repositoryMock
                .Setup(r => r.GetByUserIdAsync(It.IsAny<string>(), It.IsAny<DateTime?>()))
                .ReturnsAsync(new List<RagQueryLog>()); // Empty list

            var service = new TopicClusteringService(
                _repositoryMock.Object,
                _embeddingFactoryMock.Object,
                _aiProviderFactoryMock.Object,
                Options.Create(_settings),
                _loggerMock.Object,
                _structuredOutputServiceMock.Object);

            // Act
            var result = await service.ClusterQueriesAsync("user-1");

            // Assert
            Assert.False(result.Success);
            Assert.Contains("Not enough queries", result.Error);
        }
    }

    #endregion

    #region QueryExpansionService Tests

    public class QueryExpansionServiceTests
    {
        private readonly Mock<IAIProviderFactory> _aiProviderFactoryMock;
        private readonly Mock<IEmbeddingProviderFactory> _embeddingFactoryMock;
        private readonly Mock<IStructuredOutputService> _structuredOutputServiceMock;
        private readonly Mock<ILogger<QueryExpansionService>> _loggerMock;
        private readonly RagSettings _settings;

        public QueryExpansionServiceTests()
        {
            _aiProviderFactoryMock = new Mock<IAIProviderFactory>();
            _embeddingFactoryMock = new Mock<IEmbeddingProviderFactory>();
            _structuredOutputServiceMock = new Mock<IStructuredOutputService>();
            _loggerMock = new Mock<ILogger<QueryExpansionService>>();
            _settings = new RagSettings
            {
                EnableHyDE = true,
                EnableQueryExpansion = true,
                MultiQueryCount = 3,
                RerankingProvider = "OpenAI"
            };
        }

        [Fact]
        public async Task ExpandQueryWithHyDEAsync_WithStructuredOutput_ReturnsDocument()
        {
            // Arrange
            _structuredOutputServiceMock
                .Setup(s => s.GenerateAsync<HyDEDocumentResult>(
                    "OpenAI",
                    It.IsAny<string>(),
                    It.IsAny<StructuredOutputOptions>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(new HyDEDocumentResult
                {
                    Document = "This is a hypothetical document about machine learning...",
                    KeyConcepts = new List<string> { "machine learning", "AI", "neural networks" }
                });

            var service = new QueryExpansionService(
                _aiProviderFactoryMock.Object,
                _embeddingFactoryMock.Object,
                Options.Create(_settings),
                _loggerMock.Object,
                _structuredOutputServiceMock.Object);

            // Act
            var result = await service.ExpandQueryWithHyDEAsync("What is machine learning?");

            // Assert
            Assert.True(result.Success);
            Assert.Contains("hypothetical document", result.HypotheticalDocument);
        }

        [Fact]
        public async Task ExpandQueryWithHyDEAsync_WhenDisabled_ReturnsError()
        {
            // Arrange
            var disabledSettings = new RagSettings { EnableHyDE = false };

            var service = new QueryExpansionService(
                _aiProviderFactoryMock.Object,
                _embeddingFactoryMock.Object,
                Options.Create(disabledSettings),
                _loggerMock.Object,
                _structuredOutputServiceMock.Object);

            // Act
            var result = await service.ExpandQueryWithHyDEAsync("test query");

            // Assert
            Assert.False(result.Success);
            Assert.Contains("disabled", result.Error);
        }

        [Fact]
        public async Task GenerateMultiQueryAsync_WithStructuredOutput_ReturnsQueries()
        {
            // Arrange
            _structuredOutputServiceMock
                .Setup(s => s.GenerateAsync<MultiQueryResult>(
                    "OpenAI",
                    It.IsAny<string>(),
                    It.IsAny<StructuredOutputOptions>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(new MultiQueryResult
                {
                    Queries = new List<string>
                    {
                        "Alternative query 1",
                        "Alternative query 2"
                    },
                    Explanation = "Generated alternative phrasings"
                });

            var service = new QueryExpansionService(
                _aiProviderFactoryMock.Object,
                _embeddingFactoryMock.Object,
                Options.Create(_settings),
                _loggerMock.Object,
                _structuredOutputServiceMock.Object);

            // Act
            var result = await service.GenerateMultiQueryAsync("original query", 3);

            // Assert
            Assert.Equal(3, result.Count); // Original + 2 alternatives
            Assert.Contains("original query", result);
            Assert.Contains("Alternative query 1", result);
        }

        [Fact]
        public async Task GenerateMultiQueryAsync_WhenDisabled_ReturnsOnlyOriginal()
        {
            // Arrange
            var disabledSettings = new RagSettings { EnableQueryExpansion = false };

            var service = new QueryExpansionService(
                _aiProviderFactoryMock.Object,
                _embeddingFactoryMock.Object,
                Options.Create(disabledSettings),
                _loggerMock.Object,
                _structuredOutputServiceMock.Object);

            // Act
            var result = await service.GenerateMultiQueryAsync("original query", 3);

            // Assert
            Assert.Single(result);
            Assert.Equal("original query", result[0]);
        }
    }

    #endregion

    #region New StructuredOutput Types Tests

    public class StructuredOutputTypesTests
    {
        [Fact]
        public void RelevanceScoreResult_HasCorrectDefaults()
        {
            var result = new RelevanceScoreResult();

            Assert.Equal(0, result.Score);
            Assert.Null(result.Reasoning);
        }

        [Fact]
        public void TopicLabelResult_HasCorrectDefaults()
        {
            var result = new TopicLabelResult();

            Assert.Equal(string.Empty, result.Label);
            Assert.Equal(0, result.Confidence);
            Assert.NotNull(result.Keywords);
            Assert.Empty(result.Keywords);
        }

        [Fact]
        public void MultiQueryResult_HasCorrectDefaults()
        {
            var result = new MultiQueryResult();

            Assert.NotNull(result.Queries);
            Assert.Empty(result.Queries);
            Assert.Null(result.Explanation);
        }

        [Fact]
        public void HyDEDocumentResult_HasCorrectDefaults()
        {
            var result = new HyDEDocumentResult();

            Assert.Equal(string.Empty, result.Document);
            Assert.NotNull(result.KeyConcepts);
            Assert.Empty(result.KeyConcepts);
            Assert.Null(result.DocumentType);
        }

        [Fact]
        public void RelevanceScoreResult_CanBePopulated()
        {
            var result = new RelevanceScoreResult
            {
                Score = 8.5f,
                Reasoning = "Very relevant to the query"
            };

            Assert.Equal(8.5f, result.Score);
            Assert.Equal("Very relevant to the query", result.Reasoning);
        }

        [Fact]
        public void TopicLabelResult_CanBePopulated()
        {
            var result = new TopicLabelResult
            {
                Label = "Machine Learning",
                Confidence = 0.95f,
                Keywords = new List<string> { "AI", "neural networks", "deep learning" }
            };

            Assert.Equal("Machine Learning", result.Label);
            Assert.Equal(0.95f, result.Confidence);
            Assert.Equal(3, result.Keywords.Count);
        }
    }

    #endregion
}
