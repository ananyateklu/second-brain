using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Commands.Notes.CreateNote;
using SecondBrain.Application.DTOs;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Enums;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Commands.Notes;

/// <summary>
/// Unit tests for CreateNoteCommandHandler.
/// Tests note creation through CQRS command pattern.
/// </summary>
public class CreateNoteCommandHandlerTests
{
    private readonly Mock<INoteOperationService> _mockNoteOperationService;
    private readonly Mock<ILogger<CreateNoteCommandHandler>> _mockLogger;
    private readonly CreateNoteCommandHandler _sut;

    public CreateNoteCommandHandlerTests()
    {
        _mockNoteOperationService = new Mock<INoteOperationService>();
        _mockLogger = new Mock<ILogger<CreateNoteCommandHandler>>();
        _sut = new CreateNoteCommandHandler(_mockNoteOperationService.Object, _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithValidCommand_ReturnsSuccessWithNoteResponse()
    {
        // Arrange
        var command = new CreateNoteCommand(
            Title: "Test Note",
            Content: "This is test content",
            Tags: new List<string> { "test", "unit" },
            IsArchived: false,
            Folder: "TestFolder",
            UserId: "user-123"
        );

        var createdNote = CreateTestNote(command.UserId, command.Title, command.Content);
        createdNote.Tags = command.Tags;
        createdNote.Folder = command.Folder;

        var operationResult = NoteOperationResultFactory.Created(createdNote, 1, NoteSource.Web);

        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(operationResult));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.Title.Should().Be("Test Note");
        result.Value.Tags.Should().BeEquivalentTo(new[] { "test", "unit" });
        result.Value.Folder.Should().Be("TestFolder");
    }

    [Fact]
    public async Task Handle_WithMinimalFields_ReturnsSuccess()
    {
        // Arrange
        var command = new CreateNoteCommand(
            Title: "Minimal Note",
            Content: "Content",
            Tags: new List<string>(),
            IsArchived: false,
            Folder: null,
            UserId: "user-123"
        );

        var createdNote = CreateTestNote(command.UserId, command.Title, command.Content);
        var operationResult = NoteOperationResultFactory.Created(createdNote, 1, NoteSource.Web);

        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(operationResult));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Title.Should().Be("Minimal Note");
    }

    [Fact]
    public async Task Handle_WithImages_PassesImagesToService()
    {
        // Arrange
        var images = new List<NoteImageDto>
        {
            new()
            {
                Base64Data = "dGVzdA==",
                MediaType = "image/png",
                FileName = "test.png"
            }
        };

        var command = new CreateNoteCommand(
            Title: "Note with Image",
            Content: "Content with image",
            Tags: new List<string>(),
            IsArchived: false,
            Folder: null,
            UserId: "user-123",
            Images: images
        );

        var createdNote = CreateTestNote(command.UserId, command.Title, command.Content);
        var operationResult = NoteOperationResultFactory.Created(createdNote, 1, NoteSource.Web);

        CreateNoteOperationRequest? capturedRequest = null;
        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<CreateNoteOperationRequest, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(Result<NoteOperationResult>.Success(operationResult));

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Images.Should().HaveCount(1);
        capturedRequest.Images![0].FileName.Should().Be("test.png");
    }

    [Fact]
    public async Task Handle_WithArchivedFlag_PassesCorrectValue()
    {
        // Arrange
        var command = new CreateNoteCommand(
            Title: "Archived Note",
            Content: "Content",
            Tags: new List<string>(),
            IsArchived: true,
            Folder: null,
            UserId: "user-123"
        );

        var createdNote = CreateTestNote(command.UserId, command.Title, command.Content);
        createdNote.IsArchived = true;
        var operationResult = NoteOperationResultFactory.Created(createdNote, 1, NoteSource.Web);

        CreateNoteOperationRequest? capturedRequest = null;
        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<CreateNoteOperationRequest, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(Result<NoteOperationResult>.Success(operationResult));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.IsArchived.Should().BeTrue();
        result.Value.IsArchived.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_SetsWebSourceForApiRequests()
    {
        // Arrange
        var command = new CreateNoteCommand(
            Title: "API Note",
            Content: "Content",
            Tags: new List<string>(),
            IsArchived: false,
            Folder: null,
            UserId: "user-123"
        );

        var createdNote = CreateTestNote(command.UserId, command.Title, command.Content);
        var operationResult = NoteOperationResultFactory.Created(createdNote, 1, NoteSource.Web);

        CreateNoteOperationRequest? capturedRequest = null;
        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<CreateNoteOperationRequest, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(Result<NoteOperationResult>.Success(operationResult));

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Source.Should().Be(NoteSource.Web);
    }

    #endregion

    #region Failure Scenarios

    [Fact]
    public async Task Handle_WhenServiceFails_ReturnsFailure()
    {
        // Arrange
        var command = new CreateNoteCommand(
            Title: "Test Note",
            Content: "Content",
            Tags: new List<string>(),
            IsArchived: false,
            Folder: null,
            UserId: "user-123"
        );

        var error = new Error("CreateFailed", "Database connection failed");
        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Failure(error));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("CreateFailed");
        result.Error.Message.Should().Contain("Database connection failed");
    }

    [Fact]
    public async Task Handle_WhenServiceThrows_PropagatesException()
    {
        // Arrange
        var command = new CreateNoteCommand(
            Title: "Test Note",
            Content: "Content",
            Tags: new List<string>(),
            IsArchived: false,
            Folder: null,
            UserId: "user-123"
        );

        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
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
        var command = new CreateNoteCommand(
            Title: "Test Title",
            Content: "Test Content",
            Tags: new List<string> { "tag1", "tag2" },
            IsArchived: false,
            Folder: "MyFolder",
            UserId: "user-456"
        );

        var createdNote = CreateTestNote(command.UserId, command.Title, command.Content);
        var operationResult = NoteOperationResultFactory.Created(createdNote, 1, NoteSource.Web);

        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(operationResult));

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockNoteOperationService.Verify(
            s => s.CreateAsync(
                It.Is<CreateNoteOperationRequest>(r =>
                    r.UserId == "user-456" &&
                    r.Title == "Test Title" &&
                    r.Content == "Test Content" &&
                    r.Tags.Contains("tag1") &&
                    r.Tags.Contains("tag2") &&
                    r.Folder == "MyFolder" &&
                    r.Source == NoteSource.Web),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_PassesCancellationToken()
    {
        // Arrange
        var command = new CreateNoteCommand(
            Title: "Test",
            Content: "Content",
            Tags: new List<string>(),
            IsArchived: false,
            Folder: null,
            UserId: "user-123"
        );

        using var cts = new CancellationTokenSource();
        var token = cts.Token;

        var createdNote = CreateTestNote(command.UserId, command.Title, command.Content);
        var operationResult = NoteOperationResultFactory.Created(createdNote, 1, NoteSource.Web);

        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), token))
            .ReturnsAsync(Result<NoteOperationResult>.Success(operationResult));

        // Act
        await _sut.Handle(command, token);

        // Assert
        _mockNoteOperationService.Verify(
            s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), token),
            Times.Once);
    }

    #endregion

    #region Helper Methods

    private static Note CreateTestNote(string userId, string title, string content)
    {
        return new Note
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            Title = title,
            Content = content,
            Tags = new List<string>(),
            IsArchived = false,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
