using FluentAssertions;
using Moq;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Plugins;

/// <summary>
/// Unit tests for NoteOrganizationPlugin.
/// Tests organization operations: list, archive, folders, tags, stats.
/// </summary>
public class NoteOrganizationPluginTests
{
    private readonly Mock<IParallelNoteRepository> _mockNoteRepository;
    private readonly NoteOrganizationPlugin _sut;
    private const string TestUserId = "user-123";

    public NoteOrganizationPluginTests()
    {
        _mockNoteRepository = new Mock<IParallelNoteRepository>();
        _sut = new NoteOrganizationPlugin(_mockNoteRepository.Object, null, null, null);
        _sut.SetCurrentUserId(TestUserId);
    }

    #region IAgentPlugin Implementation Tests

    [Fact]
    public void CapabilityId_ReturnsNotesOrganization()
    {
        _sut.CapabilityId.Should().Be("notes-organization");
    }

    [Fact]
    public void DisplayName_ReturnsNotesOrganization()
    {
        _sut.DisplayName.Should().Be("Notes Organization");
    }

    [Fact]
    public void Description_ContainsOrganization()
    {
        _sut.Description.Should().Contain("organize");
    }

    [Fact]
    public void GetPluginName_ReturnsNotesOrganization()
    {
        _sut.GetPluginName().Should().Be("NotesOrganization");
    }

    [Fact]
    public void GetSystemPromptAddition_ContainsToolDocumentation()
    {
        var result = _sut.GetSystemPromptAddition();
        result.Should().Contain("ListAllNotes");
        result.Should().Contain("ArchiveNote");
        result.Should().Contain("ListFolders");
        result.Should().Contain("ListAllTags");
    }

    #endregion

    #region ListAllNotesAsync Tests

    [Fact]
    public async Task ListAllNotesAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteOrganizationPlugin(_mockNoteRepository.Object, null, null, null);

