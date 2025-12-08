using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using SecondBrain.Application.Commands.Notes.BulkDeleteNotes;
using SecondBrain.Application.Commands.Notes.CreateNote;
using SecondBrain.Application.Commands.Notes.DeleteNote;
using SecondBrain.Application.Commands.Notes.UpdateNote;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.Notes.GetAllNotes;
using SecondBrain.Application.Queries.Notes.GetNoteById;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Core.Common;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class NotesControllerTests
{
    private readonly Mock<IMediator> _mockMediator;
    private readonly Mock<INoteVersionService> _mockVersionService;
    private readonly Mock<ILogger<NotesController>> _mockLogger;
    private readonly NotesController _sut;

    public NotesControllerTests()
    {
        _mockMediator = new Mock<IMediator>();
        _mockVersionService = new Mock<INoteVersionService>();
        _mockLogger = new Mock<ILogger<NotesController>>();
        _sut = new NotesController(_mockMediator.Object, _mockVersionService.Object, _mockLogger.Object);
    }

    #region GetAllNotes Tests

    [Fact]
    public async Task GetAllNotes_WhenAuthenticated_ReturnsOkWithNotes()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var notes = new List<NoteListResponse>
        {
            CreateNoteListResponse("note-1", "First Note"),
            CreateNoteListResponse("note-2", "Second Note")
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetAllNotesQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IEnumerable<NoteListResponse>>.Success(notes));

        // Act
        var result = await _sut.GetAllNotes();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedNotes = okResult.Value.Should().BeAssignableTo<IEnumerable<NoteListResponse>>().Subject;
        returnedNotes.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAllNotes_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetAllNotes();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task GetAllNotes_WhenUserIdIsEmpty_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser("");

        // Act
        var result = await _sut.GetAllNotes();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    #endregion

    #region GetNoteById Tests

    [Fact]
    public async Task GetNoteById_WhenNoteExists_ReturnsOkWithNote()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        SetupAuthenticatedUser(userId);

        var note = CreateNoteResponse(noteId, userId, "Test Note");
        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetNoteByIdQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteResponse>.Success(note));

        // Act
        var result = await _sut.GetNoteById(noteId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedNote = okResult.Value.Should().BeOfType<NoteResponse>().Subject;
        returnedNote.Id.Should().Be(noteId);
    }

    [Fact]
    public async Task GetNoteById_WhenNoteDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "non-existent";
        SetupAuthenticatedUser(userId);

        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetNoteByIdQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteResponse>.Failure(new Error("NotFound", "Note not found")));

        // Act
        var result = await _sut.GetNoteById(noteId);

        // Assert
        var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status404NotFound);
    }

    [Fact]
    public async Task GetNoteById_WhenUnauthorizedAccess_ReturnsForbidden()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        SetupAuthenticatedUser(userId);

        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetNoteByIdQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteResponse>.Failure(new Error("Unauthorized", "Access denied")));

        // Act
        var result = await _sut.GetNoteById(noteId);

        // Assert
        var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task GetNoteById_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.GetNoteById("note-1");

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    #endregion

    #region CreateNote Tests

    [Fact]
    public async Task CreateNote_WhenValid_ReturnsCreatedWithNote()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var request = new CreateNoteRequest
        {
            Title = "New Note",
            Content = "Note content",
            Tags = new List<string> { "tag1" }
        };

        var createdNote = CreateNoteResponse("created-note-id", userId, "New Note");
        _mockMediator
            .Setup(m => m.Send(It.IsAny<CreateNoteCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteResponse>.Success(createdNote));

        // Act
        var result = await _sut.CreateNote(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.StatusCode.Should().Be(StatusCodes.Status201Created);
        createdResult.ActionName.Should().Be("GetNoteById");
        createdResult.RouteValues!["id"].Should().Be("created-note-id");

        var returnedNote = createdResult.Value.Should().BeOfType<NoteResponse>().Subject;
        returnedNote.Title.Should().Be("New Note");
    }

    [Fact]
    public async Task CreateNote_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();
        var request = new CreateNoteRequest { Title = "Test", Content = "Content" };

        // Act
        var result = await _sut.CreateNote(request);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task CreateNote_CallsMediatorWithCorrectCommand()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var request = new CreateNoteRequest
        {
            Title = "Test",
            Content = "Content",
            Tags = new List<string> { "tag" },
            IsArchived = true,
            Folder = "Work"
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<CreateNoteCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteResponse>.Success(CreateNoteResponse("id", userId, "Test")));

        // Act
        await _sut.CreateNote(request);

        // Assert
        _mockMediator.Verify(m => m.Send(
            It.Is<CreateNoteCommand>(c =>
                c.Title == "Test" &&
                c.Content == "Content" &&
                c.Tags.Contains("tag") &&
                c.IsArchived == true &&
                c.Folder == "Work" &&
                c.UserId == userId),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    #endregion

    #region UpdateNote Tests

    [Fact]
    public async Task UpdateNote_WhenValid_ReturnsOkWithUpdatedNote()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        SetupAuthenticatedUser(userId);

        var request = new UpdateNoteRequest
        {
            Title = "Updated Title",
            Content = "Updated Content"
        };

        var updatedNote = CreateNoteResponse(noteId, userId, "Updated Title");
        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdateNoteCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteResponse>.Success(updatedNote));

        // Act
        var result = await _sut.UpdateNote(noteId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedNote = okResult.Value.Should().BeOfType<NoteResponse>().Subject;
        returnedNote.Title.Should().Be("Updated Title");
    }

    [Fact]
    public async Task UpdateNote_WhenNoteDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "non-existent";
        SetupAuthenticatedUser(userId);

        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdateNoteCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteResponse>.Failure(new Error("NotFound", "Note not found")));

        // Act
        var result = await _sut.UpdateNote(noteId, new UpdateNoteRequest());

        // Assert
        var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status404NotFound);
    }

    [Fact]
    public async Task UpdateNote_WhenUnauthorizedAccess_ReturnsUnauthorized()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        SetupAuthenticatedUser(userId);

        _mockMediator
            .Setup(m => m.Send(It.IsAny<UpdateNoteCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteResponse>.Failure(new Error("Unauthorized", "Access denied")));

        // Act
        var result = await _sut.UpdateNote(noteId, new UpdateNoteRequest());

        // Assert
        var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task UpdateNote_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.UpdateNote("note-1", new UpdateNoteRequest());

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    #endregion

    #region DeleteNote Tests

    [Fact]
    public async Task DeleteNote_WhenSuccessful_ReturnsNoContent()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        SetupAuthenticatedUser(userId);

        _mockMediator
            .Setup(m => m.Send(It.IsAny<DeleteNoteCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Success());

        // Act
        var result = await _sut.DeleteNote(noteId);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteNote_WhenNoteDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "non-existent";
        SetupAuthenticatedUser(userId);

        _mockMediator
            .Setup(m => m.Send(It.IsAny<DeleteNoteCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Failure(new Error("NotFound", "Note not found")));

        // Act
        var result = await _sut.DeleteNote(noteId);

        // Assert
        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status404NotFound);
    }

    [Fact]
    public async Task DeleteNote_WhenUnauthorizedAccess_ReturnsUnauthorized()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        SetupAuthenticatedUser(userId);

        _mockMediator
            .Setup(m => m.Send(It.IsAny<DeleteNoteCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result.Failure(new Error("Unauthorized", "Access denied")));

        // Act
        var result = await _sut.DeleteNote(noteId);

        // Assert
        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task DeleteNote_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        // Act
        var result = await _sut.DeleteNote("note-1");

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    #endregion

    #region BulkDeleteNotes Tests

    [Fact]
    public async Task BulkDeleteNotes_WhenSuccessful_ReturnsOkWithCount()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var request = new BulkDeleteNotesRequest { NoteIds = new List<string> { "note-1", "note-2" } };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<BulkDeleteNotesCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<int>.Success(2));

        // Act
        var result = await _sut.BulkDeleteNotes(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = okResult.Value;
        value.Should().NotBeNull();
    }

    [Fact]
    public async Task BulkDeleteNotes_WhenNoNoteIds_ReturnsBadRequest()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var request = new BulkDeleteNotesRequest { NoteIds = new List<string>() };

        // Act
        var result = await _sut.BulkDeleteNotes(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task BulkDeleteNotes_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange
        SetupUnauthenticatedUser();

        var request = new BulkDeleteNotesRequest { NoteIds = new List<string> { "note-1" } };

        // Act
        var result = await _sut.BulkDeleteNotes(request);

        // Assert
        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    #endregion

    #region Helper Methods

    private void SetupAuthenticatedUser(string userId)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Items["UserId"] = userId;
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private void SetupUnauthenticatedUser()
    {
        var httpContext = new DefaultHttpContext();
        // UserId is not set
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    private static NoteResponse CreateNoteResponse(string id, string userId, string title)
    {
        return new NoteResponse
        {
            Id = id,
            UserId = userId,
            Title = title,
            Content = $"Content for {title}",
            Tags = new List<string>(),
            IsArchived = false,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static NoteListResponse CreateNoteListResponse(string id, string title)
    {
        return new NoteListResponse
        {
            Id = id,
            Title = title,
            Summary = $"Summary for {title}",
            Tags = new List<string>(),
            IsArchived = false,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
