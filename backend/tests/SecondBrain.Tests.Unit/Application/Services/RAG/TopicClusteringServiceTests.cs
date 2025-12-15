using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.AI.StructuredOutput.Models;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.Embeddings.Models;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.RAG;

/// <summary>
/// Unit tests for TopicClusteringService.
/// Tests query clustering, topic labeling, and statistics generation.
/// </summary>
public class TopicClusteringServiceTests
{
    private readonly Mock<IRagQueryLogRepository> _mockRepository;
    private readonly Mock<IEmbeddingProviderFactory> _mockEmbeddingFactory;
    private readonly Mock<IAIProviderFactory> _mockAIProviderFactory;
    private readonly Mock<IStructuredOutputService> _mockStructuredOutputService;
    private readonly Mock<ILogger<TopicClusteringService>> _mockLogger;
    private readonly RagSettings _settings;
    private readonly TopicClusteringService _sut;

    public TopicClusteringServiceTests()
    {
        _mockRepository = new Mock<IRagQueryLogRepository>();
        _mockEmbeddingFactory = new Mock<IEmbeddingProviderFactory>();
        _mockAIProviderFactory = new Mock<IAIProviderFactory>();
        _mockStructuredOutputService = new Mock<IStructuredOutputService>();
        _mockLogger = new Mock<ILogger<TopicClusteringService>>();
        _settings = new RagSettings
        {
            RerankingProvider = "openai"
        };

        var options = Options.Create(_settings);
        _sut = new TopicClusteringService(
            _mockRepository.Object,
            _mockEmbeddingFactory.Object,
            _mockAIProviderFactory.Object,
            options,
            _mockLogger.Object,
            _mockStructuredOutputService.Object);
    }

    #region ClusterQueriesAsync - Basic Functionality Tests

    [Fact]
    public async Task ClusterQueriesAsync_WhenInsufficientQueries_ReturnsErrorResult()
    {
        // Arrange
        var userId = "user-123";
        var logs = CreateTestLogs(5); // Less than MIN_QUERIES_FOR_CLUSTERING (10)
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.ClusterQueriesAsync(userId);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Not enough queries");
    }

    [Fact]
    public async Task ClusterQueriesAsync_WhenSufficientQueries_PerformsClustering()
    {
        // Arrange
        var userId = "user-123";
        var logs = CreateTestLogsWithEmbeddings(15);
        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();

        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .ReturnsAsync(logs);
        _mockEmbeddingFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);
        _mockRepository.Setup(r => r.UpdateAsync(It.IsAny<Guid>(), It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog?)null);

