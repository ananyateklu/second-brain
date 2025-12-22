using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Queries.Notes.GetNoteById;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Queries.Notes;

/// <summary>
/// Unit tests for GetNoteByIdQueryHandler.
/// Tests note retrieval with ownership verification through CQRS query pattern.
/// </summary>
public class GetNoteByIdQueryHandlerTests
{
    private readonly Mock<INoteRepository> _mockNoteRepository;
    private readonly Mock<ILogger<GetNoteByIdQueryHandler>> _mockLogger;
    private readonly GetNoteByIdQueryHandler _sut;

    public GetNoteByIdQueryHandlerTests()
    {
        _mockNoteRepository = new Mock<INoteRepository>();
        _mockLogger = new Mock<ILogger<GetNoteByIdQueryHandler>>();
        _sut = new GetNoteByIdQueryHandler(_mockNoteRepository.Object, _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithExistingNote_ReturnsSuccessWithNoteResponse()
    {
        // Arrange
        var noteId = "note-123";
        var userId = "user-456";
        var query = new GetNoteByIdQuery(noteId, userId);

        var note = CreateTestNote(noteId, userId, "Test Title", "Test Content");

        _mockNoteRepository
            .Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value.Id.Should().Be(noteId);
        result.Value.Title.Should().Be("Test Title");
        result.Value.Content.Should().Be("Test Content");
        result.Value.UserId.Should().Be(userId);
    }

    [Fact]
    public async Task Handle_WithAllFields_ReturnsCompleteNoteResponse()
    {
        // Arrange
        var noteId = "note-123";
        var userId = "user-456";
        var query = new GetNoteByIdQuery(noteId, userId);

        var note = new Note
        {
            Id = noteId,
            UserId = userId,
            Title = "Complete Note",
            Content = "Full content here",
            Tags = new List<string> { "tag1", "tag2", "tag3" },
            IsArchived = true,
            Folder = "Work/Projects",
            Source = "web",
            Summary = "AI-generated summary",
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        _mockNoteRepository
            .Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Tags.Should().BeEquivalentTo(new[] { "tag1", "tag2", "tag3" });
        result.Value!.IsArchived.Should().BeTrue();
        result.Value!.Folder.Should().Be("Work/Projects");
        result.Value!.Source.Should().Be("web");
        result.Value!.Summary.Should().Be("AI-generated summary");
    }

    [Fact]
    public async Task Handle_WithNullOptionalFields_ReturnsSuccessfully()
    {
        // Arrange
        var noteId = "note-123";
        var userId = "user-456";
        var query = new GetNoteByIdQuery(noteId, userId);

        var note = new Note
        {
            Id = noteId,
            UserId = userId,
            Title = "Minimal Note",
            Content = "Content",
            Tags = new List<string>(),
            Folder = null,
            Summary = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _mockNoteRepository
            .Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Folder.Should().BeNull();
        result.Value!.Summary.Should().BeNull();
        result.Value!.Tags.Should().BeEmpty();
    }

    #endregion

    #region Not Found Scenarios

    [Fact]
    public async Task Handle_WhenNoteNotFound_ReturnsNotFoundError()
    {
        // Arrange
        var noteId = "non-existent-note";
        var userId = "user-456";
        var query = new GetNoteByIdQuery(noteId, userId);

        _mockNoteRepository
            .Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("NotFound");
        result.Error!.Message.Should().Contain(noteId);
    }

    [Fact]
    public async Task Handle_WhenRepositoryReturnsNull_ReturnsFailure()
    {
        // Arrange
        var query = new GetNoteByIdQuery("any-id", "any-user");

        _mockNoteRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
    }

    #endregion

    #region Ownership Verification Scenarios

    [Fact]
    public async Task Handle_WhenUserDoesNotOwnNote_ReturnsForbiddenError()
    {
        // Arrange
        var noteId = "note-123";
        var requestingUserId = "user-456";
        var noteOwnerId = "user-789"; // Different user
        var query = new GetNoteByIdQuery(noteId, requestingUserId);

        var note = CreateTestNote(noteId, noteOwnerId, "Other's Note", "Content");

        _mockNoteRepository
            .Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Forbidden");
        result.Error!.Message.Should().Contain("Access denied");
    }

    [Fact]
    public async Task Handle_WhenUserOwnsNote_ReturnsSuccess()
    {
        // Arrange
        var noteId = "note-123";
        var userId = "user-456";
        var query = new GetNoteByIdQuery(noteId, userId);

        var note = CreateTestNote(noteId, userId, "My Note", "My Content");

        _mockNoteRepository
            .Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.UserId.Should().Be(userId);
    }

    #endregion

    #region Repository Interaction Tests

    [Fact]
    public async Task Handle_CallsRepositoryWithCorrectNoteId()
    {
        // Arrange
        var noteId = "specific-note-id";
        var userId = "user-123";
        var query = new GetNoteByIdQuery(noteId, userId);

        var note = CreateTestNote(noteId, userId, "Title", "Content");
        _mockNoteRepository
            .Setup(r => r.GetByIdAsync(noteId))
            .ReturnsAsync(note);

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert
        _mockNoteRepository.Verify(r => r.GetByIdAsync(noteId), Times.Once);
    }

    [Fact]
    public async Task Handle_DoesNotCallRepositoryWithUserId()
    {
        // Arrange
        var query = new GetNoteByIdQuery("note-123", "user-456");

        var note = CreateTestNote("note-123", "user-456", "Title", "Content");
        _mockNoteRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<string>()))
            .ReturnsAsync(note);

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert - UserId is only used for ownership verification, not for fetching
        _mockNoteRepository.Verify(r => r.GetByIdAsync("note-123"), Times.Once);
    }

    [Fact]
    public async Task Handle_OnlyCallsRepositoryOnce()
    {
        // Arrange
        var query = new GetNoteByIdQuery("note-123", "user-456");

        var note = CreateTestNote("note-123", "user-456", "Title", "Content");
        _mockNoteRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<string>()))
            .ReturnsAsync(note);

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert
        _mockNoteRepository.Verify(r => r.GetByIdAsync(It.IsAny<string>()), Times.Once);
    }

    #endregion

    #region Exception Handling

    [Fact]
    public async Task Handle_WhenRepositoryThrows_PropagatesException()
    {
        // Arrange
        var query = new GetNoteByIdQuery("note-123", "user-456");

        _mockNoteRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<string>()))
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
