using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.DTOs;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Enums;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Notes;

/// <summary>
/// Unit tests verifying that NoteOperationService properly tracks version sources
/// across different operation types (Web, Agent, Import, Restore).
/// </summary>
public class NoteOperationServiceVersioningTests
{
    private readonly Mock<INoteRepository> _mockNoteRepository;
    private readonly Mock<INoteImageRepository> _mockImageRepository;
    private readonly Mock<INoteVersionService> _mockVersionService;
    private readonly Mock<INoteSummaryService> _mockSummaryService;
    private readonly Mock<IServiceScopeFactory> _mockScopeFactory;
    private readonly Mock<ILogger<NoteOperationService>> _mockLogger;
    private readonly NoteOperationService _sut;

    private const string TestUserId = "test-user-123";

    public NoteOperationServiceVersioningTests()
    {
        _mockNoteRepository = new Mock<INoteRepository>();
        _mockImageRepository = new Mock<INoteImageRepository>();
        _mockVersionService = new Mock<INoteVersionService>();
        _mockSummaryService = new Mock<INoteSummaryService>();
        _mockScopeFactory = new Mock<IServiceScopeFactory>();
        _mockLogger = new Mock<ILogger<NoteOperationService>>();

        // Setup summary service as disabled by default
        _mockSummaryService.Setup(s => s.IsEnabled).Returns(false);

        // Constructor order: noteRepository, noteImageRepository, versionService, summaryService, scopeFactory, logger
        _sut = new NoteOperationService(
            _mockNoteRepository.Object,
            _mockImageRepository.Object,
            _mockVersionService.Object,
            _mockSummaryService.Object,
            _mockScopeFactory.Object,
            _mockLogger.Object
        );
    }

    #region Agent Source Tracking Tests

