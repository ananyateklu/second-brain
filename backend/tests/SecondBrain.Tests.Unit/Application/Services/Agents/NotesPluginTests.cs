using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Tests.Unit.Application.Services.Agents;

public class NotesPluginTests
{
    private readonly Mock<INoteRepository> _mockNoteRepository;
    private readonly Mock<IRagService> _mockRagService;
    private readonly NotesPlugin _sut;
    private const string TestUserId = "user-123";

    public NotesPluginTests()
    {
        _mockNoteRepository = new Mock<INoteRepository>();
        _mockRagService = new Mock<IRagService>();
        _sut = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object);
        _sut.SetCurrentUserId(TestUserId);
    }

    #region IAgentPlugin Implementation Tests

    [Fact]
    public void CapabilityId_ReturnsNotes()
    {
        _sut.CapabilityId.Should().Be("notes");
    }

    [Fact]
    public void DisplayName_ReturnsNotes()
    {
        _sut.DisplayName.Should().Be("Notes");
    }

    [Fact]
    public void Description_ReturnsExpectedDescription()
    {
        _sut.Description.Should().Contain("notes");
    }

    [Fact]
    public void GetPluginInstance_ReturnsSelf()
    {
        _sut.GetPluginInstance().Should().BeSameAs(_sut);
    }

    [Fact]
    public void GetPluginName_ReturnsNotes()
    {
        _sut.GetPluginName().Should().Be("Notes");
    }

    [Fact]
    public void GetSystemPromptAddition_ReturnsNonEmptyPrompt()
    {
        var result = _sut.GetSystemPromptAddition();
        result.Should().NotBeNullOrEmpty();
        result.Should().Contain("Notes");
    }

    [Fact]
    public void GetSystemPromptAddition_ContainsToolDocumentation()
    {
        var result = _sut.GetSystemPromptAddition();
        result.Should().Contain("CreateNote");
        result.Should().Contain("SearchNotes");
        result.Should().Contain("UpdateNote");
        result.Should().Contain("DeleteNote");
    }

    #endregion

    #region CreateNoteAsync Tests

    [Fact]
    public async Task CreateNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object);
        // Note: Not calling SetCurrentUserId

        // Act
        var result = await plugin.CreateNoteAsync("Title", "Content");

        // Assert
        result.Should().Contain("Error: User context not set");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenTitleEmpty_ReturnsError()
    {
        // Act
        var result = await _sut.CreateNoteAsync("", "Content");

        // Assert
        result.Should().Contain("Error: Note title is required");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenTitleWhitespace_ReturnsError()
    {
        // Act
        var result = await _sut.CreateNoteAsync("   ", "Content");

        // Assert
        result.Should().Contain("Error: Note title is required");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenContentEmpty_ReturnsError()
    {
        // Act
        var result = await _sut.CreateNoteAsync("Title", "");

        // Assert
        result.Should().Contain("Error: Note content is required");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenContentWhitespace_ReturnsError()
    {
        // Act
        var result = await _sut.CreateNoteAsync("Title", "   ");

        // Assert
        result.Should().Contain("Error: Note content is required");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenValid_CreatesNote()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ReturnsAsync((Note n) => n);

        // Act
        var result = await _sut.CreateNoteAsync("Test Note", "Test Content");

        // Assert
        result.Should().Contain("Successfully created note");
        result.Should().Contain("Test Note");
        _mockNoteRepository.Verify(r => r.CreateAsync(It.Is<Note>(n =>
            n.Title == "Test Note" &&
            n.Content == "Test Content" &&
            n.UserId == TestUserId &&
            n.Source == "agent"
        )), Times.Once);
    }

    [Fact]
    public async Task CreateNoteAsync_WithTags_ParsesTagsCorrectly()
    {
        // Arrange
        Note? capturedNote = null;
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .Callback<Note>(n => capturedNote = n)
            .ReturnsAsync((Note n) => n);

        // Act
        var result = await _sut.CreateNoteAsync("Test", "Content", "tag1, tag2, tag3");

        // Assert
        capturedNote.Should().NotBeNull();
        capturedNote!.Tags.Should().HaveCount(3);
        capturedNote.Tags.Should().Contain("tag1");
        capturedNote.Tags.Should().Contain("tag2");
        capturedNote.Tags.Should().Contain("tag3");
    }

    [Fact]
    public async Task CreateNoteAsync_WithEmptyTags_CreatesNoteWithoutTags()
    {
        // Arrange
        Note? capturedNote = null;
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .Callback<Note>(n => capturedNote = n)
            .ReturnsAsync((Note n) => n);

        // Act
        await _sut.CreateNoteAsync("Test", "Content", null);

        // Assert
        capturedNote.Should().NotBeNull();
        capturedNote!.Tags.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateNoteAsync_TrimsTagsAndFiltersEmpty()
    {
        // Arrange
        Note? capturedNote = null;
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .Callback<Note>(n => capturedNote = n)
            .ReturnsAsync((Note n) => n);

        // Act
        await _sut.CreateNoteAsync("Test", "Content", " tag1 , , tag2 ,  ");

        // Assert
        capturedNote.Should().NotBeNull();
        capturedNote!.Tags.Should().HaveCount(2);
        capturedNote.Tags.Should().Contain("tag1");
        capturedNote.Tags.Should().Contain("tag2");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenRepositoryThrows_ReturnsError()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.CreateNoteAsync("Test", "Content");

        // Assert
        result.Should().Contain("Error creating note");
        result.Should().Contain("Database error");
    }

    [Fact]
    public async Task CreateNoteAsync_ReturnsNoteIdInResponse()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.CreateAsync(It.IsAny<Note>()))
            .ReturnsAsync((Note n) => n);

        // Act
        var result = await _sut.CreateNoteAsync("Test", "Content");

        // Assert
        result.Should().Contain("ID:");
    }

    #endregion

    #region SearchNotesAsync Tests

    [Fact]
    public async Task SearchNotesAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object);

        // Act
        var result = await plugin.SearchNotesAsync("query");

        // Assert
        result.Should().Contain("Error: User context not set");
    }

    [Fact]
    public async Task SearchNotesAsync_WhenNoNotesMatch_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note>());

        // Act
        var result = await _sut.SearchNotesAsync("test query");

        // Assert
        result.Should().Contain("No notes found");
    }

    [Fact]
    public async Task SearchNotesAsync_MatchesTitleCaseInsensitive()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateTestNote("1", "Meeting Notes", "Some content"),
            CreateTestNote("2", "Shopping List", "Buy groceries")
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("meeting");

        // Assert
        result.Should().Contain("Meeting Notes");
        result.Should().NotContain("Shopping List");
    }

    [Fact]
    public async Task SearchNotesAsync_MatchesContentCaseInsensitive()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateTestNote("1", "Note 1", "This contains groceries"),
            CreateTestNote("2", "Note 2", "This is about coding")
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("groceries");

        // Assert
        result.Should().Contain("Note 1");
    }

    [Fact]
    public async Task SearchNotesAsync_MatchesTags()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateTestNote("1", "Note 1", "Content", new List<string> { "work", "important" }),
            CreateTestNote("2", "Note 2", "Content", new List<string> { "personal" })
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("work");

        // Assert
        result.Should().Contain("Note 1");
    }

    [Fact]
    public async Task SearchNotesAsync_ExcludesArchivedNotes()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateTestNote("1", "Active Note", "Test content", isArchived: false),
            CreateTestNote("2", "Archived Note", "Test content", isArchived: true)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("Test");

        // Assert
        result.Should().Contain("Active Note");
        result.Should().NotContain("Archived Note");
    }

    [Fact]
    public async Task SearchNotesAsync_RespectsMaxResults()
    {
        // Arrange
        var notes = Enumerable.Range(1, 10)
            .Select(i => CreateTestNote(i.ToString(), $"Note {i}", "Test content"))
            .ToList();
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("Test", maxResults: 3);

        // Assert
        // Result is JSON, count the occurrences of "id"
        var idCount = result.Split("\"id\"").Length - 1;
        idCount.Should().BeLessThanOrEqualTo(3);
    }

    [Fact]
    public async Task SearchNotesAsync_WhenRepositoryThrows_ReturnsError()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.SearchNotesAsync("test");

        // Assert
        result.Should().Contain("Error searching notes");
    }

    #endregion

    #region UpdateNoteAsync Tests

    [Fact]
    public async Task UpdateNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object);

        // Act
        var result = await plugin.UpdateNoteAsync("note-id", "New Title");

        // Assert
        result.Should().Contain("Error: User context not set");
    }

    [Fact]
    public async Task UpdateNoteAsync_WhenNoteNotFound_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdAsync("non-existent"))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.UpdateNoteAsync("non-existent", "New Title");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task UpdateNoteAsync_WhenNoteNotOwnedByUser_ReturnsPermissionError()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Title", "Content");
        note.UserId = "other-user";
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.UpdateNoteAsync("note-id", "New Title");

        // Assert
        result.Should().Contain("don't have permission");
    }

    [Fact]
    public async Task UpdateNoteAsync_UpdatesTitle()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Old Title", "Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.UpdateAsync("note-id", It.IsAny<Note>()))
            .ReturnsAsync((string id, Note n) => n);

        // Act
        var result = await _sut.UpdateNoteAsync("note-id", title: "New Title");

        // Assert
        result.Should().Contain("Successfully updated");
        _mockNoteRepository.Verify(r => r.UpdateAsync("note-id", It.Is<Note>(n =>
            n.Title == "New Title")), Times.Once);
    }

    [Fact]
    public async Task UpdateNoteAsync_UpdatesContent()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Title", "Old Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.UpdateAsync("note-id", It.IsAny<Note>()))
            .ReturnsAsync((string id, Note n) => n);

        // Act
        var result = await _sut.UpdateNoteAsync("note-id", content: "New Content");

        // Assert
        result.Should().Contain("Successfully updated");
    }

    [Fact]
    public async Task UpdateNoteAsync_UpdatesTags()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Title", "Content", new List<string> { "old-tag" });
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.UpdateAsync("note-id", It.IsAny<Note>()))
            .ReturnsAsync((string id, Note n) => n);

        // Act
        var result = await _sut.UpdateNoteAsync("note-id", tags: "new-tag, another-tag");

        // Assert
        result.Should().Contain("Successfully updated");
        result.Should().Contain("tags");
    }

    [Fact]
    public async Task UpdateNoteAsync_WhenNoChanges_ReturnsNoChangesMessage()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Title", "Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.UpdateNoteAsync("note-id"); // No changes provided

        // Assert
        result.Should().Contain("No changes made");
    }

    [Fact]
    public async Task UpdateNoteAsync_WhenRepositoryThrows_ReturnsError()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Title", "Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.UpdateAsync("note-id", It.IsAny<Note>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.UpdateNoteAsync("note-id", title: "New Title");

        // Assert
        result.Should().Contain("Error updating note");
    }

    #endregion

    #region GetNoteAsync Tests

    [Fact]
    public async Task GetNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object);

        // Act
        var result = await plugin.GetNoteAsync("note-id");

        // Assert
        result.Should().Contain("Error: User context not set");
    }

    [Fact]
    public async Task GetNoteAsync_WhenNoteNotFound_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdAsync("non-existent"))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.GetNoteAsync("non-existent");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task GetNoteAsync_WhenNoteNotOwnedByUser_ReturnsPermissionError()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Title", "Content");
        note.UserId = "other-user";
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.GetNoteAsync("note-id");

        // Assert
        result.Should().Contain("don't have permission");
    }

    [Fact]
    public async Task GetNoteAsync_WhenNoteExists_ReturnsNoteAsJson()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Test Note", "Test Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.GetNoteAsync("note-id");

        // Assert
        result.Should().Contain("Test Note");
        result.Should().Contain("note-id");
        result.Should().Contain("type");
        result.Should().Contain("notes");
    }

    [Fact]
    public async Task GetNoteAsync_WhenRepositoryThrows_ReturnsError()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetNoteAsync("note-id");

        // Assert
        result.Should().Contain("Error getting note");
    }

    #endregion

    #region ListRecentNotesAsync Tests

    [Fact]
    public async Task ListRecentNotesAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object);

        // Act
        var result = await plugin.ListRecentNotesAsync();

        // Assert
        result.Should().Contain("Error: User context not set");
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
    public async Task ListRecentNotesAsync_ExcludesArchivedNotes()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateTestNote("1", "Active Note", "Content", isArchived: false),
            CreateTestNote("2", "Archived Note", "Content", isArchived: true)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListRecentNotesAsync();

        // Assert
        result.Should().Contain("Active Note");
        result.Should().NotContain("Archived Note");
    }

    [Fact]
    public async Task ListRecentNotesAsync_OrdersByUpdatedAtDescending()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateTestNote("1", "Old Note", "Content", updatedAt: DateTime.UtcNow.AddDays(-10)),
            CreateTestNote("2", "New Note", "Content", updatedAt: DateTime.UtcNow)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListRecentNotesAsync();

        // Assert
        var newIndex = result.IndexOf("New Note");
        var oldIndex = result.IndexOf("Old Note");
        newIndex.Should().BeLessThan(oldIndex);
    }

    [Fact]
    public async Task ListRecentNotesAsync_RespectsMaxResults()
    {
        // Arrange
        var notes = Enumerable.Range(1, 20)
            .Select(i => CreateTestNote(i.ToString(), $"Note {i}", "Content"))
            .ToList();
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.ListRecentNotesAsync(maxResults: 5);

        // Assert
        var idCount = result.Split("\"id\"").Length - 1;
        idCount.Should().BeLessThanOrEqualTo(5);
    }

    [Fact]
    public async Task ListRecentNotesAsync_WhenRepositoryThrows_ReturnsError()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.ListRecentNotesAsync();

        // Assert
        result.Should().Contain("Error listing notes");
    }

    #endregion

    #region SemanticSearchAsync Tests

    [Fact]
    public async Task SemanticSearchAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object);

        // Act
        var result = await plugin.SemanticSearchAsync("query");

        // Assert
        result.Should().Contain("Error: User context not set");
    }

    [Fact]
    public async Task SemanticSearchAsync_WhenRagServiceNull_ReturnsFallbackMessage()
    {
        // Arrange
        var plugin = new NotesPlugin(_mockNoteRepository.Object, null);
        plugin.SetCurrentUserId(TestUserId);

        // Act
        var result = await plugin.SemanticSearchAsync("query");

        // Assert
        result.Should().Contain("Semantic search is not available");
    }

    [Fact]
    public async Task SemanticSearchAsync_WhenNoResults_ReturnsNotFoundMessage()
    {
        // Arrange
        var ragContext = new RagContext { RetrievedNotes = new List<VectorSearchResult>() };
        _mockRagService.Setup(r => r.RetrieveContextAsync(
                It.IsAny<string>(),
                TestUserId,
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(ragContext);

        // Act
        var result = await _sut.SemanticSearchAsync("query");

        // Assert
        result.Should().Contain("No notes found");
    }

    [Fact]
    public async Task SemanticSearchAsync_ReturnsMatchingNotes()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Related Note", "Content");
        var ragContext = new RagContext
        {
            RetrievedNotes = new List<VectorSearchResult>
            {
                new VectorSearchResult { NoteId = "note-id", SimilarityScore = 0.9f }
            }
        };
        _mockRagService.Setup(r => r.RetrieveContextAsync(
                It.IsAny<string>(),
                TestUserId,
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(ragContext);
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.SemanticSearchAsync("query");

        // Assert
        result.Should().Contain("Related Note");
    }

    [Fact]
    public async Task SemanticSearchAsync_WhenExceptionThrown_ReturnsError()
    {
        // Arrange
        _mockRagService.Setup(r => r.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("RAG error"));

        // Act
        var result = await _sut.SemanticSearchAsync("query");

        // Assert
        result.Should().Contain("Error performing semantic search");
    }

    #endregion

    #region DeleteNoteAsync Tests

    [Fact]
    public async Task DeleteNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object);

        // Act
        var result = await plugin.DeleteNoteAsync("note-id");

        // Assert
        result.Should().Contain("Error: User context not set");
    }

    [Fact]
    public async Task DeleteNoteAsync_WhenNoteNotFound_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdAsync("non-existent"))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.DeleteNoteAsync("non-existent");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task DeleteNoteAsync_WhenNoteNotOwnedByUser_ReturnsPermissionError()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Title", "Content");
        note.UserId = "other-user";
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.DeleteNoteAsync("note-id");

        // Assert
        result.Should().Contain("don't have permission");
    }

    [Fact]
    public async Task DeleteNoteAsync_WhenSuccessful_DeletesNoteAndReturnsSuccess()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Test Note", "Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.DeleteAsync("note-id"))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteNoteAsync("note-id");

        // Assert
        result.Should().Contain("Successfully deleted");
        result.Should().Contain("Test Note");
        _mockNoteRepository.Verify(r => r.DeleteAsync("note-id"), Times.Once);
    }

    [Fact]
    public async Task DeleteNoteAsync_WhenRepositoryThrows_ReturnsError()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Title", "Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);
        _mockNoteRepository.Setup(r => r.DeleteAsync("note-id"))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.DeleteNoteAsync("note-id");

        // Assert
        result.Should().Contain("Error deleting note");
    }

    #endregion

    #region Helper Methods

    private Note CreateTestNote(
        string id,
        string title,
        string content,
        List<string>? tags = null,
        bool isArchived = false,
        DateTime? updatedAt = null)
    {
        return new Note
        {
            Id = id,
            UserId = TestUserId,
            Title = title,
            Content = content,
            Tags = tags ?? new List<string>(),
            IsArchived = isArchived,
            Source = "web",
            CreatedAt = DateTime.UtcNow.AddDays(-7),
            UpdatedAt = updatedAt ?? DateTime.UtcNow
        };
    }

    #endregion
}

