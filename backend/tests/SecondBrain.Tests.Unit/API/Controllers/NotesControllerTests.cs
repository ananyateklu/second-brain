using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services.Notes;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class NotesControllerTests
{
    private readonly Mock<INoteService> _mockNoteService;
    private readonly Mock<ILogger<NotesController>> _mockLogger;
    private readonly NotesController _sut;

    public NotesControllerTests()
    {
        _mockNoteService = new Mock<INoteService>();
        _mockLogger = new Mock<ILogger<NotesController>>();
        _sut = new NotesController(_mockNoteService.Object, _mockLogger.Object);
    }

    #region GetAllNotes Tests

    [Fact]
    public async Task GetAllNotes_WhenAuthenticated_ReturnsOkWithNotes()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var notes = new List<NoteResponse>
        {
            CreateNoteResponse("note-1", userId, "First Note"),
            CreateNoteResponse("note-2", userId, "Second Note")
        };
        _mockNoteService.Setup(s => s.GetAllNotesAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.GetAllNotes();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedNotes = okResult.Value.Should().BeAssignableTo<IEnumerable<NoteResponse>>().Subject;
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
        _mockNoteService.Setup(s => s.GetNoteByIdAsync(noteId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.GetNoteById(noteId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedNote = okResult.Value.Should().BeOfType<NoteResponse>().Subject;
        returnedNote.Id.Should().Be(noteId);
    }

    [Fact]
    public async Task GetNoteById_WhenNoteDoesNotExist_ThrowsNotFoundException()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "non-existent";
        SetupAuthenticatedUser(userId);

        _mockNoteService.Setup(s => s.GetNoteByIdAsync(noteId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((NoteResponse?)null);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => _sut.GetNoteById(noteId));
    }

    [Fact]
    public async Task GetNoteById_WhenUnauthorizedAccess_ReturnsForbidden()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        SetupAuthenticatedUser(userId);

        _mockNoteService.Setup(s => s.GetNoteByIdAsync(noteId, userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedException("Access denied"));

        // Act
        var result = await _sut.GetNoteById(noteId);

        // Assert
        var forbiddenResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        forbiddenResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
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
        _mockNoteService.Setup(s => s.CreateNoteAsync(request, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdNote);

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
    public async Task CreateNote_CallsServiceWithCorrectParameters()
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

        _mockNoteService.Setup(s => s.CreateNoteAsync(It.IsAny<CreateNoteRequest>(), userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateNoteResponse("id", userId, "Test"));

        // Act
        await _sut.CreateNote(request);

        // Assert
        _mockNoteService.Verify(s => s.CreateNoteAsync(
            It.Is<CreateNoteRequest>(r =>
                r.Title == "Test" &&
                r.Content == "Content" &&
                r.Tags.Contains("tag") &&
                r.IsArchived == true &&
                r.Folder == "Work"),
            userId,
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
        _mockNoteService.Setup(s => s.UpdateNoteAsync(noteId, request, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(updatedNote);

        // Act
        var result = await _sut.UpdateNote(noteId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedNote = okResult.Value.Should().BeOfType<NoteResponse>().Subject;
        returnedNote.Title.Should().Be("Updated Title");
    }

    [Fact]
    public async Task UpdateNote_WhenNoteDoesNotExist_ThrowsNotFoundException()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "non-existent";
        SetupAuthenticatedUser(userId);

        _mockNoteService.Setup(s => s.UpdateNoteAsync(noteId, It.IsAny<UpdateNoteRequest>(), userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((NoteResponse?)null);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => _sut.UpdateNote(noteId, new UpdateNoteRequest()));
    }

    [Fact]
    public async Task UpdateNote_WhenUnauthorizedAccess_ReturnsForbidden()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        SetupAuthenticatedUser(userId);

        _mockNoteService.Setup(s => s.UpdateNoteAsync(noteId, It.IsAny<UpdateNoteRequest>(), userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedException("Access denied"));

        // Act
        var result = await _sut.UpdateNote(noteId, new UpdateNoteRequest());

        // Assert
        var forbiddenResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        forbiddenResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
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

        _mockNoteService.Setup(s => s.DeleteNoteAsync(noteId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteNote(noteId);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteNote_WhenNoteDoesNotExist_ThrowsNotFoundException()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "non-existent";
        SetupAuthenticatedUser(userId);

        _mockNoteService.Setup(s => s.DeleteNoteAsync(noteId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => _sut.DeleteNote(noteId));
    }

    [Fact]
    public async Task DeleteNote_WhenUnauthorizedAccess_ReturnsForbidden()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        SetupAuthenticatedUser(userId);

        _mockNoteService.Setup(s => s.DeleteNoteAsync(noteId, userId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedException("Access denied"));

        // Act
        var result = await _sut.DeleteNote(noteId);

        // Assert
        var forbiddenResult = result.Should().BeOfType<ObjectResult>().Subject;
        forbiddenResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
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

    #endregion
}

