using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Commands.Indexing.StartIndexing;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Entities;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Commands.Indexing;

/// <summary>
/// Unit tests for StartIndexingCommandHandler.
/// Tests note indexing job creation through CQRS command pattern.
/// </summary>
public class StartIndexingCommandHandlerTests
{
    private readonly Mock<IIndexingService> _mockIndexingService;
    private readonly Mock<ILogger<StartIndexingCommandHandler>> _mockLogger;
    private readonly StartIndexingCommandHandler _sut;

    public StartIndexingCommandHandlerTests()
    {
        _mockIndexingService = new Mock<IIndexingService>();
        _mockLogger = new Mock<ILogger<StartIndexingCommandHandler>>();
        _sut = new StartIndexingCommandHandler(
            _mockIndexingService.Object,
            _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithValidCommand_ReturnsSuccessWithJobResponse()
    {
        // Arrange
        var command = new StartIndexingCommand(UserId: "user-123");

        var job = CreateTestJob("job-1", "user-123");

        _mockIndexingService
            .Setup(s => s.StartIndexingAsync(
                command.UserId,
                command.EmbeddingProvider,
                command.VectorStoreProvider,
                command.EmbeddingModel,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.Id.Should().Be("job-1");
        result.Value.Status.Should().Be(IndexingStatus.Pending);
    }

    [Fact]
    public async Task Handle_WithCustomProviders_PassesCorrectValues()
    {
        // Arrange
        var command = new StartIndexingCommand(
            UserId: "user-123",
            EmbeddingProvider: "OpenAI",
            VectorStoreProvider: "Pinecone",
            EmbeddingModel: "text-embedding-ada-002"
        );

        var job = CreateTestJob("job-1", "user-123");
        job.EmbeddingProvider = "OpenAI";
        job.EmbeddingModel = "text-embedding-ada-002";

        _mockIndexingService
            .Setup(s => s.StartIndexingAsync(
                command.UserId,
                "OpenAI",
                "Pinecone",
                "text-embedding-ada-002",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.EmbeddingProvider.Should().Be("OpenAI");
        result.Value!.EmbeddingModel.Should().Be("text-embedding-ada-002");
    }

    [Fact]
    public async Task Handle_ReturnsCompleteJobResponse()
    {
        // Arrange
        var command = new StartIndexingCommand(UserId: "user-123");

        var job = new IndexingJob
        {
            Id = "job-123",
            UserId = "user-123",
            Status = IndexingStatus.Running,
            TotalNotes = 100,
            ProcessedNotes = 50,
            SkippedNotes = 5,
            DeletedNotes = 2,
            TotalChunks = 300,
            ProcessedChunks = 150,
            EmbeddingProvider = "OpenAI",
            EmbeddingModel = "text-embedding-3-small",
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow.AddMinutes(-1)
        };

        _mockIndexingService
            .Setup(s => s.StartIndexingAsync(
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.TotalNotes.Should().Be(100);
        result.Value!.ProcessedNotes.Should().Be(50);
        result.Value!.SkippedNotes.Should().Be(5);
        result.Value!.DeletedNotes.Should().Be(2);
        result.Value!.TotalChunks.Should().Be(300);
        result.Value!.ProcessedChunks.Should().Be(150);
    }

    #endregion

    #region Validation Error Scenarios

    [Fact]
    public async Task Handle_WhenInvalidOperationException_ReturnsValidationError()
    {
        // Arrange
        var command = new StartIndexingCommand(UserId: "user-123");

        _mockIndexingService
            .Setup(s => s.StartIndexingAsync(
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Indexing already in progress"));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ValidationFailed");
        result.Error!.Message.Should().Contain("Indexing already in progress");
    }

    [Fact]
    public async Task Handle_WhenArgumentException_ReturnsValidationError()
    {
        // Arrange
        var command = new StartIndexingCommand(
            UserId: "user-123",
            EmbeddingModel: "invalid-model"
        );

        _mockIndexingService
            .Setup(s => s.StartIndexingAsync(
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException("Invalid embedding model"));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ValidationFailed");
        result.Error!.Message.Should().Contain("Invalid embedding model");
    }

    #endregion

    #region Exception Handling

    [Fact]
    public async Task Handle_WhenServiceThrows_ReturnsInternalError()
    {
        // Arrange
        var command = new StartIndexingCommand(UserId: "user-123");

        _mockIndexingService
            .Setup(s => s.StartIndexingAsync(
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("InternalError");
        result.Error!.Message.Should().Contain("Failed to start indexing");
    }

    #endregion

    #region Service Interaction Tests

    [Fact]
    public async Task Handle_CallsServiceWithCorrectParameters()
    {
        // Arrange
        var command = new StartIndexingCommand(
            UserId: "user-456",
            EmbeddingProvider: "Gemini",
            VectorStoreProvider: "PostgreSQL",
            EmbeddingModel: "embedding-001"
        );

        var job = CreateTestJob("job-1", "user-456");

        _mockIndexingService
            .Setup(s => s.StartIndexingAsync(
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(job);

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockIndexingService.Verify(s => s.StartIndexingAsync(
            "user-456",
            "Gemini",
            "PostgreSQL",
            "embedding-001",
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_PassesCancellationToken()
    {
        // Arrange
        var command = new StartIndexingCommand(UserId: "user-123");
        using var cts = new CancellationTokenSource();
        var token = cts.Token;

        var job = CreateTestJob("job-1", "user-123");

        _mockIndexingService
            .Setup(s => s.StartIndexingAsync(
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                token))
            .ReturnsAsync(job);

        // Act
        await _sut.Handle(command, token);

        // Assert
        _mockIndexingService.Verify(s => s.StartIndexingAsync(
            command.UserId,
            command.EmbeddingProvider,
            command.VectorStoreProvider,
            command.EmbeddingModel,
            token), Times.Once);
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
