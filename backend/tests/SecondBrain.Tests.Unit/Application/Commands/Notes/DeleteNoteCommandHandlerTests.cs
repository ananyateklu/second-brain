using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Commands.Notes.DeleteNote;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Core.Common;
using SecondBrain.Core.Enums;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Commands.Notes;

/// <summary>
/// Unit tests for DeleteNoteCommandHandler.
/// Tests note deletion through CQRS command pattern.
/// </summary>
public class DeleteNoteCommandHandlerTests
{
    private readonly Mock<INoteOperationService> _mockNoteOperationService;
    private readonly Mock<ILogger<DeleteNoteCommandHandler>> _mockLogger;
    private readonly DeleteNoteCommandHandler _sut;

    public DeleteNoteCommandHandlerTests()
    {
        _mockNoteOperationService = new Mock<INoteOperationService>();
        _mockLogger = new Mock<ILogger<DeleteNoteCommandHandler>>();
        _sut = new DeleteNoteCommandHandler(_mockNoteOperationService.Object, _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithValidCommand_ReturnsSuccess()
    {
        // Arrange
        var command = new DeleteNoteCommand("note-123", "user-456");

        var deleteResult = new NoteDeleteResult
        {
            Success = true,
            NoteId = "note-123",
            Source = NoteSource.Web,
            WasSoftDelete = false
        };

        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteDeleteResult>.Success(deleteResult));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_UsesHardDeleteByDefault()
    {
        // Arrange
        var command = new DeleteNoteCommand("note-123", "user-456");

        DeleteNoteOperationRequest? capturedRequest = null;
        var deleteResult = new NoteDeleteResult
        {
            Success = true,
            NoteId = "note-123",
            Source = NoteSource.Web,
            WasSoftDelete = false
        };

        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<DeleteNoteOperationRequest, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(Result<NoteDeleteResult>.Success(deleteResult));

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.SoftDelete.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_SetsWebSourceForApiRequests()
    {
        // Arrange
        var command = new DeleteNoteCommand("note-123", "user-456");

        DeleteNoteOperationRequest? capturedRequest = null;
        var deleteResult = new NoteDeleteResult
        {
            Success = true,
            NoteId = "note-123",
            Source = NoteSource.Web,
            WasSoftDelete = false
        };

        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<DeleteNoteOperationRequest, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(Result<NoteDeleteResult>.Success(deleteResult));

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Source.Should().Be(NoteSource.Web);
    }

    #endregion

    #region Failure Scenarios

    [Fact]
    public async Task Handle_WhenNoteNotFound_ReturnsFailure()
    {
        // Arrange
        var command = new DeleteNoteCommand("non-existent-note", "user-456");

        var error = Error.NotFound("Note", "non-existent-note");
        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteDeleteResult>.Failure(error));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("NotFound");
    }

    [Fact]
    public async Task Handle_WhenAccessDenied_ReturnsFailure()
    {
        // Arrange
        var command = new DeleteNoteCommand("note-123", "wrong-user");

        var error = Error.Forbidden("Access denied to this note");
        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteDeleteResult>.Failure(error));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Forbidden");
    }

    [Fact]
    public async Task Handle_WhenServiceFails_ReturnsFailure()
    {
        // Arrange
        var command = new DeleteNoteCommand("note-123", "user-456");

        var error = new Error("DeleteFailed", "Database error");
        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteDeleteResult>.Failure(error));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("DeleteFailed");
    }

    [Fact]
    public async Task Handle_WhenServiceThrows_PropagatesException()
    {
        // Arrange
        var command = new DeleteNoteCommand("note-123", "user-456");

        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Service unavailable"));

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.Handle(command, CancellationToken.None));
    }

    #endregion

    #region Service Interaction Tests

    [Fact]
    public async Task Handle_CallsServiceWithCorrectParameters()
    {
        // Arrange
        var command = new DeleteNoteCommand("note-789", "user-123");

        var deleteResult = new NoteDeleteResult
        {
            Success = true,
            NoteId = "note-789",
            Source = NoteSource.Web,
            WasSoftDelete = false
        };

        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteDeleteResult>.Success(deleteResult));

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockNoteOperationService.Verify(
            s => s.DeleteAsync(
                It.Is<DeleteNoteOperationRequest>(r =>
                    r.NoteId == "note-789" &&
                    r.UserId == "user-123" &&
                    r.Source == NoteSource.Web &&
                    r.SoftDelete == false),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_PassesCancellationToken()
    {
        // Arrange
        var command = new DeleteNoteCommand("note-123", "user-456");
        using var cts = new CancellationTokenSource();
        var token = cts.Token;

        var deleteResult = new NoteDeleteResult
        {
            Success = true,
            NoteId = "note-123",
            Source = NoteSource.Web,
            WasSoftDelete = false
        };

        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), token))
            .ReturnsAsync(Result<NoteDeleteResult>.Success(deleteResult));

        // Act
        await _sut.Handle(command, token);

        // Assert
        _mockNoteOperationService.Verify(
            s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), token),
            Times.Once);
    }

    [Fact]
    public async Task Handle_OnlyCallsServiceOnce()
    {
        // Arrange
        var command = new DeleteNoteCommand("note-123", "user-456");

        var deleteResult = new NoteDeleteResult
        {
            Success = true,
            NoteId = "note-123",
            Source = NoteSource.Web,
            WasSoftDelete = false
        };

        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteDeleteResult>.Success(deleteResult));

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockNoteOperationService.Verify(
            s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion
}
