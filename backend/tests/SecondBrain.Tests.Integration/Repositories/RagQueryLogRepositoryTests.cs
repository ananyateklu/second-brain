using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Core.Entities;
using SecondBrain.Infrastructure.Repositories;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.Repositories;

[Collection("PostgreSQL")]
public class RagQueryLogRepositoryTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly Mock<ILogger<SqlRagQueryLogRepository>> _mockLogger;
    private SqlRagQueryLogRepository _sut = null!;

    public RagQueryLogRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
        _mockLogger = new Mock<ILogger<SqlRagQueryLogRepository>>();
    }

    public async Task InitializeAsync()
    {
        // Clean up RAG query log data before each test
        await using var dbContext = _fixture.CreateDbContext();
        dbContext.RagQueryLogs.RemoveRange(dbContext.RagQueryLogs);
        await dbContext.SaveChangesAsync();

        // Create a fresh repository for each test
        _sut = new SqlRagQueryLogRepository(_fixture.CreateDbContext(), _mockLogger.Object);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WhenValidLog_CreatesAndReturnsLog()
    {
        // Arrange
        var log = CreateTestLog("user-123", "test query");

        // Act
        var created = await _sut.CreateAsync(log);

        // Assert
        created.Should().NotBeNull();
        created.Id.Should().NotBe(Guid.Empty);
        created.Query.Should().Be("test query");
        created.UserId.Should().Be("user-123");
    }

    [Fact]
    public async Task CreateAsync_SetsCreatedAtTimestamp()
    {
        // Arrange
        var log = CreateTestLog("user-123", "test query");
        log.CreatedAt = default;
        var beforeCreate = DateTime.UtcNow;

        // Act
        var created = await _sut.CreateAsync(log);
        var afterCreate = DateTime.UtcNow;

        // Assert
        created.CreatedAt.Should().BeOnOrAfter(beforeCreate).And.BeOnOrBefore(afterCreate);
    }

    [Fact]
    public async Task CreateAsync_PreservesAllFields()
    {
        // Arrange
        var log = CreateTestLog("user-123", "complex query");
        log.ConversationId = "conv-123";
        log.QueryEmbeddingTimeMs = 50;
        log.VectorSearchTimeMs = 80;
        log.BM25SearchTimeMs = 30;
        log.RerankTimeMs = 100;
        log.TotalTimeMs = 260;
        log.RetrievedCount = 10;
        log.FinalCount = 5;
        log.AvgCosineScore = 0.85f;
        log.TopCosineScore = 0.95f;
        log.HybridSearchEnabled = true;
        log.HyDEEnabled = true;
        log.MultiQueryEnabled = false;
        log.RerankingEnabled = true;

        // Act
        var created = await _sut.CreateAsync(log);

        // Assert
        created.ConversationId.Should().Be("conv-123");
        created.QueryEmbeddingTimeMs.Should().Be(50);
        created.VectorSearchTimeMs.Should().Be(80);
        created.BM25SearchTimeMs.Should().Be(30);
        created.RerankTimeMs.Should().Be(100);
        created.TotalTimeMs.Should().Be(260);
        created.RetrievedCount.Should().Be(10);
        created.FinalCount.Should().Be(5);
        created.AvgCosineScore.Should().BeApproximately(0.85f, 0.01f);
        created.TopCosineScore.Should().BeApproximately(0.95f, 0.01f);
        created.HybridSearchEnabled.Should().BeTrue();
        created.HyDEEnabled.Should().BeTrue();
        created.MultiQueryEnabled.Should().BeFalse();
        created.RerankingEnabled.Should().BeTrue();
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenLogExists_ReturnsLog()
    {
        // Arrange
        var log = CreateTestLog("user-123", "test query");
        var created = await _sut.CreateAsync(log);

        // Act
        var result = await _sut.GetByIdAsync(created.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(created.Id);
        result.Query.Should().Be("test query");
    }

    [Fact]
    public async Task GetByIdAsync_WhenLogDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByIdAsync(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WhenLogExists_UpdatesFeedbackFields()
    {
        // Arrange
        var log = CreateTestLog("user-123", "test query");
        var created = await _sut.CreateAsync(log);

        var updateLog = new RagQueryLog
        {
            UserFeedback = "thumbs_up",
            FeedbackCategory = "accuracy",
            FeedbackComment = "Very relevant results"
        };

        // Act
        var updated = await _sut.UpdateAsync(created.Id, updateLog);

        // Assert
        updated.Should().NotBeNull();
        updated!.UserFeedback.Should().Be("thumbs_up");
        updated.FeedbackCategory.Should().Be("accuracy");
        updated.FeedbackComment.Should().Be("Very relevant results");
    }

    [Fact]
    public async Task UpdateAsync_WhenLogDoesNotExist_ReturnsNull()
    {
        // Arrange
        var updateLog = new RagQueryLog { UserFeedback = "thumbs_up" };

        // Act
        var updated = await _sut.UpdateAsync(Guid.NewGuid(), updateLog);

        // Assert
        updated.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_PreservesOriginalData()
    {
        // Arrange
        var log = CreateTestLog("user-123", "original query");
        log.TotalTimeMs = 100;
        log.HybridSearchEnabled = true;
        var created = await _sut.CreateAsync(log);

        var updateLog = new RagQueryLog { UserFeedback = "thumbs_down" };

        // Act
        var updated = await _sut.UpdateAsync(created.Id, updateLog);

        // Assert
        updated!.Query.Should().Be("original query");
        updated.TotalTimeMs.Should().Be(100);
        updated.HybridSearchEnabled.Should().BeTrue();
    }

    #endregion

    #region GetByUserIdAsync Tests

    [Fact]
    public async Task GetByUserIdAsync_WhenNoLogs_ReturnsEmptyList()
    {
        // Act
        var result = await _sut.GetByUserIdAsync("user-123");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetByUserIdAsync_ReturnsOnlyUserLogs()
    {
        // Arrange
        var log1 = CreateTestLog("user-123", "query 1");
        var log2 = CreateTestLog("user-123", "query 2");
        var log3 = CreateTestLog("user-456", "other user query");

        await _sut.CreateAsync(log1);
        await _sut.CreateAsync(log2);
        await _sut.CreateAsync(log3);

        // Act
        var result = (await _sut.GetByUserIdAsync("user-123")).ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(l => l.UserId.Should().Be("user-123"));
    }

    [Fact]
    public async Task GetByUserIdAsync_ReturnsLogsOrderedByCreatedAtDescending()
    {
        // Arrange
        var log1 = CreateTestLog("user-123", "query 1");
        log1.CreatedAt = DateTime.UtcNow.AddMinutes(-10);
        var log2 = CreateTestLog("user-123", "query 2");
        log2.CreatedAt = DateTime.UtcNow.AddMinutes(-5);
        var log3 = CreateTestLog("user-123", "query 3");
        log3.CreatedAt = DateTime.UtcNow;

        await _sut.CreateAsync(log1);
        await _sut.CreateAsync(log2);
        await _sut.CreateAsync(log3);

        // Act
        var result = (await _sut.GetByUserIdAsync("user-123")).ToList();

        // Assert
        result.Should().HaveCount(3);
        result[0].Query.Should().Be("query 3");
        result[1].Query.Should().Be("query 2");
        result[2].Query.Should().Be("query 1");
    }

    [Fact]
    public async Task GetByUserIdAsync_WithSinceFilter_ReturnsLogsAfterDate()
    {
        // Arrange
        var oldLog = CreateTestLog("user-123", "old query");
        oldLog.CreatedAt = DateTime.UtcNow.AddDays(-5);
        var recentLog = CreateTestLog("user-123", "recent query");
        recentLog.CreatedAt = DateTime.UtcNow;

        await _sut.CreateAsync(oldLog);
        await _sut.CreateAsync(recentLog);

        // Act
        var since = DateTime.UtcNow.AddDays(-1);
        var result = (await _sut.GetByUserIdAsync("user-123", since)).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].Query.Should().Be("recent query");
    }

    #endregion

    #region GetWithFeedbackAsync Tests

    [Fact]
    public async Task GetWithFeedbackAsync_ReturnsOnlyLogsWithFeedback()
    {
        // Arrange
        var logWithFeedback = CreateTestLog("user-123", "query with feedback");
        var logWithoutFeedback = CreateTestLog("user-123", "query without feedback");

        var createdWithFeedback = await _sut.CreateAsync(logWithFeedback);
        await _sut.CreateAsync(logWithoutFeedback);

        // Update one log to have feedback
        await _sut.UpdateAsync(createdWithFeedback.Id, new RagQueryLog { UserFeedback = "thumbs_up" });

        // Act
        var result = (await _sut.GetWithFeedbackAsync("user-123")).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].UserFeedback.Should().Be("thumbs_up");
    }

    [Fact]
    public async Task GetWithFeedbackAsync_ReturnsOnlyUserLogsWithFeedback()
    {
        // Arrange
        var userLog = CreateTestLog("user-123", "user query");
        var otherUserLog = CreateTestLog("user-456", "other user query");

        var createdUserLog = await _sut.CreateAsync(userLog);
        var createdOtherLog = await _sut.CreateAsync(otherUserLog);

        await _sut.UpdateAsync(createdUserLog.Id, new RagQueryLog { UserFeedback = "thumbs_up" });
        await _sut.UpdateAsync(createdOtherLog.Id, new RagQueryLog { UserFeedback = "thumbs_down" });

        // Act
        var result = (await _sut.GetWithFeedbackAsync("user-123")).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].UserId.Should().Be("user-123");
    }

    [Fact]
    public async Task GetWithFeedbackAsync_WithSinceFilter_ReturnsFilteredResults()
    {
        // Arrange
        var oldLog = CreateTestLog("user-123", "old query");
        oldLog.CreatedAt = DateTime.UtcNow.AddDays(-5);
        var recentLog = CreateTestLog("user-123", "recent query");
        recentLog.CreatedAt = DateTime.UtcNow;

        var createdOld = await _sut.CreateAsync(oldLog);
        var createdRecent = await _sut.CreateAsync(recentLog);

        await _sut.UpdateAsync(createdOld.Id, new RagQueryLog { UserFeedback = "thumbs_down" });
        await _sut.UpdateAsync(createdRecent.Id, new RagQueryLog { UserFeedback = "thumbs_up" });

        // Act
        var since = DateTime.UtcNow.AddDays(-1);
        var result = (await _sut.GetWithFeedbackAsync("user-123", since)).ToList();

        // Assert
        result.Should().ContainSingle();
        result[0].UserFeedback.Should().Be("thumbs_up");
    }

    #endregion

    #region Integration Scenarios

    [Fact]
    public async Task FullWorkflow_CreateQueryAndAddFeedback()
    {
        // Arrange
        var log = CreateTestLog("user-123", "search for machine learning");
        log.RetrievedCount = 10;
        log.FinalCount = 5;
        log.TotalTimeMs = 200;
        log.AvgCosineScore = 0.85f;

        // Act - Create
        var created = await _sut.CreateAsync(log);

        // Assert - Created
        created.Id.Should().NotBe(Guid.Empty);

        // Act - Add Feedback
        var feedbackLog = new RagQueryLog
        {
            UserFeedback = "thumbs_up",
            FeedbackCategory = "relevance",
            FeedbackComment = "All results were highly relevant to my query"
        };
        var updated = await _sut.UpdateAsync(created.Id, feedbackLog);

        // Assert - Updated
        updated.Should().NotBeNull();
        updated!.UserFeedback.Should().Be("thumbs_up");

        // Act - Retrieve
        var retrieved = await _sut.GetByIdAsync(created.Id);

        // Assert - Retrieved
        retrieved!.Query.Should().Be("search for machine learning");
        retrieved.UserFeedback.Should().Be("thumbs_up");
        retrieved.RetrievedCount.Should().Be(10);
    }

    [Fact]
    public async Task Workflow_TrackQueryPerformanceMetrics()
    {
        // Arrange
        var log = CreateTestLog("user-123", "complex search query");
        log.QueryEmbeddingTimeMs = 45;
        log.VectorSearchTimeMs = 120;
        log.BM25SearchTimeMs = 35;
        log.RerankTimeMs = 80;
        log.TotalTimeMs = 280;
        log.HybridSearchEnabled = true;
        log.RerankingEnabled = true;
        log.AvgCosineScore = 0.78f;
        log.AvgBM25Score = 0.65f;
        log.AvgRerankScore = 0.88f;

        // Act
        var created = await _sut.CreateAsync(log);

        // Assert
        created.QueryEmbeddingTimeMs.Should().Be(45);
        created.VectorSearchTimeMs.Should().Be(120);
        created.BM25SearchTimeMs.Should().Be(35);
        created.RerankTimeMs.Should().Be(80);
        created.TotalTimeMs.Should().Be(280);
        created.HybridSearchEnabled.Should().BeTrue();
        created.RerankingEnabled.Should().BeTrue();
        created.AvgCosineScore.Should().BeApproximately(0.78f, 0.01f);
        created.AvgBM25Score.Should().BeApproximately(0.65f, 0.01f);
        created.AvgRerankScore.Should().BeApproximately(0.88f, 0.01f);
    }

    #endregion

    #region Helper Methods

    private static RagQueryLog CreateTestLog(string userId, string query)
    {
        return new RagQueryLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Query = query,
            HybridSearchEnabled = true,
            HyDEEnabled = false,
            MultiQueryEnabled = false,
            RerankingEnabled = false,
            CreatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
