using FluentAssertions;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Plugins;

/// <summary>
/// Unit tests for NoteSearchPlugin.
/// Tests search operations: SearchNotes, SemanticSearch, SearchByTags, GetNotesByDateRange, FindRelatedNotes.
/// </summary>
public class NoteSearchPluginTests
{
    private readonly Mock<IParallelNoteRepository> _mockNoteRepository;
    private readonly Mock<IRagService> _mockRagService;
    private readonly RagSettings _ragSettings;
    private readonly NoteSearchPlugin _sut;
    private const string TestUserId = "user-123";

    public NoteSearchPluginTests()
    {
        _mockNoteRepository = new Mock<IParallelNoteRepository>();
        _mockRagService = new Mock<IRagService>();
        _ragSettings = new RagSettings { SimilarityThreshold = 0.3f };
        _sut = new NoteSearchPlugin(
            _mockNoteRepository.Object,
            _mockRagService.Object,
            _ragSettings);
        _sut.SetCurrentUserId(TestUserId);
    }

    #region IAgentPlugin Implementation Tests

    [Fact]
    public void CapabilityId_ReturnsNotesSearch()
    {
        _sut.CapabilityId.Should().Be("notes-search");
    }

    [Fact]
    public void DisplayName_ReturnsNotesSearch()
    {
        _sut.DisplayName.Should().Be("Notes Search");
    }

    [Fact]
    public void Description_ContainsSearchTerms()
    {
        _sut.Description.Should().Contain("Search");
        _sut.Description.Should().Contain("notes");
    }

    [Fact]
    public void GetPluginName_ReturnsNotesSearch()
    {
        _sut.GetPluginName().Should().Be("NotesSearch");
    }

    [Fact]
    public void GetSystemPromptAddition_ContainsSearchToolDocumentation()
    {
        var result = _sut.GetSystemPromptAddition();
        result.Should().Contain("SearchNotes");
        result.Should().Contain("SemanticSearch");
        result.Should().Contain("SearchByTags");
        result.Should().Contain("GetNotesByDateRange");
        result.Should().Contain("FindRelatedNotes");
    }

    [Fact]
    public void GetSystemPromptAddition_WhenAgentRagEnabled_ContainsContextInstructions()
    {
        // Arrange
        _sut.SetAgentRagEnabled(true);

        // Act
        var result = _sut.GetSystemPromptAddition();

        // Assert
        result.Should().Contain("RELEVANT NOTES CONTEXT");
        result.Should().Contain("automatically retrieved");
    }

    [Fact]
    public void GetSystemPromptAddition_WhenAgentRagDisabled_ContainsProactiveSearchInstructions()
    {
        // Arrange
        _sut.SetAgentRagEnabled(false);

        // Act
        var result = _sut.GetSystemPromptAddition();

        // Assert
        result.Should().Contain("Proactive Search Strategy");
        result.Should().Contain("Proactively use search tools");
    }

    #endregion

    #region SearchNotesAsync Tests

