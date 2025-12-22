using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.RAG;

/// <summary>
/// Unit tests for RagAnalyticsService.
/// Tests RAG query logging, feedback tracking, and performance statistics.
/// </summary>
public class RagAnalyticsServiceTests
{
    private readonly Mock<IRagQueryLogRepository> _mockRepository;
    private readonly Mock<ILogger<RagAnalyticsService>> _mockLogger;
    private readonly RagAnalyticsService _sut;

    public RagAnalyticsServiceTests()
    {
        _mockRepository = new Mock<IRagQueryLogRepository>();
        _mockLogger = new Mock<ILogger<RagAnalyticsService>>();

        _sut = new RagAnalyticsService(
            _mockRepository.Object,
            _mockLogger.Object);
    }

    #region LogQueryAsync Tests

    [Fact]
    public async Task LogQueryAsync_WhenValidMetrics_CreatesLogAndReturnsId()
    {
        // Arrange
        var metrics = CreateTestMetrics();
        Guid? capturedLogId = null;
        _mockRepository.Setup(r => r.CreateAsync(It.IsAny<RagQueryLog>()))
            .Callback<RagQueryLog>(log => capturedLogId = log.Id)
            .ReturnsAsync((RagQueryLog)null!);

        // Act
        var result = await _sut.LogQueryAsync(metrics);

        // Assert
        result.Should().NotBeNull();
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<RagQueryLog>()), Times.Once);
    }

    [Fact]
    public async Task LogQueryAsync_MapsAllMetricsFieldsCorrectly()
    {
        // Arrange
        var metrics = new RagQueryMetrics
        {
            UserId = "user-123",
            ConversationId = "conv-456",
            Query = "test query",
            QueryEmbeddingTimeMs = 50,
            VectorSearchTimeMs = 100,
            BM25SearchTimeMs = 75,
            RerankTimeMs = 200,
            TotalTimeMs = 425,
            RetrievedCount = 20,
            FinalCount = 5,
            AvgCosineScore = 0.85f,
            AvgBM25Score = 0.75f,
            AvgRerankScore = 0.9f,
            TopCosineScore = 0.95f,
            TopRerankScore = 0.98f,
            HybridSearchEnabled = true,
            HyDEEnabled = true,
            MultiQueryEnabled = false,
            RerankingEnabled = true
        };

        RagQueryLog? capturedLog = null;
        _mockRepository.Setup(r => r.CreateAsync(It.IsAny<RagQueryLog>()))
            .Callback<RagQueryLog>(log => capturedLog = log)
            .ReturnsAsync((RagQueryLog)null!);

        // Act
        await _sut.LogQueryAsync(metrics);

        // Assert
        capturedLog.Should().NotBeNull();
        capturedLog!.UserId.Should().Be("user-123");
        capturedLog.ConversationId.Should().Be("conv-456");
        capturedLog.Query.Should().Be("test query");
        capturedLog.QueryEmbeddingTimeMs.Should().Be(50);
        capturedLog.VectorSearchTimeMs.Should().Be(100);
        capturedLog.BM25SearchTimeMs.Should().Be(75);
        capturedLog.RerankTimeMs.Should().Be(200);
        capturedLog.TotalTimeMs.Should().Be(425);
        capturedLog.RetrievedCount.Should().Be(20);
        capturedLog.FinalCount.Should().Be(5);
        capturedLog.AvgCosineScore.Should().Be(0.85f);
        capturedLog.AvgBM25Score.Should().Be(0.75f);
        capturedLog.AvgRerankScore.Should().Be(0.9f);
        capturedLog.TopCosineScore.Should().Be(0.95f);
        capturedLog.TopRerankScore.Should().Be(0.98f);
        capturedLog.HybridSearchEnabled.Should().BeTrue();
        capturedLog.HyDEEnabled.Should().BeTrue();
        capturedLog.MultiQueryEnabled.Should().BeFalse();
        capturedLog.RerankingEnabled.Should().BeTrue();
    }

    [Fact]
    public async Task LogQueryAsync_WhenRepositoryThrows_ReturnsNullAndLogsError()
    {
        // Arrange
        var metrics = CreateTestMetrics();
        _mockRepository.Setup(r => r.CreateAsync(It.IsAny<RagQueryLog>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.LogQueryAsync(metrics);

        // Assert
        result.Should().BeNull();
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
    public async Task LogQueryAsync_LogsDebugMessageOnSuccess()
    {
        // Arrange
        var metrics = CreateTestMetrics();
        _mockRepository.Setup(r => r.CreateAsync(It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog)null!);

        // Act
        await _sut.LogQueryAsync(metrics);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Debug,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Logged RAG query analytics")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region UpdateFeedbackAsync Tests

    [Fact]
    public async Task UpdateFeedbackAsync_WhenLogExists_UpdatesFeedback()
    {
        // Arrange
        var logId = Guid.NewGuid();
        var existingLog = new RagQueryLog { Id = logId, UserId = "user-123", Query = "test" };
        _mockRepository.Setup(r => r.GetByIdAsync(logId))
            .ReturnsAsync(existingLog);
        _mockRepository.Setup(r => r.UpdateAsync(logId, It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog)null!);

        // Act
        await _sut.UpdateFeedbackAsync(logId, "thumbs_up", "helpful", "Great answer!");

        // Assert
        _mockRepository.Verify(r => r.UpdateAsync(logId, It.Is<RagQueryLog>(
            log => log.UserFeedback == "thumbs_up" &&
                   log.FeedbackCategory == "helpful" &&
                   log.FeedbackComment == "Great answer!")), Times.Once);
    }

    [Fact]
    public async Task UpdateFeedbackAsync_WhenLogNotFound_LogsWarning()
    {
        // Arrange
        var logId = Guid.NewGuid();
        _mockRepository.Setup(r => r.GetByIdAsync(logId))
            .ReturnsAsync((RagQueryLog?)null);

        // Act
        await _sut.UpdateFeedbackAsync(logId, "thumbs_up");

        // Assert
        _mockRepository.Verify(r => r.UpdateAsync(It.IsAny<Guid>(), It.IsAny<RagQueryLog>()), Times.Never);
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("not found")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateFeedbackAsync_WhenRepositoryThrows_LogsError()
    {
        // Arrange
        var logId = Guid.NewGuid();
        _mockRepository.Setup(r => r.GetByIdAsync(logId))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        await _sut.UpdateFeedbackAsync(logId, "thumbs_down");

        // Assert
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
    public async Task UpdateFeedbackAsync_WhenNullCategory_UpdatesWithNullCategory()
    {
        // Arrange
        var logId = Guid.NewGuid();
        var existingLog = new RagQueryLog { Id = logId, UserId = "user-123", Query = "test" };
        _mockRepository.Setup(r => r.GetByIdAsync(logId))
            .ReturnsAsync(existingLog);
        _mockRepository.Setup(r => r.UpdateAsync(logId, It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog)null!);

        // Act
        await _sut.UpdateFeedbackAsync(logId, "thumbs_up", null, null);

        // Assert
        _mockRepository.Verify(r => r.UpdateAsync(logId, It.Is<RagQueryLog>(
            log => log.UserFeedback == "thumbs_up" &&
                   log.FeedbackCategory == null &&
                   log.FeedbackComment == null)), Times.Once);
    }

    [Fact]
    public async Task UpdateFeedbackAsync_LogsSuccessOnUpdate()
    {
        // Arrange
        var logId = Guid.NewGuid();
        var existingLog = new RagQueryLog { Id = logId, UserId = "user-123", Query = "test" };
        _mockRepository.Setup(r => r.GetByIdAsync(logId))
            .ReturnsAsync(existingLog);
        _mockRepository.Setup(r => r.UpdateAsync(logId, It.IsAny<RagQueryLog>()))
            .ReturnsAsync((RagQueryLog)null!);

        // Act
        await _sut.UpdateFeedbackAsync(logId, "thumbs_up");

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Updated RAG query feedback")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region GetPerformanceStatsAsync Tests

    [Fact]
    public async Task GetPerformanceStatsAsync_WhenNoLogs_ReturnsEmptyStats()
    {
        // Arrange
        var userId = "user-123";
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(new List<RagQueryLog>());

        // Act
        var result = await _sut.GetPerformanceStatsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.TotalQueries.Should().Be(0);
        result.QueriesWithFeedback.Should().Be(0);
        result.PositiveFeedback.Should().Be(0);
        result.NegativeFeedback.Should().Be(0);
    }

    [Fact]
    public async Task GetPerformanceStatsAsync_CalculatesBasicStatistics()
    {
        // Arrange
        var userId = "user-123";
        var logs = new List<RagQueryLog>
        {
            new() { UserId = userId, Query = "q1", TotalTimeMs = 100, RetrievedCount = 10, AvgCosineScore = 0.8f, AvgRerankScore = 0.9f },
            new() { UserId = userId, Query = "q2", TotalTimeMs = 200, RetrievedCount = 20, AvgCosineScore = 0.7f, AvgRerankScore = 0.8f },
            new() { UserId = userId, Query = "q3", TotalTimeMs = 150, RetrievedCount = 15, AvgCosineScore = 0.75f, AvgRerankScore = 0.85f }
        };
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetPerformanceStatsAsync(userId);

        // Assert
        result.TotalQueries.Should().Be(3);
        result.AvgTotalTimeMs.Should().Be(150);
        result.AvgRetrievedCount.Should().Be(15);
        result.AvgCosineScore.Should().BeApproximately(0.75, 0.01);
        result.AvgRerankScore.Should().BeApproximately(0.85, 0.01);
    }

    [Fact]
    public async Task GetPerformanceStatsAsync_CalculatesFeedbackStatistics()
    {
        // Arrange
        var userId = "user-123";
        var logs = new List<RagQueryLog>
        {
            new() { UserId = userId, Query = "q1", TotalTimeMs = 100, UserFeedback = "thumbs_up" },
            new() { UserId = userId, Query = "q2", TotalTimeMs = 100, UserFeedback = "thumbs_up" },
            new() { UserId = userId, Query = "q3", TotalTimeMs = 100, UserFeedback = "thumbs_down" },
            new() { UserId = userId, Query = "q4", TotalTimeMs = 100, UserFeedback = null },
            new() { UserId = userId, Query = "q5", TotalTimeMs = 100, UserFeedback = "" }
        };
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetPerformanceStatsAsync(userId);

        // Assert
        result.TotalQueries.Should().Be(5);
        result.QueriesWithFeedback.Should().Be(3);
        result.PositiveFeedback.Should().Be(2);
        result.NegativeFeedback.Should().Be(1);
        result.PositiveFeedbackRate.Should().BeApproximately(0.667, 0.01);
    }

    [Fact]
    public async Task GetPerformanceStatsAsync_CalculatesCorrelation_WhenSufficientData()
    {
        // Arrange
        var userId = "user-123";
        var logs = Enumerable.Range(1, 15)
            .Select(i => new RagQueryLog
            {
                UserId = userId,
                Query = $"q{i}",
                TotalTimeMs = 100,
                RetrievedCount = 5,
                AvgCosineScore = i * 0.04f,
                AvgRerankScore = i * 0.05f,
                TopCosineScore = i * 0.05f,
                TopRerankScore = i * 0.06f,
                UserFeedback = i % 2 == 0 ? "thumbs_up" : "thumbs_down"
            })
            .ToList();
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetPerformanceStatsAsync(userId);

        // Assert
        result.CosineScoreCorrelation.Should().NotBeNull();
        result.RerankScoreCorrelation.Should().NotBeNull();
    }

    [Fact]
    public async Task GetPerformanceStatsAsync_DoesNotCalculateCorrelation_WhenInsufficientData()
    {
        // Arrange
        var userId = "user-123";
        var logs = Enumerable.Range(1, 5)
            .Select(i => new RagQueryLog
            {
                UserId = userId,
                Query = $"q{i}",
                TotalTimeMs = 100,
                TopCosineScore = i * 0.1f,
                UserFeedback = "thumbs_up"
            })
            .ToList();
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetPerformanceStatsAsync(userId);

        // Assert
        result.CosineScoreCorrelation.Should().BeNull();
        result.RerankScoreCorrelation.Should().BeNull();
    }

    [Fact]
    public async Task GetPerformanceStatsAsync_UsesSinceParameter()
    {
        // Arrange
        var userId = "user-123";
        var since = DateTime.UtcNow.AddDays(-7);
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, since))
            .ReturnsAsync(new List<RagQueryLog>());

        // Act
        await _sut.GetPerformanceStatsAsync(userId, since);

        // Assert
        _mockRepository.Verify(r => r.GetByUserIdAsync(userId, since), Times.Once);
    }

    [Fact]
    public async Task GetPerformanceStatsAsync_WhenRepositoryThrows_ReturnsEmptyStatsAndLogsError()
    {
        // Arrange
        var userId = "user-123";
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetPerformanceStatsAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.TotalQueries.Should().Be(0);
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
    public async Task GetPerformanceStatsAsync_HandlesNullMetricValues()
    {
        // Arrange
        var userId = "user-123";
        var logs = new List<RagQueryLog>
        {
            new() { UserId = userId, Query = "q1", TotalTimeMs = null, RetrievedCount = null, AvgCosineScore = null, AvgRerankScore = null },
            new() { UserId = userId, Query = "q2", TotalTimeMs = 100, RetrievedCount = 10, AvgCosineScore = 0.8f, AvgRerankScore = 0.9f }
        };
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetPerformanceStatsAsync(userId);

        // Assert
        result.TotalQueries.Should().Be(2);
        // Averages should be calculated from non-null values only
        result.AvgTotalTimeMs.Should().Be(100);
        result.AvgRetrievedCount.Should().Be(10);
    }

    [Fact]
    public async Task GetPerformanceStatsAsync_WhenZeroFeedback_ReturnsZeroRate()
    {
        // Arrange
        var userId = "user-123";
        var logs = new List<RagQueryLog>
        {
            new() { UserId = userId, Query = "q1", TotalTimeMs = 100, UserFeedback = null },
            new() { UserId = userId, Query = "q2", TotalTimeMs = 100, UserFeedback = "" }
        };
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetPerformanceStatsAsync(userId);

        // Assert
        result.QueriesWithFeedback.Should().Be(0);
        result.PositiveFeedbackRate.Should().Be(0);
    }

    #endregion

    #region Correlation Calculation Edge Cases

    [Fact]
    public async Task GetPerformanceStatsAsync_WhenAllSameScores_ReturnsNullCorrelation()
    {
        // Arrange
        var userId = "user-123";
        var logs = Enumerable.Range(1, 15)
            .Select(i => new RagQueryLog
            {
                UserId = userId,
                Query = $"q{i}",
                TotalTimeMs = 100,
                TopCosineScore = 0.5f, // All same
                UserFeedback = i % 2 == 0 ? "thumbs_up" : "thumbs_down"
            })
            .ToList();
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetPerformanceStatsAsync(userId);

        // Assert
        result.CosineScoreCorrelation.Should().BeNull();
    }

    [Fact]
    public async Task GetPerformanceStatsAsync_WhenAllPositiveFeedback_ReturnsNullCorrelation()
    {
        // Arrange
        var userId = "user-123";
        var logs = Enumerable.Range(1, 15)
            .Select(i => new RagQueryLog
            {
                UserId = userId,
                Query = $"q{i}",
                TotalTimeMs = 100,
                TopCosineScore = i * 0.05f,
                UserFeedback = "thumbs_up" // All same
            })
            .ToList();
        _mockRepository.Setup(r => r.GetByUserIdAsync(userId, null))
            .ReturnsAsync(logs);

        // Act
        var result = await _sut.GetPerformanceStatsAsync(userId);

        // Assert
        result.CosineScoreCorrelation.Should().BeNull();
    }

    #endregion

    #region Helper Methods

    private static RagQueryMetrics CreateTestMetrics()
    {
        return new RagQueryMetrics
        {
            UserId = "user-123",
            ConversationId = "conv-456",
            Query = "test query",
            TotalTimeMs = 500,
            RetrievedCount = 10,
            FinalCount = 5,
            AvgCosineScore = 0.8f,
            HybridSearchEnabled = true
        };
    }

    #endregion
}