        var mockAIProvider = new Mock<IAIProvider>();
        mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "Topic Label" });
        _mockAIProviderFactory.Setup(f => f.GetProvider(_settings.RerankingProvider))
            .Returns(mockAIProvider.Object);

        // Act
        var result = await _sut.ClusterQueriesAsync(userId, 3);

        // Assert
        result.Success.Should().BeTrue();
        result.TotalProcessed.Should().Be(15);
        result.TopicLabels.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ClusterQueriesAsync_WhenExceptionThrown_ReturnsErrorResult()
    {
        // Arrange
        var userId = "user-123";
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.ClusterQueriesAsync(userId);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task ClusterQueriesAsync_UsesDefaultSinceDate()
    {
        // Arrange
        var userId = "user-123";
        DateTime? capturedSince = null;
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .Callback<string, DateTime?>((u, s) => capturedSince = s)
            .ReturnsAsync(new List<RagQueryLog>());

        // Act
        await _sut.ClusterQueriesAsync(userId);

        // Assert
        capturedSince.Should().NotBeNull();
        capturedSince.Should().BeCloseTo(DateTime.UtcNow.AddDays(-90), TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task ClusterQueriesAsync_UsesProvidedSinceDate()
    {
        // Arrange
        var userId = "user-123";
        var since = DateTime.UtcNow.AddDays(-30);
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, since))
            .ReturnsAsync(new List<RagQueryLog>());

        // Act
        await _sut.ClusterQueriesAsync(userId, since: since);

        // Assert
        _mockRepository.Verify(r => r.GetByUserIdAsync(userId, since), Times.Once);
    }

    [Fact]
    public async Task ClusterQueriesAsync_LimitsMaxQueries()
    {
        // Arrange
        var userId = "user-123";
        var logs = CreateTestLogsWithEmbeddings(1500); // More than MAX_QUERIES_FOR_CLUSTERING (1000)
        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();

        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .ReturnsAsync(logs);
        _mockEmbeddingFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);
        _mockRepository.Setup(r => r.UpdateAsync(It.IsAny<Guid>(), It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog?)null);

        var mockAIProvider = new Mock<IAIProvider>();
        mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "Topic" });
        _mockAIProviderFactory.Setup(f => f.GetProvider(_settings.RerankingProvider))
            .Returns(mockAIProvider.Object);

        // Act
        var result = await _sut.ClusterQueriesAsync(userId);

        // Assert
        result.TotalProcessed.Should().BeLessThanOrEqualTo(1000);
    }

    #endregion

    #region ClusterQueriesAsync - Embedding Generation Tests

    [Fact]
    public async Task ClusterQueriesAsync_GeneratesEmbeddingsForLogsWithoutThem()
    {
        // Arrange
        var userId = "user-123";
        var logs = CreateTestLogs(15); // No embeddings
        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();
        mockEmbeddingProvider.Setup(p => p.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse { Success = true, Embedding = CreateTestEmbedding() });

        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .ReturnsAsync(logs);
        _mockEmbeddingFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);
        _mockRepository.Setup(r => r.UpdateAsync(It.IsAny<Guid>(), It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog?)null);

        var mockAIProvider = new Mock<IAIProvider>();
        mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "Topic" });
        _mockAIProviderFactory.Setup(f => f.GetProvider(_settings.RerankingProvider))
            .Returns(mockAIProvider.Object);

        // Act
        await _sut.ClusterQueriesAsync(userId);

        // Assert
        mockEmbeddingProvider.Verify(p => p.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Exactly(15));
    }

    [Fact]
    public async Task ClusterQueriesAsync_UsesCachedEmbeddingsWhenAvailable()
    {
        // Arrange
        var userId = "user-123";
        var logs = CreateTestLogsWithEmbeddings(15);
        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();

        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .ReturnsAsync(logs);
        _mockEmbeddingFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);
        _mockRepository.Setup(r => r.UpdateAsync(It.IsAny<Guid>(), It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog?)null);

        var mockAIProvider = new Mock<IAIProvider>();
        mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "Topic" });
        _mockAIProviderFactory.Setup(f => f.GetProvider(_settings.RerankingProvider))
            .Returns(mockAIProvider.Object);

        // Act
        await _sut.ClusterQueriesAsync(userId);

        // Assert
        mockEmbeddingProvider.Verify(p => p.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ClusterQueriesAsync_WhenEmbeddingFails_SkipsLog()
    {
        // Arrange
        var userId = "user-123";
        var logs = CreateTestLogs(15);
        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();
        mockEmbeddingProvider.Setup(p => p.GenerateEmbeddingAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmbeddingResponse { Success = false, Error = "Rate limit" });

        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .ReturnsAsync(logs);
        _mockEmbeddingFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);

        // Act
        var result = await _sut.ClusterQueriesAsync(userId);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Failed to generate enough embeddings");
    }

    #endregion

    #region ClusterQueriesAsync - Topic Label Generation Tests

    [Fact]
    public async Task ClusterQueriesAsync_UsesStructuredOutputForLabels()
    {
        // Arrange
        var userId = "user-123";
        var logs = CreateTestLogsWithEmbeddings(15);
        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();

        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .ReturnsAsync(logs);
        _mockEmbeddingFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);
        _mockRepository.Setup(r => r.UpdateAsync(It.IsAny<Guid>(), It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog?)null);

        _mockStructuredOutputService.Setup(s => s.GenerateAsync<TopicLabelResult>(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TopicLabelResult { Label = "Structured Topic" });

        // Act
        var result = await _sut.ClusterQueriesAsync(userId, 3);

        // Assert
        result.TopicLabels.Should().Contain("Structured Topic");
    }

    [Fact]
    public async Task ClusterQueriesAsync_FallsBackToTextBasedLabels()
    {
        // Arrange
        var userId = "user-123";
        var logs = CreateTestLogsWithEmbeddings(15);
        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();

        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .ReturnsAsync(logs);
        _mockEmbeddingFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);
        _mockRepository.Setup(r => r.UpdateAsync(It.IsAny<Guid>(), It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog?)null);

        _mockStructuredOutputService.Setup(s => s.GenerateAsync<TopicLabelResult>(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TopicLabelResult?)null);

        var mockAIProvider = new Mock<IAIProvider>();
        mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "Text-Based Topic" });
        _mockAIProviderFactory.Setup(f => f.GetProvider(_settings.RerankingProvider))
            .Returns(mockAIProvider.Object);

        // Act
        var result = await _sut.ClusterQueriesAsync(userId, 3);

        // Assert
        result.TopicLabels.Should().Contain("Text-Based Topic");
    }

    [Fact]
    public async Task ClusterQueriesAsync_WhenLabelGenerationFails_UsesDefaultLabels()
    {
        // Arrange
        var userId = "user-123";
        var logs = CreateTestLogsWithEmbeddings(15);
        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();

        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .ReturnsAsync(logs);
        _mockEmbeddingFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);
        _mockRepository.Setup(r => r.UpdateAsync(It.IsAny<Guid>(), It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog?)null);

        _mockStructuredOutputService.Setup(s => s.GenerateAsync<TopicLabelResult>(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("API error"));

        _mockAIProviderFactory.Setup(f => f.GetProvider(_settings.RerankingProvider))
            .Returns((IAIProvider?)null);

        // Act
        var result = await _sut.ClusterQueriesAsync(userId, 3);

        // Assert
        result.Success.Should().BeTrue();
        result.TopicLabels.Should().OnlyContain(l => l.StartsWith("Topic "));
    }

    #endregion

    #region GetTopicStatsAsync Tests

    [Fact]
    public async Task GetTopicStatsAsync_WhenNoClusteredLogs_ReturnsEmptyList()
    {
        // Arrange
        var userId = "user-123";
        var logs = CreateTestLogs(10); // No TopicCluster set
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetTopicStatsAsync(userId);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetTopicStatsAsync_ReturnsStatsForEachCluster()
    {
        // Arrange
        var userId = "user-123";
        var logs = new List<RagQueryLog>
        {
            new() { UserId = userId, Query = "q1", TopicCluster = 0, TopicLabel = "Topic A", UserFeedback = "thumbs_up", TopCosineScore = 0.8f, TopRerankScore = 0.9f },
            new() { UserId = userId, Query = "q2", TopicCluster = 0, TopicLabel = "Topic A", UserFeedback = "thumbs_down", TopCosineScore = 0.7f, TopRerankScore = 0.8f },
            new() { UserId = userId, Query = "q3", TopicCluster = 1, TopicLabel = "Topic B", UserFeedback = "thumbs_up", TopCosineScore = 0.9f, TopRerankScore = 0.95f }
        };
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetTopicStatsAsync(userId);

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(s => s.ClusterId == 0 && s.QueryCount == 2);
        result.Should().Contain(s => s.ClusterId == 1 && s.QueryCount == 1);
    }

    [Fact]
    public async Task GetTopicStatsAsync_CalculatesFeedbackStatistics()
    {
        // Arrange
        var userId = "user-123";
        var logs = new List<RagQueryLog>
        {
            new() { UserId = userId, Query = "q1", TopicCluster = 0, TopicLabel = "Topic A", UserFeedback = "thumbs_up" },
            new() { UserId = userId, Query = "q2", TopicCluster = 0, TopicLabel = "Topic A", UserFeedback = "thumbs_up" },
            new() { UserId = userId, Query = "q3", TopicCluster = 0, TopicLabel = "Topic A", UserFeedback = "thumbs_down" },
            new() { UserId = userId, Query = "q4", TopicCluster = 0, TopicLabel = "Topic A", UserFeedback = null }
        };
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetTopicStatsAsync(userId);

        // Assert
        var stats = result.Single();
        stats.QueryCount.Should().Be(4);
        stats.PositiveFeedback.Should().Be(2);
        stats.NegativeFeedback.Should().Be(1);
        stats.PositiveFeedbackRate.Should().BeApproximately(0.667, 0.01);
    }

    [Fact]
    public async Task GetTopicStatsAsync_CalculatesAverageScores()
    {
        // Arrange
        var userId = "user-123";
        var logs = new List<RagQueryLog>
        {
            new() { UserId = userId, Query = "q1", TopicCluster = 0, TopCosineScore = 0.8f, TopRerankScore = 0.9f },
            new() { UserId = userId, Query = "q2", TopicCluster = 0, TopCosineScore = 0.6f, TopRerankScore = 0.7f }
        };
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetTopicStatsAsync(userId);

        // Assert
        var stats = result.Single();
        stats.AvgCosineScore.Should().BeApproximately(0.7, 0.01);
        stats.AvgRerankScore.Should().BeApproximately(0.8, 0.01);
    }

    [Fact]
    public async Task GetTopicStatsAsync_IncludesSampleQueries()
    {
        // Arrange
        var userId = "user-123";
        var logs = Enumerable.Range(1, 10)
            .Select(i => new RagQueryLog
            {
                UserId = userId,
                Query = $"Query number {i}",
                TopicCluster = 0
            })
            .ToList();
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetTopicStatsAsync(userId);

        // Assert
        var stats = result.Single();
        stats.SampleQueries.Should().HaveCount(5); // SAMPLE_QUERIES_PER_CLUSTER
    }

    [Fact]
    public async Task GetTopicStatsAsync_TruncatesLongQueries()
    {
        // Arrange
        var userId = "user-123";
        var longQuery = new string('a', 150);
        var logs = new List<RagQueryLog>
        {
            new() { UserId = userId, Query = longQuery, TopicCluster = 0 }
        };
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetTopicStatsAsync(userId);

        // Assert
        var stats = result.Single();
        stats.SampleQueries.First().Length.Should().BeLessThanOrEqualTo(103); // 100 + "..."
        stats.SampleQueries.First().Should().EndWith("...");
    }

    [Fact]
    public async Task GetTopicStatsAsync_UsesDefaultLabelWhenNull()
    {
        // Arrange
        var userId = "user-123";
        var logs = new List<RagQueryLog>
        {
            new() { UserId = userId, Query = "q1", TopicCluster = 2, TopicLabel = null }
        };
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetTopicStatsAsync(userId);

        // Assert
        var stats = result.Single();
        stats.Label.Should().Be("Topic 3"); // ClusterId + 1
    }

    [Fact]
    public async Task GetTopicStatsAsync_OrdersByQueryCountDescending()
    {
        // Arrange
        var userId = "user-123";
        var logs = new List<RagQueryLog>
        {
            new() { UserId = userId, Query = "q1", TopicCluster = 0 },
            new() { UserId = userId, Query = "q2", TopicCluster = 1 },
            new() { UserId = userId, Query = "q3", TopicCluster = 1 },
            new() { UserId = userId, Query = "q4", TopicCluster = 1 }
        };
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetTopicStatsAsync(userId);

        // Assert
        result.Should().HaveCount(2);
        result.First().QueryCount.Should().Be(3);
        result.Last().QueryCount.Should().Be(1);
    }

    [Fact]
    public async Task GetTopicStatsAsync_WhenRepositoryThrows_ReturnsEmptyList()
    {
        // Arrange
        var userId = "user-123";
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetTopicStatsAsync(userId);

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

    [Fact]
    public async Task GetTopicStatsAsync_HandlesNullScores()
    {
        // Arrange
        var userId = "user-123";
        var logs = new List<RagQueryLog>
        {
            new() { UserId = userId, Query = "q1", TopicCluster = 0, TopCosineScore = null, TopRerankScore = null },
            new() { UserId = userId, Query = "q2", TopicCluster = 0, TopCosineScore = 0.8f, TopRerankScore = 0.9f }
        };
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetTopicStatsAsync(userId);

        // Assert
        var stats = result.Single();
        stats.AvgCosineScore.Should().BeApproximately(0.8, 0.01); // Only non-null value - use wider precision for float conversion
        stats.AvgRerankScore.Should().BeApproximately(0.9, 0.01);
    }

    #endregion

    #region K-Means Clustering Edge Cases

    [Fact]
    public async Task ClusterQueriesAsync_WhenClusterCountExceedsDataSize_AdjustsClusterCount()
    {
        // Arrange
        var userId = "user-123";
        var logs = CreateTestLogsWithEmbeddings(15);
        var mockEmbeddingProvider = new Mock<IEmbeddingProvider>();

        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<DateTime>()))
            .ReturnsAsync(logs);
        _mockEmbeddingFactory.Setup(f => f.GetDefaultProvider())
            .Returns(mockEmbeddingProvider.Object);
        _mockRepository.Setup(r => r.UpdateAsync(It.IsAny<Guid>(), It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog?)null);

        var mockAIProvider = new Mock<IAIProvider>();
        mockAIProvider.Setup(p => p.GenerateCompletionAsync(It.IsAny<AIRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AIResponse { Success = true, Content = "Topic" });
        _mockAIProviderFactory.Setup(f => f.GetProvider(_settings.RerankingProvider))
            .Returns(mockAIProvider.Object);

        // Act
        var result = await _sut.ClusterQueriesAsync(userId, clusterCount: 20); // More than data allows

        // Assert
        result.Success.Should().BeTrue();
        result.ClusterCount.Should().BeLessThanOrEqualTo(5); // 15 / 3 = 5 max
    }

    #endregion

    #region Helper Methods

    private static List<RagQueryLog> CreateTestLogs(int count)
    {
        return Enumerable.Range(1, count)
            .Select(i => new RagQueryLog
            {
                Id = Guid.NewGuid(),
                UserId = "user-123",
                Query = $"Test query {i}",
                TotalTimeMs = 100
            })
            .ToList();
    }

    private static List<RagQueryLog> CreateTestLogsWithEmbeddings(int count)
    {
        return Enumerable.Range(1, count)
            .Select(i => new RagQueryLog
            {
                Id = Guid.NewGuid(),
                UserId = "user-123",
                Query = $"Test query {i}",
                TotalTimeMs = 100,
                QueryEmbeddingJson = System.Text.Json.JsonSerializer.Serialize(CreateTestEmbedding())
            })
            .ToList();
    }

    private static List<double> CreateTestEmbedding(int dimensions = 1536)
    {
        var random = new Random(42);
        return Enumerable.Range(0, dimensions)
            .Select(_ => random.NextDouble())
            .ToList();
    }

    #endregion
}
