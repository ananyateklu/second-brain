using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Tests.Unit.Application.Services;

public class NotesImportServiceTests
{
    private readonly Mock<INoteRepository> _mockNoteRepository;
    private readonly Mock<ILogger<NotesImportService>> _mockLogger;
    private readonly NotesImportService _sut;

    public NotesImportServiceTests()
    {
        _mockNoteRepository = new Mock<INoteRepository>();
        _mockLogger = new Mock<ILogger<NotesImportService>>();
        _sut = new NotesImportService(_mockNoteRepository.Object, _mockLogger.Object);
    }

    #region ImportAsync Tests

    [Fact]
    public async Task ImportAsync_WhenNewNotes_CreatesAllNotes()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("Note 1", "Content 1", "ext-1"),
            CreateTestImportRequest("Note 2", "Content 2", "ext-2")
        };

        _mockNoteRepository.Setup(r => r.GetByUserIdAndExternalIdAsync(userId, It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ReturnsAsync((Note n) => n);

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.ImportedCount.Should().Be(2);
        result.UpdatedCount.Should().Be(0);
        result.SkippedCount.Should().Be(0);
        result.Notes.Should().HaveCount(2);
        result.Notes.All(n => n.Status == "created").Should().BeTrue();

        _mockNoteRepository.Verify(r => r.CreateAsync(It.IsAny<Note>()), Times.Exactly(2));
    }

    [Fact]
    public async Task ImportAsync_WhenExistingNotes_UpdatesAllNotes()
    {
        // Arrange
        var userId = "user-123";
        var existingNote1 = CreateTestNote("note-1", userId, "Original Title 1", "ext-1");
        var existingNote2 = CreateTestNote("note-2", userId, "Original Title 2", "ext-2");

        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("Updated Note 1", "Updated Content 1", "ext-1"),
            CreateTestImportRequest("Updated Note 2", "Updated Content 2", "ext-2")
        };

        _mockNoteRepository.Setup(r => r.GetByUserIdAndExternalIdAsync(userId, "ext-1"))
            .ReturnsAsync(existingNote1);
        _mockNoteRepository.Setup(r => r.GetByUserIdAndExternalIdAsync(userId, "ext-2"))
            .ReturnsAsync(existingNote2);

        _mockNoteRepository.Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<Note>()))
            .ReturnsAsync((string id, Note n) => n);

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.ImportedCount.Should().Be(0);
        result.UpdatedCount.Should().Be(2);
        result.SkippedCount.Should().Be(0);
        result.Notes.Should().HaveCount(2);
        result.Notes.All(n => n.Status == "updated").Should().BeTrue();

        _mockNoteRepository.Verify(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<Note>()), Times.Exactly(2));
    }

    [Fact]
    public async Task ImportAsync_WhenMixedNewAndExisting_HandlesBoth()
    {
        // Arrange
        var userId = "user-123";
        var existingNote = CreateTestNote("note-1", userId, "Original Title", "ext-1");

        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("New Note", "New Content", "ext-new"),
            CreateTestImportRequest("Updated Note", "Updated Content", "ext-1")
        };

        _mockNoteRepository.Setup(r => r.GetByUserIdAndExternalIdAsync(userId, "ext-new"))
            .ReturnsAsync((Note?)null);
        _mockNoteRepository.Setup(r => r.GetByUserIdAndExternalIdAsync(userId, "ext-1"))
            .ReturnsAsync(existingNote);

        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ReturnsAsync((Note n) => n);
        _mockNoteRepository.Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<Note>()))
            .ReturnsAsync((string id, Note n) => n);

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.ImportedCount.Should().Be(1);
        result.UpdatedCount.Should().Be(1);
        result.SkippedCount.Should().Be(0);
        result.Notes.Should().HaveCount(2);
    }

    [Fact]
    public async Task ImportAsync_WhenNoteWithoutExternalId_CreatesNewNote()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("Note Without External ID", "Content", null)
        };

        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ReturnsAsync((Note n) => n);

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.ImportedCount.Should().Be(1);
        result.Notes[0].Status.Should().Be("created");
        _mockNoteRepository.Verify(r => r.GetByUserIdAndExternalIdAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ImportAsync_WhenCreateFails_SkipsNote()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("Note 1", "Content 1", "ext-1")
        };

        _mockNoteRepository.Setup(r => r.GetByUserIdAndExternalIdAsync(userId, It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.ImportedCount.Should().Be(0);
        result.SkippedCount.Should().Be(1);
        result.Notes.Should().HaveCount(1);
        result.Notes[0].Status.Should().Be("skipped");
        result.Notes[0].Message.Should().Contain("Error importing note");
    }

    [Fact]
    public async Task ImportAsync_WhenUpdateReturnsNull_SkipsNote()
    {
        // Arrange
        var userId = "user-123";
        var existingNote = CreateTestNote("note-1", userId, "Original Title", "ext-1");

        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("Updated Note", "Updated Content", "ext-1")
        };

        _mockNoteRepository.Setup(r => r.GetByUserIdAndExternalIdAsync(userId, "ext-1"))
            .ReturnsAsync(existingNote);

        _mockNoteRepository.Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<Note>()))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.UpdatedCount.Should().Be(0);
        result.SkippedCount.Should().Be(1);
        result.Notes[0].Status.Should().Be("skipped");
    }

    [Fact]
    public async Task ImportAsync_WhenUpdateFails_SkipsNote()
    {
        // Arrange
        var userId = "user-123";
        var existingNote = CreateTestNote("note-1", userId, "Original Title", "ext-1");

        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("Updated Note", "Updated Content", "ext-1")
        };

        _mockNoteRepository.Setup(r => r.GetByUserIdAndExternalIdAsync(userId, "ext-1"))
            .ReturnsAsync(existingNote);

        _mockNoteRepository.Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<Note>()))
            .ThrowsAsync(new Exception("Update error"));

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.UpdatedCount.Should().Be(0);
        result.SkippedCount.Should().Be(1);
        result.Notes[0].Status.Should().Be("skipped");
    }

    [Fact]
    public async Task ImportAsync_WhenEmptyList_ReturnsEmptyResponse()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<ImportNoteRequest>();

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.ImportedCount.Should().Be(0);
        result.UpdatedCount.Should().Be(0);
        result.SkippedCount.Should().Be(0);
        result.Notes.Should().BeEmpty();
    }

    [Fact]
    public async Task ImportAsync_WhenPartialFailures_ContinuesProcessing()
    {
        // Arrange
        var userId = "user-123";
        var notes = new List<ImportNoteRequest>
        {
            CreateTestImportRequest("Note 1", "Content 1", "ext-1"),
            CreateTestImportRequest("Note 2", "Content 2", "ext-2"),
            CreateTestImportRequest("Note 3", "Content 3", "ext-3")
        };

        _mockNoteRepository.Setup(r => r.GetByUserIdAndExternalIdAsync(userId, It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        _mockNoteRepository.Setup(r => r.CreateAsync(It.Is<Note>(n => n.ExternalId == "ext-1")))
            .ReturnsAsync((Note n) => n);
        _mockNoteRepository.Setup(r => r.CreateAsync(It.Is<Note>(n => n.ExternalId == "ext-2")))
            .ThrowsAsync(new Exception("Error"));
        _mockNoteRepository.Setup(r => r.CreateAsync(It.Is<Note>(n => n.ExternalId == "ext-3")))
            .ReturnsAsync((Note n) => n);

        // Act
        var result = await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        result.ImportedCount.Should().Be(2);
        result.SkippedCount.Should().Be(1);
        result.Notes.Should().HaveCount(3);
        result.Notes.Count(n => n.Status == "created").Should().Be(2);
        result.Notes.Count(n => n.Status == "skipped").Should().Be(1);
    }

    [Fact]
    public async Task ImportAsync_SetsCorrectNoteProperties()
    {
        // Arrange
        var userId = "user-123";
        var importRequest = CreateTestImportRequest("Test Title", "Test Content", "ext-1");
        importRequest.Folder = "Test Folder";
        importRequest.Tags = new List<string> { "tag1", "tag2" };
        importRequest.Source = "custom_source";
        importRequest.CreatedAt = new DateTimeOffset(2024, 1, 1, 12, 0, 0, TimeSpan.Zero);
        importRequest.UpdatedAt = new DateTimeOffset(2024, 1, 2, 12, 0, 0, TimeSpan.Zero);

        var notes = new List<ImportNoteRequest> { importRequest };

        Note? capturedNote = null;
        _mockNoteRepository.Setup(r => r.GetByUserIdAndExternalIdAsync(userId, It.IsAny<string>()))
            .ReturnsAsync((Note?)null);
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .Callback<Note>(n => capturedNote = n)
            .ReturnsAsync((Note n) => n);

        // Act
        await _sut.ImportAsync(userId, notes, CancellationToken.None);

        // Assert
        capturedNote.Should().NotBeNull();
        capturedNote!.Title.Should().Be("Test Title");
        capturedNote.Content.Should().Be("Test Content");
        capturedNote.Folder.Should().Be("Test Folder");
        capturedNote.Tags.Should().BeEquivalentTo(new[] { "tag1", "tag2" });
        capturedNote.Source.Should().Be("custom_source");
        capturedNote.ExternalId.Should().Be("ext-1");
        capturedNote.UserId.Should().Be(userId);
    }

    #endregion

    #region Helper Methods

    private static ImportNoteRequest CreateTestImportRequest(string title, string content, string? externalId)
    {
        return new ImportNoteRequest
        {
            Title = title,
            Content = content,
            ExternalId = externalId,
            Folder = null,
            Tags = new List<string>(),
            Source = "ios_notes",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    private static Note CreateTestNote(string id, string userId, string title, string? externalId = null)
    {
        return new Note
        {
            Id = id,
            UserId = userId,
            Title = title,
            Content = $"Content for {title}",
            ExternalId = externalId,
            Tags = new List<string>(),
            IsArchived = false,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}

