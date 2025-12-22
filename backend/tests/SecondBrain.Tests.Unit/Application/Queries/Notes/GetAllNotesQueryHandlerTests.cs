using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Queries.Notes.GetAllNotes;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Queries.Notes;

/// <summary>
/// Unit tests for GetAllNotesQueryHandler.
/// Tests retrieval of all notes for a user through CQRS query pattern.
/// </summary>
public class GetAllNotesQueryHandlerTests
{
    private readonly Mock<INoteRepository> _mockNoteRepository;
    private readonly Mock<ILogger<GetAllNotesQueryHandler>> _mockLogger;
    private readonly GetAllNotesQueryHandler _sut;

    public GetAllNotesQueryHandlerTests()
    {
        _mockNoteRepository = new Mock<INoteRepository>();
        _mockLogger = new Mock<ILogger<GetAllNotesQueryHandler>>();
        _sut = new GetAllNotesQueryHandler(_mockNoteRepository.Object, _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithExistingNotes_ReturnsSuccessWithNoteListResponses()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetAllNotesQuery(userId);

        var notes = new List<Note>
        {
            CreateTestNote("note-1", userId, "First Note", "Content 1"),
            CreateTestNote("note-2", userId, "Second Note", "Content 2"),
            CreateTestNote("note-3", userId, "Third Note", "Content 3")
        };

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.Should().HaveCount(3);
    }

    [Fact]
    public async Task Handle_ReturnsLightweightNoteListResponse()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetAllNotesQuery(userId);

        var note = new Note
        {
            Id = "note-1",
            UserId = userId,
            Title = "Test Note",
            Content = "Full content that should not be returned",
            Summary = "This is the summary",
            Tags = new List<string> { "tag1", "tag2" },
            IsArchived = false,
            Folder = "MyFolder",
            Source = "web",
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow
        };

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note> { note });

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        var response = result.Value!.First();
        response.Id.Should().Be("note-1");
        response.Title.Should().Be("Test Note");
        response.Summary.Should().Be("This is the summary");
        response.Tags.Should().BeEquivalentTo(new[] { "tag1", "tag2" });
        response.Folder.Should().Be("MyFolder");
        response.Source.Should().Be("web");
    }

    [Fact]
    public async Task Handle_WithEmptyNotes_ReturnsEmptyList()
    {
        // Arrange
        var userId = "user-with-no-notes";
        var query = new GetAllNotesQuery(userId);

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>());

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEmpty();
    }

    [Fact]
    public async Task Handle_WithSingleNote_ReturnsSingleItem()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetAllNotesQuery(userId);

        var notes = new List<Note>
        {
            CreateTestNote("note-1", userId, "Only Note", "Content")
        };

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().HaveCount(1);
        result.Value.First().Title.Should().Be("Only Note");
    }

    [Fact]
    public async Task Handle_WithManyNotes_ReturnsAllNotes()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetAllNotesQuery(userId);

        var notes = Enumerable.Range(1, 100)
            .Select(i => CreateTestNote($"note-{i}", userId, $"Note {i}", $"Content {i}"))
            .ToList();

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().HaveCount(100);
    }

    #endregion

    #region Note Properties Tests

    [Fact]
    public async Task Handle_ReturnsCorrectIsArchivedStatus()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetAllNotesQuery(userId);

        var activeNote = CreateTestNote("note-1", userId, "Active", "Content");
        activeNote.IsArchived = false;
        var archivedNote = CreateTestNote("note-2", userId, "Archived", "Content");
        archivedNote.IsArchived = true;
        var notes = new List<Note> { activeNote, archivedNote };

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        var responses = result.Value!.ToList();
        responses.Should().ContainSingle(n => n.Title == "Active" && !n.IsArchived);
        responses.Should().ContainSingle(n => n.Title == "Archived" && n.IsArchived);
    }

    [Fact]
    public async Task Handle_ReturnsCorrectTimestamps()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetAllNotesQuery(userId);
        var createdAt = DateTime.UtcNow.AddDays(-10);
        var updatedAt = DateTime.UtcNow.AddDays(-1);

        var note = new Note
        {
            Id = "note-1",
            UserId = userId,
            Title = "Timestamped Note",
            Content = "Content",
            Tags = new List<string>(),
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        };

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note> { note });

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        var response = result.Value!.First();
        response.CreatedAt.Should().BeCloseTo(createdAt, TimeSpan.FromSeconds(1));
        response.UpdatedAt.Should().BeCloseTo(updatedAt, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Handle_ReturnsCorrectTags()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetAllNotesQuery(userId);

        var note = new Note
        {
            Id = "note-1",
            UserId = userId,
            Title = "Tagged Note",
            Content = "Content",
            Tags = new List<string> { "work", "important", "todo" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note> { note });

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.First().Tags.Should().BeEquivalentTo(new[] { "work", "important", "todo" });
    }

    [Fact]
    public async Task Handle_WithNullFolder_ReturnsNullFolder()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetAllNotesQuery(userId);

        var note = CreateTestNote("note-1", userId, "No Folder Note", "Content");
        note.Folder = null;

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note> { note });

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.First().Folder.Should().BeNull();
    }

    #endregion

    #region Repository Interaction Tests

    [Fact]
    public async Task Handle_CallsRepositoryWithCorrectUserId()
    {
        // Arrange
        var userId = "specific-user-id";
        var query = new GetAllNotesQuery(userId);

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(userId))
            .ReturnsAsync(new List<Note>());

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert
        _mockNoteRepository.Verify(r => r.GetByUserIdAsync(userId), Times.Once);
    }

    [Fact]
    public async Task Handle_OnlyCallsRepositoryOnce()
    {
        // Arrange
        var query = new GetAllNotesQuery("user-123");

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<Note>());

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert
        _mockNoteRepository.Verify(r => r.GetByUserIdAsync(It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task Handle_DoesNotCallOtherRepositoryMethods()
    {
        // Arrange
        var query = new GetAllNotesQuery("user-123");

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<Note>());

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert - Only GetByUserIdAsync should be called
        _mockNoteRepository.Verify(r => r.GetByIdAsync(It.IsAny<string>()), Times.Never);
        _mockNoteRepository.Verify(r => r.CreateAsync(It.IsAny<Note>()), Times.Never);
        _mockNoteRepository.Verify(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<Note>()), Times.Never);
        _mockNoteRepository.Verify(r => r.DeleteAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Exception Handling

    [Fact]
    public async Task Handle_WhenRepositoryThrows_PropagatesException()
    {
        // Arrange
        var query = new GetAllNotesQuery("user-123");

        _mockNoteRepository
            .Setup(r => r.GetByUserIdAsync(It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.Handle(query, CancellationToken.None));
    }

    #endregion

    #region Helper Methods

    private static Note CreateTestNote(string id, string userId, string title, string content)
    {
        return new Note
        {
            Id = id,
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