    /// <summary>
    /// Verifies that creating a note with NoteSource.Agent creates version with agent source.
    /// </summary>
    [Fact]
    public async Task CreateAsync_WithAgentSource_CreatesVersionWithAgentSource()
    {
        // Arrange
        var request = new CreateNoteOperationRequest
        {
            UserId = TestUserId,
            Title = "Agent Created Note",
            Content = "Content created by Agent",
            Tags = new List<string> { "agent", "test" },
            Source = NoteSource.Agent
        };

        // Return the note that was passed in (preserves Source set by service)
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ReturnsAsync((Note n) => n);

        _mockVersionService.Setup(v => v.CreateInitialVersionAsync(
                It.IsAny<Note>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .Callback<Note, string, CancellationToken>((note, userId, ct) =>
            {
                // Note's Source field should be set to "agent"
                note.Source.Should().Be("agent");
            })
            .ReturnsAsync((Note n, string userId, CancellationToken ct) => new NoteVersionResponse
            {
                NoteId = n.Id,
                VersionNumber = 1,
                Title = n.Title,
                Content = n.Content,
                Source = "agent",
                IsCurrent = true
            });

        // Act
        var result = await _sut.CreateAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Source.Should().Be(NoteSource.Agent);
        result.Value.VersionNumber.Should().Be(1);
        result.Value.IsNewNote.Should().BeTrue();

        _mockVersionService.Verify(v => v.CreateInitialVersionAsync(
            It.Is<Note>(n => n.Source == "agent"),
            TestUserId,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    /// <summary>
    /// Verifies that updating a note with NoteSource.Agent creates version with agent source.
    /// </summary>
    [Fact]
    public async Task UpdateAsync_WithAgentSource_CreatesVersionWithAgentSource()
    {
        // Arrange
        var existingNote = CreateTestNote("note-123", "Original Title", "Original Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-123"))
            .ReturnsAsync(existingNote);

        _mockVersionService.Setup(v => v.GetVersionCountAsync("note-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        _mockVersionService.Setup(v => v.CreateVersionAsync(
                It.IsAny<Note>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);

        _mockNoteRepository.Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<Note>()))
            .ReturnsAsync(existingNote);

        var request = new UpdateNoteOperationRequest
        {
            NoteId = "note-123",
            UserId = TestUserId,
            Title = "Agent Updated Title",
            Source = NoteSource.Agent
        };

        // Act
        var result = await _sut.UpdateAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Source.Should().Be(NoteSource.Agent);
        result.Value.Changes.Should().Contain("title");

        _mockVersionService.Verify(v => v.CreateVersionAsync(
            It.Is<Note>(n => n.Source == "agent"),
            TestUserId,
            It.Is<string>(s => s.Contains("Agent", StringComparison.OrdinalIgnoreCase)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    /// <summary>
    /// Verifies that appending to a note with NoteSource.Agent tracks agent source.
    /// </summary>
    [Fact]
    public async Task AppendAsync_WithAgentSource_CreatesVersionWithAgentSource()
    {
        // Arrange
        var existingNote = CreateTestNote("note-123", "Title", "Original content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-123"))
            .ReturnsAsync(existingNote);

        _mockVersionService.Setup(v => v.GetVersionCountAsync("note-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        _mockVersionService.Setup(v => v.CreateVersionAsync(
                It.IsAny<Note>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);

        _mockNoteRepository.Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<Note>()))
            .ReturnsAsync(existingNote);

        var request = new AppendToNoteOperationRequest
        {
            NoteId = "note-123",
            UserId = TestUserId,
            ContentToAppend = "\n\nAppended by agent",
            Source = NoteSource.Agent,
            AddNewline = true
        };

        // Act
        var result = await _sut.AppendAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Source.Should().Be(NoteSource.Agent);
        result.Value.Changes.Should().Contain("content");
    }

    /// <summary>
    /// Verifies that deleting a note with NoteSource.Agent tracks agent source.
    /// </summary>
    [Fact]
    public async Task DeleteAsync_WithAgentSource_TracksAgentSource()
    {
        // Arrange
        var existingNote = CreateTestNote("note-123", "To Delete", "Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-123"))
            .ReturnsAsync(existingNote);

        _mockNoteRepository.Setup(r => r.DeleteAsync("note-123"))
            .ReturnsAsync(true);

        var request = new DeleteNoteOperationRequest
        {
            NoteId = "note-123",
            UserId = TestUserId,
            Source = NoteSource.Agent,
            SoftDelete = false // Hard delete
        };

        // Act
        var result = await _sut.DeleteAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Source.Should().Be(NoteSource.Agent);
    }

    #endregion

    #region Web Source Tracking Tests

    /// <summary>
    /// Verifies that creating a note with NoteSource.Web creates version with web source.
    /// </summary>
    [Fact]
    public async Task CreateAsync_WithWebSource_CreatesVersionWithWebSource()
    {
        // Arrange
        var request = new CreateNoteOperationRequest
        {
            UserId = TestUserId,
            Title = "Web Created Note",
            Content = "Content created via web UI",
            Source = NoteSource.Web
        };

        // Return the note that was passed in (preserves Source set by service)
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ReturnsAsync((Note n) => n);

        _mockVersionService.Setup(v => v.CreateInitialVersionAsync(
                It.IsAny<Note>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .Callback<Note, string, CancellationToken>((note, userId, ct) =>
            {
                // Note's Source field should be set to "web"
                note.Source.Should().Be("web");
            })
            .ReturnsAsync((Note n, string userId, CancellationToken ct) => new NoteVersionResponse
            {
                NoteId = n.Id,
                VersionNumber = 1,
                Source = "web",
                IsCurrent = true
            });

        // Act
        var result = await _sut.CreateAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Source.Should().Be(NoteSource.Web);

        _mockVersionService.Verify(v => v.CreateInitialVersionAsync(
            It.Is<Note>(n => n.Source == "web"),
            TestUserId,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region Import Source Tracking Tests

    /// <summary>
    /// Verifies that creating a note with NoteSource.IosNotes tracks iOS source.
    /// </summary>
    [Fact]
    public async Task CreateAsync_WithIosNotesSource_CreatesVersionWithIosSource()
    {
        // Arrange
        var request = new CreateNoteOperationRequest
        {
            UserId = TestUserId,
            Title = "iOS Imported Note",
            Content = "Content from iOS Notes",
            ExternalId = "ios-external-123",
            Source = NoteSource.IosNotes
        };

        // Return the note that was passed in (preserves Source set by service)
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ReturnsAsync((Note n) => n);

        _mockVersionService.Setup(v => v.CreateInitialVersionAsync(
                It.IsAny<Note>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .Callback<Note, string, CancellationToken>((note, userId, ct) =>
            {
                // Note's Source field should be set to "ios_notes"
                note.Source.Should().Be("ios_notes");
            })
            .ReturnsAsync((Note n, string userId, CancellationToken ct) => new NoteVersionResponse
            {
                NoteId = n.Id,
                VersionNumber = 1,
                Source = "ios_notes",
                IsCurrent = true
            });

        // Act
        var result = await _sut.CreateAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Source.Should().Be(NoteSource.IosNotes);

        _mockVersionService.Verify(v => v.CreateInitialVersionAsync(
            It.Is<Note>(n => n.Source == "ios_notes"),
            TestUserId,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    /// <summary>
    /// Verifies that creating a note with NoteSource.Import tracks import source.
    /// </summary>
    [Fact]
    public async Task CreateAsync_WithImportSource_CreatesVersionWithImportSource()
    {
        // Arrange
        var request = new CreateNoteOperationRequest
        {
            UserId = TestUserId,
            Title = "Generic Import Note",
            Content = "Content from external import",
            ExternalId = "ext-123",
            Source = NoteSource.Import
        };

        // Return the note that was passed in (preserves Source set by service)
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ReturnsAsync((Note n) => n);

        _mockVersionService.Setup(v => v.CreateInitialVersionAsync(
                It.IsAny<Note>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .Callback<Note, string, CancellationToken>((note, userId, ct) =>
            {
                // Note's Source field should be set to "import"
                note.Source.Should().Be("import");
            })
            .ReturnsAsync((Note n, string userId, CancellationToken ct) => new NoteVersionResponse
            {
                NoteId = n.Id,
                VersionNumber = 1,
                Source = "import",
                IsCurrent = true
            });

        // Act
        var result = await _sut.CreateAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Source.Should().Be(NoteSource.Import);

        _mockVersionService.Verify(v => v.CreateInitialVersionAsync(
            It.Is<Note>(n => n.Source == "import"),
            TestUserId,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region Restore Source Tracking Tests

    /// <summary>
    /// Verifies that restoring a version creates a new version with source='restored'.
    /// </summary>
    [Fact]
    public async Task RestoreVersionAsync_CreatesNewVersionWithRestoredSource()
    {
        // Arrange
        var existingNote = CreateTestNote("note-123", "Current Title", "Current Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-123"))
            .ReturnsAsync(existingNote);

        var targetVersion = new NoteVersionResponse
        {
            NoteId = "note-123",
            VersionNumber = 1,
            Title = "Original Title v1",
            Content = "Original Content v1",
            Tags = new List<string> { "original" },
            IsArchived = false,
            Folder = null,
            Source = "web"
        };

        _mockVersionService.Setup(v => v.GetVersionByNumberAsync("note-123", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(targetVersion);

        _mockVersionService.Setup(v => v.RestoreVersionAsync("note-123", 1, TestUserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(4); // New version number after restore

        _mockNoteRepository.Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<Note>()))
            .ReturnsAsync(existingNote);

        var request = new RestoreVersionOperationRequest
        {
            NoteId = "note-123",
            UserId = TestUserId,
            TargetVersionNumber = 1
        };

        // Act
        var result = await _sut.RestoreVersionAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.NewVersionNumber.Should().Be(4);
        result.Value.RestoredFromVersion.Should().Be(1);

        // Verify the note was updated with restored source
        _mockNoteRepository.Verify(r => r.UpdateAsync(
            "note-123",
            It.Is<Note>(n => n.Source == "restored")), Times.Once);
    }

    #endregion

    #region Change Detection Tests

    /// <summary>
    /// Verifies that updating with no actual changes does not create a new version.
    /// </summary>
    [Fact]
    public async Task UpdateAsync_NoChanges_DoesNotCreateNewVersion()
    {
        // Arrange
        var existingNote = CreateTestNote("note-123", "Same Title", "Same Content");
        existingNote.Tags = new List<string> { "tag1" };

        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-123"))
            .ReturnsAsync(existingNote);

        var request = new UpdateNoteOperationRequest
        {
            NoteId = "note-123",
            UserId = TestUserId,
            Title = "Same Title",
            Content = "Same Content",
            Tags = new List<string> { "tag1" },
            Source = NoteSource.Web
        };

        // Act
        var result = await _sut.UpdateAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.VersionNumber.Should().Be(0); // No new version
        result.Value.Changes.Should().BeEmpty();
        result.Value.HasChanges.Should().BeFalse();

        // Should NOT call CreateVersionAsync when no changes
        _mockVersionService.Verify(v => v.CreateVersionAsync(
            It.IsAny<Note>(),
            It.IsAny<string>(),
            It.IsAny<string?>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    /// <summary>
    /// Verifies that each type of change is properly detected.
    /// </summary>
    [Theory]
    [InlineData("New Title", null, null, new[] { "title" })]
    [InlineData(null, "New Content", null, new[] { "content" })]
    public async Task UpdateAsync_DetectsCorrectChanges(
        string? newTitle,
        string? newContent,
        string[]? newTags,
        string[] expectedChanges)
    {
        // Arrange
        var existingNote = CreateTestNote("note-123", "Original Title", "Original Content");
        existingNote.Tags = new List<string> { "tag1" };

        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-123"))
            .ReturnsAsync(existingNote);

        _mockVersionService.Setup(v => v.GetVersionCountAsync("note-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        _mockVersionService.Setup(v => v.CreateVersionAsync(
                It.IsAny<Note>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);

        _mockNoteRepository.Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<Note>()))
            .ReturnsAsync(existingNote);

        var request = new UpdateNoteOperationRequest
        {
            NoteId = "note-123",
            UserId = TestUserId,
            Title = newTitle,
            Content = newContent,
            Tags = newTags?.ToList(),
            Source = NoteSource.Web
        };

        // Act
        var result = await _sut.UpdateAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Changes.Should().BeEquivalentTo(expectedChanges);
    }

    #endregion

    #region Bulk Delete Source Tracking Tests

    /// <summary>
    /// Verifies that bulk delete properly tracks source.
    /// </summary>
    [Fact]
    public async Task BulkDeleteAsync_WithWebSource_TracksWebSource()
    {
        // Arrange
        var noteIds = new[] { "note-1", "note-2", "note-3" };

        // BulkDeleteAsync calls SoftDeleteManyAsync, not individual SoftDeleteAsync
        _mockNoteRepository.Setup(r => r.SoftDeleteManyAsync(
                It.Is<IEnumerable<string>>(ids => ids.SequenceEqual(noteIds)),
                TestUserId))
            .ReturnsAsync(3);

        var request = new BulkDeleteNotesOperationRequest
        {
            NoteIds = noteIds,
            UserId = TestUserId,
            Source = NoteSource.Web,
            SoftDelete = true
        };

        // Act
        var result = await _sut.BulkDeleteAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Source.Should().Be(NoteSource.Web);
        result.Value.DeletedCount.Should().Be(3);
        result.Value.WasSoftDelete.Should().BeTrue();
    }

    /// <summary>
    /// Verifies that bulk delete with agent source tracks agent source.
    /// </summary>
    [Fact]
    public async Task BulkDeleteAsync_WithAgentSource_TracksAgentSource()
    {
        // Arrange
        var noteIds = new[] { "note-1", "note-2" };

        // BulkDeleteAsync calls DeleteManyAsync for hard delete
        _mockNoteRepository.Setup(r => r.DeleteManyAsync(
                It.Is<IEnumerable<string>>(ids => ids.SequenceEqual(noteIds)),
                TestUserId))
            .ReturnsAsync(2);

        var request = new BulkDeleteNotesOperationRequest
        {
            NoteIds = noteIds,
            UserId = TestUserId,
            Source = NoteSource.Agent,
            SoftDelete = false // Hard delete
        };

        // Act
        var result = await _sut.BulkDeleteAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Source.Should().Be(NoteSource.Agent);
        result.Value.DeletedCount.Should().Be(2);
        result.Value.WasSoftDelete.Should().BeFalse();
    }

    #endregion

    #region Helper Methods

    private Note CreateTestNote(string id, string title, string content)
    {
        return new Note
        {
            Id = id,
            UserId = TestUserId,
            Title = title,
            Content = content,
            Tags = new List<string>(),
            IsArchived = false,
            Source = "web",
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
