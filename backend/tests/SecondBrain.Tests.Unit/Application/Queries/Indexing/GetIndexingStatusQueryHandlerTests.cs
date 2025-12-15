using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Queries.Indexing.GetIndexingStatus;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Entities;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Queries.Indexing;

/// <summary>
/// Unit tests for GetIndexingStatusQueryHandler.
/// Tests indexing job status retrieval through CQRS query pattern.
/// </summary>
public class GetIndexingStatusQueryHandlerTests
{
    private readonly Mock<IIndexingService> _mockIndexingService;
    private readonly Mock<ILogger<GetIndexingStatusQueryHandler>> _mockLogger;
    private readonly GetIndexingStatusQueryHandler _sut;

    public GetIndexingStatusQueryHandlerTests()
    {
        _mockIndexingService = new Mock<IIndexingService>();
        _mockLogger = new Mock<ILogger<GetIndexingStatusQueryHandler>>();
        _sut = new GetIndexingStatusQueryHandler(
            _mockIndexingService.Object,
            _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithExistingJob_ReturnsSuccessWithJobResponse()
    {
        // Arrange
        var jobId = "job-123";
        var query = new GetIndexingStatusQuery(jobId);

        var job = CreateTestJob(jobId, "user-456");

        _mockIndexingService
            .Setup(s => s.GetIndexingStatusAsync(jobId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.Id.Should().Be(jobId);
    }

    [Fact]
    public async Task Handle_ReturnsCompleteJobStatus()
    {
        // Arrange
        var jobId = "job-123";
        var query = new GetIndexingStatusQuery(jobId);

        var job = new IndexingJob
        {
            Id = jobId,
            UserId = "user-456",
            Status = IndexingStatus.Running,
            TotalNotes = 100,
            ProcessedNotes = 75,
            SkippedNotes = 3,
            DeletedNotes = 2,
            TotalChunks = 500,
            ProcessedChunks = 375,
            EmbeddingProvider = "OpenAI",
            EmbeddingModel = "text-embedding-3-small",
            StartedAt = DateTime.UtcNow.AddMinutes(-5),
            CreatedAt = DateTime.UtcNow.AddMinutes(-6)
        };

        _mockIndexingService
            .Setup(s => s.GetIndexingStatusAsync(jobId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(IndexingStatus.Running);
        result.Value.TotalNotes.Should().Be(100);
        result.Value.ProcessedNotes.Should().Be(75);
        result.Value.SkippedNotes.Should().Be(3);
        result.Value.DeletedNotes.Should().Be(2);
        result.Value.TotalChunks.Should().Be(500);
        result.Value.ProcessedChunks.Should().Be(375);
        result.Value.EmbeddingProvider.Should().Be("OpenAI");
        result.Value.EmbeddingModel.Should().Be("text-embedding-3-small");
    }

    [Fact]
    public async Task Handle_WithCompletedJob_ReturnsCompletedStatus()
    {
        // Arrange
        var jobId = "job-123";
        var query = new GetIndexingStatusQuery(jobId);

        var job = CreateTestJob(jobId, "user-456");
        job.Status = IndexingStatus.Completed;
        job.CompletedAt = DateTime.UtcNow;
        job.ProcessedNotes = 100;
        job.TotalNotes = 100;

        _mockIndexingService
            .Setup(s => s.GetIndexingStatusAsync(jobId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(IndexingStatus.Completed);
        result.Value.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_WithFailedJob_ReturnsErrorInfo()
    {
        // Arrange
        var jobId = "job-123";
        var query = new GetIndexingStatusQuery(jobId);

        var job = CreateTestJob(jobId, "user-456");
        job.Status = IndexingStatus.Failed;
        job.Errors = new List<string> { "Connection timeout", "Rate limit exceeded" };

        _mockIndexingService
            .Setup(s => s.GetIndexingStatusAsync(jobId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(IndexingStatus.Failed);
        result.Value.Errors.Should().HaveCount(2);
        result.Value.Errors.Should().Contain("Connection timeout");
    }

    [Theory]
    [InlineData(IndexingStatus.Pending)]
    [InlineData(IndexingStatus.Running)]
    [InlineData(IndexingStatus.Completed)]
    [InlineData(IndexingStatus.Failed)]
    [InlineData(IndexingStatus.PartiallyCompleted)]
    [InlineData(IndexingStatus.Cancelled)]
    public async Task Handle_ReturnsCorrectStatus(string expectedStatus)
    {
        // Arrange
        var jobId = "job-123";
        var query = new GetIndexingStatusQuery(jobId);

        var job = CreateTestJob(jobId, "user-456");
        job.Status = expectedStatus;

        _mockIndexingService
            .Setup(s => s.GetIndexingStatusAsync(jobId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(expectedStatus);
    }

    #endregion

    #region Not Found Scenarios

    [Fact]
    public async Task Handle_WhenJobNotFound_ReturnsNotFoundError()
    {
        // Arrange
        var query = new GetIndexingStatusQuery("non-existent-job");

        _mockIndexingService
            .Setup(s => s.GetIndexingStatusAsync("non-existent-job", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IndexingJob?)null);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("NotFound");
        result.Error.Message.Should().Contain("non-existent-job");
    }

    [Fact]
    public async Task Handle_WhenServiceReturnsNull_ReturnsFailure()
    {
        // Arrange
        var query = new GetIndexingStatusQuery("any-id");

        _mockIndexingService
            .Setup(s => s.GetIndexingStatusAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IndexingJob?)null);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
    }

    #endregion

    #region Exception Handling

    [Fact]
    public async Task Handle_WhenServiceThrows_ReturnsInternalError()
    {
        // Arrange
        var query = new GetIndexingStatusQuery("job-123");

        _mockIndexingService
            .Setup(s => s.GetIndexingStatusAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("InternalError");
        result.Error.Message.Should().Contain("Failed to get indexing status");
    }

    #endregion

    #region Service Interaction Tests

    [Fact]
    public async Task Handle_CallsServiceWithCorrectJobId()
    {
        // Arrange
        var jobId = "specific-job-id";
        var query = new GetIndexingStatusQuery(jobId);

        var job = CreateTestJob(jobId, "user-456");
        _mockIndexingService
            .Setup(s => s.GetIndexingStatusAsync(jobId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert
        _mockIndexingService.Verify(s => s.GetIndexingStatusAsync(jobId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_PassesCancellationToken()
    {
        // Arrange
        var query = new GetIndexingStatusQuery("job-123");
        using var cts = new CancellationTokenSource();
        var token = cts.Token;

        var job = CreateTestJob("job-123", "user-456");
        _mockIndexingService
            .Setup(s => s.GetIndexingStatusAsync("job-123", token))
            .ReturnsAsync(job);

        // Act
        await _sut.Handle(query, token);

        // Assert
        _mockIndexingService.Verify(s => s.GetIndexingStatusAsync("job-123", token), Times.Once);
    }

    [Fact]
    public async Task Handle_OnlyCallsServiceOnce()
    {
        // Arrange
        var query = new GetIndexingStatusQuery("job-123");

        var job = CreateTestJob("job-123", "user-456");
        _mockIndexingService
            .Setup(s => s.GetIndexingStatusAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert
        _mockIndexingService.Verify(
            s => s.GetIndexingStatusAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion

    #region Helper Methods

    private static IndexingJob CreateTestJob(string id, string userId)
    {
        return new IndexingJob
        {
            Id = id,
            UserId = userId,
            Status = IndexingStatus.Pending,
            TotalNotes = 0,
            ProcessedNotes = 0,
            TotalChunks = 0,
            ProcessedChunks = 0,
            EmbeddingProvider = "OpenAI",
            EmbeddingModel = "text-embedding-3-small",
            CreatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
