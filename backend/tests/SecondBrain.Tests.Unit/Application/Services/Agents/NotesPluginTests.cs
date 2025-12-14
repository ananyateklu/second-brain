using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Enums;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Tests.Unit.Application.Services.Agents;

public class NotesPluginTests
{
    private readonly Mock<IParallelNoteRepository> _mockNoteRepository;
    private readonly Mock<IRagService> _mockRagService;
    private readonly Mock<INoteOperationService> _mockNoteOperationService;
    private readonly NotesPlugin _sut;
    private const string TestUserId = "user-123";

    public NotesPluginTests()
    {
        _mockNoteRepository = new Mock<IParallelNoteRepository>();
        _mockRagService = new Mock<IRagService>();
        _mockNoteOperationService = new Mock<INoteOperationService>();
        _sut = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object, null, null, _mockNoteOperationService.Object);
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
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object, null, null, _mockNoteOperationService.Object);
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
        result.Should().Contain("Error: The 'content' parameter is required");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenContentWhitespace_ReturnsError()
    {
        // Act
        var result = await _sut.CreateNoteAsync("Title", "   ");

        // Assert
        result.Should().Contain("Error: The 'content' parameter is required");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenValid_CreatesNote()
    {
        // Arrange
        var createdNote = CreateTestNote("note-123", "Test Note", "Test Content");
        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(new NoteOperationResult
            {
                Note = createdNote,
                VersionNumber = 1,
                Source = NoteSource.Agent,
                Changes = new List<string>(),
                IsNewNote = true
            }));

        // Act
        var result = await _sut.CreateNoteAsync("Test Note", "Test Content");

        // Assert
        result.Should().Contain("Successfully created note");
        result.Should().Contain("Test Note");
        _mockNoteOperationService.Verify(s => s.CreateAsync(
            It.Is<CreateNoteOperationRequest>(r =>
                r.Title == "Test Note" &&
                r.Content == "Test Content" &&
                r.UserId == TestUserId &&
                r.Source == NoteSource.Agent),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateNoteAsync_WithTags_ParsesTagsCorrectly()
    {
        // Arrange
        CreateNoteOperationRequest? capturedRequest = null;
        var createdNote = CreateTestNote("note-123", "Test", "Content", new List<string> { "tag1", "tag2", "tag3" });
        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<CreateNoteOperationRequest, CancellationToken>((r, _) => capturedRequest = r)
            .ReturnsAsync(Result<NoteOperationResult>.Success(new NoteOperationResult
            {
                Note = createdNote,
                VersionNumber = 1,
                Source = NoteSource.Agent,
                Changes = new List<string>(),
                IsNewNote = true
            }));

        // Act
        var result = await _sut.CreateNoteAsync("Test", "Content", "tag1, tag2, tag3");

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Tags.Should().HaveCount(3);
        capturedRequest.Tags.Should().Contain("tag1");
        capturedRequest.Tags.Should().Contain("tag2");
        capturedRequest.Tags.Should().Contain("tag3");
    }

    [Fact]
    public async Task CreateNoteAsync_WithEmptyTags_CreatesNoteWithoutTags()
    {
        // Arrange
        CreateNoteOperationRequest? capturedRequest = null;
        var createdNote = CreateTestNote("note-123", "Test", "Content");
        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<CreateNoteOperationRequest, CancellationToken>((r, _) => capturedRequest = r)
            .ReturnsAsync(Result<NoteOperationResult>.Success(new NoteOperationResult
            {
                Note = createdNote,
                VersionNumber = 1,
                Source = NoteSource.Agent,
                Changes = new List<string>(),
                IsNewNote = true
            }));

        // Act
        await _sut.CreateNoteAsync("Test", "Content", null);

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Tags.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateNoteAsync_TrimsTagsAndFiltersEmpty()
    {
        // Arrange
        CreateNoteOperationRequest? capturedRequest = null;
        var createdNote = CreateTestNote("note-123", "Test", "Content", new List<string> { "tag1", "tag2" });
        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .Callback<CreateNoteOperationRequest, CancellationToken>((r, _) => capturedRequest = r)
            .ReturnsAsync(Result<NoteOperationResult>.Success(new NoteOperationResult
            {
                Note = createdNote,
                VersionNumber = 1,
                Source = NoteSource.Agent,
                Changes = new List<string>(),
                IsNewNote = true
            }));

        // Act
        await _sut.CreateNoteAsync("Test", "Content", " tag1 , , tag2 ,  ");

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Tags.Should().HaveCount(2);
        capturedRequest.Tags.Should().Contain("tag1");
        capturedRequest.Tags.Should().Contain("tag2");
    }

    [Fact]
    public async Task CreateNoteAsync_WhenServiceReturnsError_ReturnsError()
    {
        // Arrange
        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Failure(new Error("CreateFailed", "Database error")));

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
        var createdNote = CreateTestNote("note-123", "Test", "Content");
        _mockNoteOperationService
            .Setup(s => s.CreateAsync(It.IsAny<CreateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(new NoteOperationResult
            {
                Note = createdNote,
                VersionNumber = 1,
                Source = NoteSource.Agent,
                Changes = new List<string>(),
                IsNewNote = true
            }));

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
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object, null, null, _mockNoteOperationService.Object);

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
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object, null, null, _mockNoteOperationService.Object);

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
        _mockNoteOperationService
            .Setup(s => s.UpdateAsync(It.IsAny<UpdateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(new NoteOperationResult
            {
                Note = CreateTestNote("note-id", "New Title", "Content"),
                VersionNumber = 2,
                Source = NoteSource.Agent,
                Changes = new List<string> { "title" },
                IsNewNote = false
            }));

        // Act
        var result = await _sut.UpdateNoteAsync("note-id", title: "New Title");

        // Assert
        result.Should().Contain("Successfully updated");
        _mockNoteOperationService.Verify(s => s.UpdateAsync(
            It.Is<UpdateNoteOperationRequest>(r => r.Title == "New Title"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateNoteAsync_UpdatesContent()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Title", "Old Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);
        _mockNoteOperationService
            .Setup(s => s.UpdateAsync(It.IsAny<UpdateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(new NoteOperationResult
            {
                Note = CreateTestNote("note-id", "Title", "New Content"),
                VersionNumber = 2,
                Source = NoteSource.Agent,
                Changes = new List<string> { "content" },
                IsNewNote = false
            }));

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
        _mockNoteOperationService
            .Setup(s => s.UpdateAsync(It.IsAny<UpdateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(new NoteOperationResult
            {
                Note = CreateTestNote("note-id", "Title", "Content", new List<string> { "new-tag", "another-tag" }),
                VersionNumber = 2,
                Source = NoteSource.Agent,
                Changes = new List<string> { "tags" },
                IsNewNote = false
            }));

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
        _mockNoteOperationService
            .Setup(s => s.UpdateAsync(It.IsAny<UpdateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Success(new NoteOperationResult
            {
                Note = note,
                VersionNumber = 1,
                Source = NoteSource.Agent,
                Changes = new List<string>(),
                IsNewNote = false
            }));

        // Act
        var result = await _sut.UpdateNoteAsync("note-id"); // No changes provided

        // Assert
        result.Should().Contain("No changes made");
    }

    [Fact]
    public async Task UpdateNoteAsync_WhenServiceReturnsError_ReturnsError()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Title", "Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);
        _mockNoteOperationService
            .Setup(s => s.UpdateAsync(It.IsAny<UpdateNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteOperationResult>.Failure(new Error("UpdateFailed", "Database error")));

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
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object, null, null, _mockNoteOperationService.Object);

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
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object, null, null, _mockNoteOperationService.Object);

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
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object, null, null, _mockNoteOperationService.Object);

        // Act
        var result = await plugin.SemanticSearchAsync("query");

        // Assert
        result.Should().Contain("Error: User context not set");
    }

    [Fact]
    public async Task SemanticSearchAsync_WhenRagServiceNull_ReturnsFallbackMessage()
    {
        // Arrange
        var plugin = new NotesPlugin(_mockNoteRepository.Object, null, null, null, _mockNoteOperationService.Object);
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
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
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
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
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
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
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
        var plugin = new NotesPlugin(_mockNoteRepository.Object, _mockRagService.Object, null, null, _mockNoteOperationService.Object);

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
        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteDeleteResult>.Success(new NoteDeleteResult
            {
                Success = true,
                NoteId = "note-id",
                Source = NoteSource.Agent,
                WasSoftDelete = false
            }));

        // Act
        var result = await _sut.DeleteNoteAsync("note-id");

        // Assert
        result.Should().Contain("Successfully deleted");
        result.Should().Contain("Test Note");
        _mockNoteOperationService.Verify(s => s.DeleteAsync(
            It.Is<DeleteNoteOperationRequest>(r => r.NoteId == "note-id"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteNoteAsync_WhenServiceReturnsError_ReturnsError()
    {
        // Arrange
        var note = CreateTestNote("note-id", "Title", "Content");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-id"))
            .ReturnsAsync(note);
        _mockNoteOperationService
            .Setup(s => s.DeleteAsync(It.IsAny<DeleteNoteOperationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<NoteDeleteResult>.Failure(new Error("DeleteFailed", "Database error")));

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
