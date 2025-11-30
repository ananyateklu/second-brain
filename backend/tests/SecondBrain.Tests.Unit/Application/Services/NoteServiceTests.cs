using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Tests.Unit.Application.Services;

public class NoteServiceTests
{
    private readonly Mock<INoteRepository> _mockNoteRepository;
    private readonly Mock<ILogger<NoteService>> _mockLogger;
    private readonly NoteService _sut;

    public NoteServiceTests()
    {
        _mockNoteRepository = new Mock<INoteRepository>();
        _mockLogger = new Mock<ILogger<NoteService>>();
        _sut = new NoteService(_mockNoteRepository.Object, _mockLogger.Object);
    }

    #region GetAllNotesAsync Tests

    [Fact]
    public async Task GetAllNotesAsync_WhenNotesExist_ReturnsAllUserNotes()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<Note>
        {
            CreateTestNote("note-1", userId, "First Note"),
            CreateTestNote("note-2", userId, "Second Note"),
            CreateTestNote("note-3", userId, "Third Note")
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.GetAllNotesAsync(userId);

        // Assert
        result.Should().HaveCount(3);
        result.Select(n => n.Title).Should().BeEquivalentTo(new[] { "First Note", "Second Note", "Third Note" });
        _mockNoteRepository.Verify(r => r.GetByUserIdAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetAllNotesAsync_WhenNoNotesExist_ReturnsEmptyList()
    {
        // Arrange
        var userId = "user-123";
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>());

        // Act
        var result = await _sut.GetAllNotesAsync(userId);

        // Assert
        result.Should().BeEmpty();
        _mockNoteRepository.Verify(r => r.GetByUserIdAsync(userId), Times.Once);
    }

    [Fact]
    public async Task GetAllNotesAsync_MapsAllPropertiesToResponse()
    {
        // Arrange
        var userId = "user-123";
        var note = new Note
        {
            Id = "note-1",
            UserId = userId,
            Title = "Test Title",
            Content = "Test Content",
            Tags = new List<string> { "tag1", "tag2" },
            IsArchived = true,
            Source = "web",
            ExternalId = "ext-123",
            Folder = "Work",
            CreatedAt = new DateTime(2024, 1, 1, 12, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2024, 1, 2, 12, 0, 0, DateTimeKind.Utc)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note> { note });

        // Act
        var result = (await _sut.GetAllNotesAsync(userId)).First();

        // Assert
        result.Id.Should().Be("note-1");
        result.UserId.Should().Be(userId);
        result.Title.Should().Be("Test Title");
        result.Content.Should().Be("Test Content");
        result.Tags.Should().BeEquivalentTo(new[] { "tag1", "tag2" });
        result.IsArchived.Should().BeTrue();
        result.Source.Should().Be("web");
        result.ExternalId.Should().Be("ext-123");
        result.Folder.Should().Be("Work");
        result.CreatedAt.Should().Be(new DateTime(2024, 1, 1, 12, 0, 0, DateTimeKind.Utc));
        result.UpdatedAt.Should().Be(new DateTime(2024, 1, 2, 12, 0, 0, DateTimeKind.Utc));
    }

    #endregion

    #region GetNoteByIdAsync Tests

    [Fact]
    public async Task GetNoteByIdAsync_WhenNoteExistsAndUserOwns_ReturnsNote()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        var note = CreateTestNote(noteId, userId, "Test Note");
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.GetNoteByIdAsync(noteId, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(noteId);
        result.Title.Should().Be("Test Note");
        _mockNoteRepository.Verify(r => r.GetByIdAsync(noteId), Times.Once);
    }

    [Fact]
    public async Task GetNoteByIdAsync_WhenNoteDoesNotExist_ReturnsNull()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "non-existent";
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.GetNoteByIdAsync(noteId, userId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetNoteByIdAsync_WhenUserDoesNotOwnNote_ThrowsUnauthorizedException()
    {
        // Arrange
        var userId = "user-123";
        var otherUserId = "other-user";
        var noteId = "note-1";
        var note = CreateTestNote(noteId, otherUserId, "Other User's Note");
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        // Act & Assert
        var act = async () => await _sut.GetNoteByIdAsync(noteId, userId);
        await act.Should().ThrowAsync<UnauthorizedException>()
            .WithMessage("Access denied to this note");
    }

    #endregion

    #region CreateNoteAsync Tests

    [Fact]
    public async Task CreateNoteAsync_WhenValidRequest_CreatesAndReturnsNote()
    {
        // Arrange
        var userId = "user-123";
        var request = new CreateNoteRequest
        {
            Title = "New Note",
            Content = "Note Content",
            Tags = new List<string> { "tag1" },
            IsArchived = false,
            Folder = "Personal"
        };

        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ReturnsAsync((Note n) =>
            {
                n.Id = "created-note-id";
                return n;
            });

        // Act
        var result = await _sut.CreateNoteAsync(request, userId);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("New Note");
        result.Content.Should().Be("Note Content");
        result.Tags.Should().Contain("tag1");
        result.UserId.Should().Be(userId);
        result.Source.Should().Be("web");

        _mockNoteRepository.Verify(r => r.CreateAsync(It.Is<Note>(n =>
            n.Title == "New Note" &&
            n.Content == "Note Content" &&
            n.UserId == userId
        )), Times.Once);
    }

    [Fact]
    public async Task CreateNoteAsync_SetsCorrectTimestamps()
    {
        // Arrange
        var userId = "user-123";
        var request = new CreateNoteRequest { Title = "Test", Content = "Content" };
        var beforeTime = DateTime.UtcNow;

        Note? capturedNote = null;
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .Callback<Note>(n => capturedNote = n)
            .ReturnsAsync((Note n) => n);

        // Act
        await _sut.CreateNoteAsync(request, userId);
        var afterTime = DateTime.UtcNow;

        // Assert
        capturedNote.Should().NotBeNull();
        capturedNote!.CreatedAt.Should().BeOnOrAfter(beforeTime).And.BeOnOrBefore(afterTime);
        capturedNote.UpdatedAt.Should().BeOnOrAfter(beforeTime).And.BeOnOrBefore(afterTime);
    }

    [Fact]
    public async Task CreateNoteAsync_GeneratesUniqueId()
    {
        // Arrange
        var userId = "user-123";
        var request = new CreateNoteRequest { Title = "Test", Content = "Content" };

        Note? capturedNote = null;
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .Callback<Note>(n => capturedNote = n)
            .ReturnsAsync((Note n) => n);

        // Act
        await _sut.CreateNoteAsync(request, userId);

        // Assert
        capturedNote.Should().NotBeNull();
        capturedNote!.Id.Should().NotBeNullOrEmpty();
        Guid.TryParse(capturedNote.Id, out _).Should().BeTrue("Note ID should be a valid GUID");
    }

    #endregion

    #region UpdateNoteAsync Tests

    [Fact]
    public async Task UpdateNoteAsync_WhenNoteExistsAndUserOwns_UpdatesAndReturnsNote()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        var existingNote = CreateTestNote(noteId, userId, "Original Title");
        var updateRequest = new UpdateNoteRequest
        {
            Title = "Updated Title",
            Content = "Updated Content",
            Tags = new List<string> { "updated-tag" },
            IsArchived = true,
            Folder = "Archive"
        };

        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(existingNote);
        _mockNoteRepository.Setup(r => r.UpdateAsync(noteId, It.IsAny<Note>()))
            .ReturnsAsync((string id, Note n) => n);

        // Act
        var result = await _sut.UpdateNoteAsync(noteId, updateRequest, userId);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Updated Title");
        result.Content.Should().Be("Updated Content");
        result.Tags.Should().Contain("updated-tag");
        result.IsArchived.Should().BeTrue();
        result.Folder.Should().Be("Archive");
    }

    [Fact]
    public async Task UpdateNoteAsync_WhenNoteDoesNotExist_ReturnsNull()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "non-existent";
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.UpdateNoteAsync(noteId, new UpdateNoteRequest(), userId);

        // Assert
        result.Should().BeNull();
        _mockNoteRepository.Verify(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<Note>()), Times.Never);
    }

    [Fact]
    public async Task UpdateNoteAsync_WhenUserDoesNotOwnNote_ThrowsUnauthorizedException()
    {
        // Arrange
        var userId = "user-123";
        var otherUserId = "other-user";
        var noteId = "note-1";
        var existingNote = CreateTestNote(noteId, otherUserId, "Other's Note");
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(existingNote);

        // Act & Assert
        var act = async () => await _sut.UpdateNoteAsync(noteId, new UpdateNoteRequest(), userId);
        await act.Should().ThrowAsync<UnauthorizedException>()
            .WithMessage("Access denied to this note");
    }

    [Fact]
    public async Task UpdateNoteAsync_UpdatesTimestamp()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        var originalUpdateTime = new DateTime(2023, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var existingNote = CreateTestNote(noteId, userId, "Title");
        existingNote.UpdatedAt = originalUpdateTime;

        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(existingNote);
        _mockNoteRepository.Setup(r => r.UpdateAsync(noteId, It.IsAny<Note>()))
            .ReturnsAsync((string id, Note n) => n);

        var beforeUpdate = DateTime.UtcNow;

        // Act
        var result = await _sut.UpdateNoteAsync(noteId, new UpdateNoteRequest { Title = "New" }, userId);

        // Assert
        result.Should().NotBeNull();
        result!.UpdatedAt.Should().BeOnOrAfter(beforeUpdate);
        result.UpdatedAt.Should().NotBe(originalUpdateTime);
    }

    #endregion

    #region DeleteNoteAsync Tests

    [Fact]
    public async Task DeleteNoteAsync_WhenNoteExistsAndUserOwns_DeletesAndReturnsTrue()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        var note = CreateTestNote(noteId, userId, "To Delete");
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.DeleteAsync(noteId))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteNoteAsync(noteId, userId);

        // Assert
        result.Should().BeTrue();
        _mockNoteRepository.Verify(r => r.DeleteAsync(noteId), Times.Once);
    }

    [Fact]
    public async Task DeleteNoteAsync_WhenNoteDoesNotExist_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "non-existent";
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.DeleteNoteAsync(noteId, userId);

        // Assert
        result.Should().BeFalse();
        _mockNoteRepository.Verify(r => r.DeleteAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task DeleteNoteAsync_WhenUserDoesNotOwnNote_ThrowsUnauthorizedException()
    {
        // Arrange
        var userId = "user-123";
        var otherUserId = "other-user";
        var noteId = "note-1";
        var note = CreateTestNote(noteId, otherUserId, "Other's Note");
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        // Act & Assert
        var act = async () => await _sut.DeleteNoteAsync(noteId, userId);
        await act.Should().ThrowAsync<UnauthorizedException>()
            .WithMessage("Access denied to this note");
    }

    [Fact]
    public async Task DeleteNoteAsync_WhenRepositoryDeleteFails_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        var note = CreateTestNote(noteId, userId, "Test");
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.DeleteAsync(noteId))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.DeleteNoteAsync(noteId, userId);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region IsNoteOwnedByUserAsync Tests

    [Fact]
    public async Task IsNoteOwnedByUserAsync_WhenNoteExistsAndUserOwns_ReturnsTrue()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "note-1";
        var note = CreateTestNote(noteId, userId, "Test");
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.IsNoteOwnedByUserAsync(noteId, userId);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsNoteOwnedByUserAsync_WhenNoteExistsButUserDoesNotOwn_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";
        var otherUserId = "other-user";
        var noteId = "note-1";
        var note = CreateTestNote(noteId, otherUserId, "Test");
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.IsNoteOwnedByUserAsync(noteId, userId);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsNoteOwnedByUserAsync_WhenNoteDoesNotExist_ReturnsFalse()
    {
        // Arrange
        var userId = "user-123";
        var noteId = "non-existent";
        _mockNoteRepository.Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.IsNoteOwnedByUserAsync(noteId, userId);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region Helper Methods

    private static Note CreateTestNote(string id, string userId, string title)
    {
        return new Note
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