        // Act
        var result = await plugin.ListAllNotesAsync();

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task ListAllNotesAsync_WhenNoNotes_ReturnsEmptyMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note>());

        // Act
        var result = await _sut.ListAllNotesAsync();

        // Assert
        result.Should().Contain("don't have any active notes");
    }

    [Fact]
    public async Task ListAllNotesAsync_ExcludesArchivedByDefault()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("1", "Active Note", isArchived: false),
            CreateNote("2", "Archived Note", isArchived: true)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListAllNotesAsync(includeArchived: false);

        // Assert
        result.Should().Contain("Active Note");
        result.Should().NotContain("\"Archived Note\"");
    }

    [Fact]
    public async Task ListAllNotesAsync_IncludesArchivedWhenRequested()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("1", "Active Note", isArchived: false),
            CreateNote("2", "Archived Note", isArchived: true)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListAllNotesAsync(includeArchived: true);

        // Assert
        result.Should().Contain("Active Note");
        result.Should().Contain("Archived Note");
    }

    [Fact]
    public async Task ListAllNotesAsync_RespectsSkipParameter()
    {
        // Arrange
        var notes = Enumerable.Range(1, 10)
            .Select(i => CreateNote(i.ToString(), $"Note {i}"))
            .ToList();
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListAllNotesAsync(skip: 5);

        // Assert
        result.Should().Contain("skipped");
    }

    [Fact]
    public async Task ListAllNotesAsync_RespectsLimitParameter()
    {
        // Arrange
        var notes = Enumerable.Range(1, 10)
            .Select(i => CreateNote(i.ToString(), $"Note {i}"))
            .ToList();
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListAllNotesAsync(limit: 3);

        // Assert
        result.Should().Contain("\"returned\":3");
    }

    [Fact]
    public async Task ListAllNotesAsync_WhenRepositoryThrows_ReturnsError()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.ListAllNotesAsync();

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("Database error");
    }

    #endregion

    #region ListRecentNotesAsync Tests

    [Fact]
    public async Task ListRecentNotesAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteOrganizationPlugin(_mockNoteRepository.Object, null, null, null);

        // Act
        var result = await plugin.ListRecentNotesAsync();

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task ListRecentNotesAsync_WhenNoNotes_ReturnsEmptyMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note>());

        // Act
        var result = await _sut.ListRecentNotesAsync();

        // Assert
        result.Should().Contain("don't have any notes");
    }

    [Fact]
    public async Task ListRecentNotesAsync_ReturnsRecentNotes()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("1", "Older Note", updatedAt: DateTime.UtcNow.AddDays(-10)),
            CreateNote("2", "Recent Note", updatedAt: DateTime.UtcNow.AddMinutes(-5))
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListRecentNotesAsync(maxResults: 10);

        // Assert
        result.Should().Contain("Recent Note");
        result.Should().Contain("Older Note");
    }

    [Fact]
    public async Task ListRecentNotesAsync_RespectsMaxResults()
    {
        // Arrange
        var notes = Enumerable.Range(1, 20)
            .Select(i => CreateNote(i.ToString(), $"Note {i}"))
            .ToList();
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListRecentNotesAsync(maxResults: 5);

        // Assert
        result.Should().Contain("5 most recent notes");
    }

    #endregion

    #region ListArchivedNotesAsync Tests

    [Fact]
    public async Task ListArchivedNotesAsync_WhenNoArchivedNotes_ReturnsEmptyMessage()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("1", "Active Note", isArchived: false)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListArchivedNotesAsync();

        // Assert
        result.Should().Contain("don't have any archived notes");
    }

    [Fact]
    public async Task ListArchivedNotesAsync_ReturnsOnlyArchivedNotes()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("1", "Active Note", isArchived: false),
            CreateNote("2", "Archived Note", isArchived: true)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListArchivedNotesAsync();

        // Assert
        result.Should().Contain("Archived Note");
        result.Should().NotContain("\"Active Note\"");
    }

    #endregion

    #region ArchiveNoteAsync Tests

    [Fact]
    public async Task ArchiveNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteOrganizationPlugin(_mockNoteRepository.Object, null, null, null);

        // Act
        var result = await plugin.ArchiveNoteAsync("note-1");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task ArchiveNoteAsync_WhenNoteNotFound_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.ArchiveNoteAsync("note-1");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task ArchiveNoteAsync_WhenNoteNotOwnedByUser_ReturnsPermissionError()
    {
        // Arrange
        var note = CreateNote("note-1", "Other's Note", userId: "other-user");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.ArchiveNoteAsync("note-1");

        // Assert
        result.Should().Contain("permission");
    }

    [Fact]
    public async Task ArchiveNoteAsync_WhenAlreadyArchived_ReturnsAlreadyArchivedMessage()
    {
        // Arrange
        var note = CreateNote("note-1", "Already Archived", isArchived: true);
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.ArchiveNoteAsync("note-1");

        // Assert
        result.Should().Contain("already archived");
    }

    [Fact]
    public async Task ArchiveNoteAsync_WhenValid_ArchivesNote()
    {
        // Arrange
        var note = CreateNote("note-1", "To Archive", isArchived: false);
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.UpdateAsync("note-1", It.IsAny<Note>()))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.ArchiveNoteAsync("note-1");

        // Assert
        result.Should().Contain("Successfully archived");
        _mockNoteRepository.Verify(r => r.UpdateAsync("note-1", It.Is<Note>(n => n.IsArchived == true)), Times.Once);
    }

    #endregion

    #region UnarchiveNoteAsync Tests

    [Fact]
    public async Task UnarchiveNoteAsync_WhenNoteNotArchived_ReturnsNotArchivedMessage()
    {
        // Arrange
        var note = CreateNote("note-1", "Active Note", isArchived: false);
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.UnarchiveNoteAsync("note-1");

        // Assert
        result.Should().Contain("is not archived");
    }

    [Fact]
    public async Task UnarchiveNoteAsync_WhenValid_UnarchivesNote()
    {
        // Arrange
        var note = CreateNote("note-1", "Archived Note", isArchived: true, folder: "Archived");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.UpdateAsync("note-1", It.IsAny<Note>()))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.UnarchiveNoteAsync("note-1");

        // Assert
        result.Should().Contain("Successfully restored");
        _mockNoteRepository.Verify(r => r.UpdateAsync("note-1", It.Is<Note>(n => n.IsArchived == false)), Times.Once);
    }

    #endregion

    #region MoveToFolderAsync Tests

    [Fact]
    public async Task MoveToFolderAsync_WhenNoteNotFound_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.MoveToFolderAsync("note-1", "Work");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task MoveToFolderAsync_WhenValid_MovesNoteToFolder()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.UpdateAsync("note-1", It.IsAny<Note>()))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.MoveToFolderAsync("note-1", "Work");

        // Assert
        result.Should().Contain("Moved note");
        result.Should().Contain("Work");
        _mockNoteRepository.Verify(r => r.UpdateAsync("note-1", It.Is<Note>(n => n.Folder == "Work")), Times.Once);
    }

    [Fact]
    public async Task MoveToFolderAsync_WithEmptyFolder_RemovesFromFolder()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note", folder: "Work");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.UpdateAsync("note-1", It.IsAny<Note>()))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.MoveToFolderAsync("note-1", "");

        // Assert
        result.Should().Contain("Removed note");
    }

    #endregion

    #region ListFoldersAsync Tests

    [Fact]
    public async Task ListFoldersAsync_WhenNoNotes_ReturnsNoNotesMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note>());

        // Act
        var result = await _sut.ListFoldersAsync();

        // Assert
        result.Should().Contain("don't have any notes");
    }

    [Fact]
    public async Task ListFoldersAsync_ReturnsFolderCounts()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("1", "Work Note 1", folder: "Work"),
            CreateNote("2", "Work Note 2", folder: "Work"),
            CreateNote("3", "Personal Note", folder: "Personal")
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListFoldersAsync();

        // Assert
        result.Should().Contain("Work");
        result.Should().Contain("Personal");
        result.Should().Contain("folders");
    }

    #endregion

    #region ListAllTagsAsync Tests

    [Fact]
    public async Task ListAllTagsAsync_WhenNoTags_ReturnsNoTagsMessage()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("1", "Note Without Tags", tags: new List<string>())
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListAllTagsAsync();

        // Assert
        result.Should().Contain("don't have any tags");
    }

    [Fact]
    public async Task ListAllTagsAsync_ReturnsTagCounts()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("1", "Note 1", tags: new List<string> { "work", "important" }),
            CreateNote("2", "Note 2", tags: new List<string> { "work", "meeting" })
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListAllTagsAsync();

        // Assert
        result.Should().Contain("work");
        result.Should().Contain("important");
        result.Should().Contain("meeting");
    }

    #endregion

    #region GetNoteStatsAsync Tests

    [Fact]
    public async Task GetNoteStatsAsync_ReturnsStatistics()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("1", "Note 1", tags: new List<string> { "work" }, folder: "Work"),
            CreateNote("2", "Note 2", tags: new List<string> { "personal" }),
            CreateNote("3", "Archived", isArchived: true)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.GetNoteStatsAsync();

        // Assert
        result.Should().Contain("statistics");
        result.Should().Contain("totalNotes");
        result.Should().Contain("activeNotes");
        result.Should().Contain("archivedNotes");
    }

    [Fact]
    public async Task GetNoteStatsAsync_WhenRepositoryThrows_ReturnsError()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetNoteStatsAsync();

        // Assert
        result.Should().Contain("Error");
    }

    #endregion

    #region Helper Methods

    private Note CreateNote(
        string id,
        string title,
        string? userId = null,
        bool isArchived = false,
        string? folder = null,
        List<string>? tags = null,
        DateTime? updatedAt = null)
    {
        return new Note
        {
            Id = id,
            Title = title,
            Content = $"Content for {title}",
            UserId = userId ?? TestUserId,
            IsArchived = isArchived,
            Folder = folder,
            Tags = tags ?? new List<string>(),
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = updatedAt ?? DateTime.UtcNow
        };
    }

    #endregion
}