    [Fact]
    public async Task SearchNotesAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);

        // Act
        var result = await plugin.SearchNotesAsync("test");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task SearchNotesAsync_WhenNoMatches_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note>());

        // Act
        var result = await _sut.SearchNotesAsync("nonexistent");

        // Assert
        result.Should().Contain("No notes found");
        result.Should().Contain("nonexistent");
    }

    [Fact]
    public async Task SearchNotesAsync_WhenMatchInTitle_ReturnsNote()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Shopping List", "Buy milk and eggs")
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("Shopping");

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("Shopping List");
        result.Should().Contain("Found 1 note");
    }

    [Fact]
    public async Task SearchNotesAsync_WhenMatchInContent_ReturnsNote()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Groceries", "Buy milk and eggs")
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("milk");

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("Groceries");
    }

    [Fact]
    public async Task SearchNotesAsync_WhenMatchInTags_ReturnsNote()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "My Note", "Content", tags: new[] { "important", "work" })
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("important");

        // Assert
        result.Should().Contain("note-1");
    }

    [Fact]
    public async Task SearchNotesAsync_ExcludesArchivedNotes()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Active Note", "Content"),
            CreateNote("note-2", "Archived Note", "Content", isArchived: true)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("Note");

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
        result.Should().NotContain("Archived Note");
    }

    [Fact]
    public async Task SearchNotesAsync_RespectsMaxResults()
    {
        // Arrange
        var notes = Enumerable.Range(1, 10)
            .Select(i => CreateNote($"note-{i}", $"Test Note {i}", "Content"))
            .ToList();
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("Test", maxResults: 3);

        // Assert
        result.Should().Contain("Found 3 note");
    }

    [Fact]
    public async Task SearchNotesAsync_IsCaseInsensitive()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Important Meeting", "Content")
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("IMPORTANT");

        // Assert
        result.Should().Contain("note-1");
    }

    #endregion

    #region SemanticSearchAsync Tests

    [Fact]
    public async Task SemanticSearchAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object, _mockRagService.Object);

        // Act
        var result = await plugin.SemanticSearchAsync("test");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task SemanticSearchAsync_WhenRagServiceIsNull_ReturnsNotAvailable()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);
        plugin.SetCurrentUserId(TestUserId);

        // Act
        var result = await plugin.SemanticSearchAsync("test");

        // Assert
        result.Should().Contain("Semantic search is not available");
        result.Should().Contain("SearchNotes");
    }

    [Fact]
    public async Task SemanticSearchAsync_WhenNoResults_ReturnsNotFoundMessage()
    {
        // Arrange
        var emptyContext = new RagContext
        {
            RetrievedNotes = new List<VectorSearchResult>()
        };
        _mockRagService.Setup(r => r.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(emptyContext);

        // Act
        var result = await _sut.SemanticSearchAsync("nonexistent");

        // Assert
        result.Should().Contain("No notes found semantically related");
        result.Should().Contain("SearchNotes");
    }

    [Fact]
    public async Task SemanticSearchAsync_WithResults_ReturnsMatchedNotes()
    {
        // Arrange
        var note = CreateNote("note-1", "Meeting Notes", "Discussion about project");
        var ragContext = new RagContext
        {
            RetrievedNotes = new List<VectorSearchResult>
            {
                new()
                {
                    NoteId = "note-1",
                    Content = "Discussion about project",
                    SimilarityScore = 0.85f,
                    ChunkIndex = 0,
                    Metadata = new Dictionary<string, object>()
                }
            }
        };
        _mockRagService.Setup(r => r.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(ragContext);

        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.SemanticSearchAsync("project discussion");

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("Meeting Notes");
        result.Should().Contain("semantically related");
    }

    [Fact]
    public async Task SemanticSearchAsync_DeduplicatesResultsByNoteId()
    {
        // Arrange
        var note = CreateNote("note-1", "Meeting Notes", "Long content with multiple chunks");
        var ragContext = new RagContext
        {
            RetrievedNotes = new List<VectorSearchResult>
            {
                new() { NoteId = "note-1", Content = "Chunk 1", SimilarityScore = 0.9f, ChunkIndex = 0, Metadata = new Dictionary<string, object>() },
                new() { NoteId = "note-1", Content = "Chunk 2", SimilarityScore = 0.8f, ChunkIndex = 1, Metadata = new Dictionary<string, object>() },
                new() { NoteId = "note-1", Content = "Chunk 3", SimilarityScore = 0.7f, ChunkIndex = 2, Metadata = new Dictionary<string, object>() }
            }
        };
        _mockRagService.Setup(r => r.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(ragContext);

        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.SemanticSearchAsync("meeting");

        // Assert
        result.Should().Contain("Found 1 note");
    }

    #endregion

    #region SearchByTagsAsync Tests

    [Fact]
    public async Task SearchByTagsAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);

        // Act
        var result = await plugin.SearchByTagsAsync("work");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task SearchByTagsAsync_WhenTagsEmpty_ReturnsError()
    {
        // Act
        var result = await _sut.SearchByTagsAsync("");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("specify at least one tag");
    }

    [Fact]
    public async Task SearchByTagsAsync_WhenTagsWhitespace_ReturnsError()
    {
        // Act
        var result = await _sut.SearchByTagsAsync("   ");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("specify at least one tag");
    }

    [Fact]
    public async Task SearchByTagsAsync_WhenNoMatches_ReturnsNotFoundMessage()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Note", "Content", tags: new[] { "personal" })
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchByTagsAsync("work");

        // Assert
        result.Should().Contain("No notes found");
        result.Should().Contain("work");
    }

    [Fact]
    public async Task SearchByTagsAsync_WithMatchingTags_ReturnsNotes()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Work Note", "Content", tags: new[] { "work", "important" }),
            CreateNote("note-2", "Personal Note", "Content", tags: new[] { "personal" })
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchByTagsAsync("work");

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
    }

    [Fact]
    public async Task SearchByTagsAsync_WithRequireAll_RequiresAllTags()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Note 1", "Content", tags: new[] { "work", "important" }),
            CreateNote("note-2", "Note 2", "Content", tags: new[] { "work" })
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchByTagsAsync("work, important", requireAll: true);

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
        result.Should().Contain("all of the tags");
    }

    [Fact]
    public async Task SearchByTagsAsync_WithoutRequireAll_MatchesAnyTag()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Note 1", "Content", tags: new[] { "work" }),
            CreateNote("note-2", "Note 2", "Content", tags: new[] { "important" }),
            CreateNote("note-3", "Note 3", "Content", tags: new[] { "personal" })
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchByTagsAsync("work, important", requireAll: false);

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("note-2");
        result.Should().NotContain("note-3");
        result.Should().Contain("any of the tags");
    }

    [Fact]
    public async Task SearchByTagsAsync_IsCaseInsensitive()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Note", "Content", tags: new[] { "Work", "Important" })
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchByTagsAsync("work, IMPORTANT");

        // Assert
        result.Should().Contain("note-1");
    }

    [Fact]
    public async Task SearchByTagsAsync_ExcludesArchivedNotes()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Active", "Content", tags: new[] { "work" }),
            CreateNote("note-2", "Archived", "Content", tags: new[] { "work" }, isArchived: true)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchByTagsAsync("work");

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
    }

    #endregion

    #region GetNotesByDateRangeAsync Tests

    [Fact]
    public async Task GetNotesByDateRangeAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);

        // Act
        var result = await plugin.GetNotesByDateRangeAsync("2024-01-01");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task GetNotesByDateRangeAsync_WhenNoMatches_ReturnsNotFoundMessage()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Old Note", "Content", createdAt: DateTime.UtcNow.AddYears(-1))
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.GetNotesByDateRangeAsync("2025-01-01", "2025-12-31");

        // Assert
        result.Should().Contain("No notes found");
    }

    [Fact]
    public async Task GetNotesByDateRangeAsync_WithMatchingDates_ReturnsNotes()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var notes = new List<Note>
        {
            CreateNote("note-1", "Recent Note", "Content", createdAt: now.AddDays(-1))
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.GetNotesByDateRangeAsync("last week");

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("Recent Note");
    }

    [Fact]
    public async Task GetNotesByDateRangeAsync_WithRelativeDate_LastWeek()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var notes = new List<Note>
        {
            CreateNote("note-1", "Recent Note", "Content", createdAt: now.AddDays(-3)),
            CreateNote("note-2", "Old Note", "Content", createdAt: now.AddMonths(-1))
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.GetNotesByDateRangeAsync("last week");

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
    }

    [Fact]
    public async Task GetNotesByDateRangeAsync_WithUpdatedDateField_SearchesByUpdatedAt()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var notes = new List<Note>
        {
            CreateNote("note-1", "Note", "Content", createdAt: now.AddMonths(-1), updatedAt: now.AddDays(-1))
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.GetNotesByDateRangeAsync("last week", dateField: "updated");

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("updated");
    }

    [Fact]
    public async Task GetNotesByDateRangeAsync_SwapsStartAndEndIfReversed()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var notes = new List<Note>
        {
            CreateNote("note-1", "Note", "Content", createdAt: now.AddDays(-5))
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.GetNotesByDateRangeAsync("2025-12-31", "2025-01-01");

        // Assert - Should not throw, should handle reversed dates
        result.Should().NotContain("Error");
    }

    [Fact]
    public async Task GetNotesByDateRangeAsync_ExcludesArchivedNotes()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var notes = new List<Note>
        {
            CreateNote("note-1", "Active", "Content", createdAt: now.AddDays(-1)),
            CreateNote("note-2", "Archived", "Content", createdAt: now.AddDays(-1), isArchived: true)
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.GetNotesByDateRangeAsync("last week");

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
    }

    #endregion

    #region FindRelatedNotesAsync Tests

    [Fact]
    public async Task FindRelatedNotesAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object, _mockRagService.Object);

        // Act
        var result = await plugin.FindRelatedNotesAsync("note-1");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task FindRelatedNotesAsync_WhenNoteNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.FindRelatedNotesAsync("note-1");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task FindRelatedNotesAsync_WhenNoteOwnedByDifferentUser_ReturnsPermissionError()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note", "Content", userId: "other-user");
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.FindRelatedNotesAsync("note-1");

        // Assert
        result.Should().Contain("permission");
    }

    [Fact]
    public async Task FindRelatedNotesAsync_WithRagService_FindsSemanticallySimilarNotes()
    {
        // Arrange
        var sourceNote = CreateNote("note-1", "Source Note", "About machine learning");
        var relatedNote = CreateNote("note-2", "Related Note", "Deep learning tutorial");

        var ragContext = new RagContext
        {
            RetrievedNotes = new List<VectorSearchResult>
            {
                new() { NoteId = "note-1", Content = "About machine learning", SimilarityScore = 1.0f, ChunkIndex = 0, Metadata = new Dictionary<string, object>() },
                new() { NoteId = "note-2", Content = "Deep learning tutorial", SimilarityScore = 0.85f, ChunkIndex = 0, Metadata = new Dictionary<string, object>() }
            }
        };

        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(sourceNote);
        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-2"))
            .ReturnsAsync(relatedNote);

        _mockRagService.Setup(r => r.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(ragContext);

        // Act
        var result = await _sut.FindRelatedNotesAsync("note-1");

        // Assert
        result.Should().Contain("note-2");
        result.Should().Contain("Related Note");
        result.Should().Contain("Found 1 note"); // Only 1 note in results (source note excluded)
    }

    [Fact]
    public async Task FindRelatedNotesAsync_WithoutRagService_FallsBackToTagSimilarity()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);
        plugin.SetCurrentUserId(TestUserId);

        var sourceNote = CreateNote("note-1", "Source Note", "Content", tags: new[] { "work", "meeting" });
        var relatedNote = CreateNote("note-2", "Related Note", "Content", tags: new[] { "work", "important" });
        var unrelatedNote = CreateNote("note-3", "Unrelated Note", "Content", tags: new[] { "personal" });

        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(sourceNote);
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note> { sourceNote, relatedNote, unrelatedNote });

        // Act
        var result = await plugin.FindRelatedNotesAsync("note-1");

        // Assert
        result.Should().Contain("note-2");
        result.Should().Contain("similar tags");
        result.Should().NotContain("note-3");
    }

    [Fact]
    public async Task FindRelatedNotesAsync_WhenNoRelatedNotes_ReturnsNotFoundMessage()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);
        plugin.SetCurrentUserId(TestUserId);

        var sourceNote = CreateNote("note-1", "Source Note", "Content", tags: new[] { "unique" });
        var otherNote = CreateNote("note-2", "Other Note", "Content", tags: new[] { "different" });

        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(sourceNote);
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note> { sourceNote, otherNote });

        // Act
        var result = await plugin.FindRelatedNotesAsync("note-1");

        // Assert
        result.Should().Contain("No related notes found");
        result.Should().Contain("Try adding tags");
    }

    [Fact]
    public async Task FindRelatedNotesAsync_ExcludesArchivedNotesFromResults()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);
        plugin.SetCurrentUserId(TestUserId);

        var sourceNote = CreateNote("note-1", "Source Note", "Content", tags: new[] { "work" });
        var archivedNote = CreateNote("note-2", "Archived Note", "Content", tags: new[] { "work" }, isArchived: true);

        _mockNoteRepository.Setup(r => r.GetByIdAsync("note-1"))
            .ReturnsAsync(sourceNote);
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note> { sourceNote, archivedNote });

        // Act
        var result = await plugin.FindRelatedNotesAsync("note-1");

        // Assert
        result.Should().NotContain("note-2");
        result.Should().Contain("No related notes found");
    }

    #endregion

    #region Helper Methods

    private Note CreateNote(
        string id,
        string title,
        string? content = null,
        string? userId = null,
        bool isArchived = false,
        string[]? tags = null,
        DateTime? createdAt = null,
        DateTime? updatedAt = null)
    {
        var now = DateTime.UtcNow;
        return new Note
        {
            Id = id,
            Title = title,
            Content = content ?? "Default content",
            UserId = userId ?? TestUserId,
            IsArchived = isArchived,
            Tags = tags?.ToList() ?? new List<string>(),
            CreatedAt = createdAt ?? now,
            UpdatedAt = updatedAt ?? createdAt ?? now
        };
    }

    #endregion
}
