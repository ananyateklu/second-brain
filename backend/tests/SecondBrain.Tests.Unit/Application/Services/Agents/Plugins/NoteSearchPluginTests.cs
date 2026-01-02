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
/// Tests the unified SearchNotes function with modes: semantic, exact, tags, date, related.
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
    public void GetSystemPromptAddition_ContainsUnifiedSearchToolDocumentation()
    {
        var result = _sut.GetSystemPromptAddition();
        result.Should().Contain("SearchNotes");
        result.Should().Contain("mode");
        result.Should().Contain("semantic");
        result.Should().Contain("exact");
        result.Should().Contain("tags");
        result.Should().Contain("date");
        result.Should().Contain("related");
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
        result.Should().Contain("Proactively use SearchNotes");
    }

    #endregion

    #region SearchNotesAsync - Semantic Mode Tests (Default)

    [Fact]
    public async Task SearchNotesAsync_DefaultsToSemanticMode()
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
        var result = await _sut.SearchNotesAsync("test"); // No mode specified

        // Assert - Should use semantic mode (RAG service is called)
        _mockRagService.Verify(r => r.RetrieveContextAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<int?>(),
            It.IsAny<float?>(),
            It.IsAny<string?>(),
            It.IsAny<string?>(),
            It.IsAny<RagOptions?>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SearchNotesAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object, _mockRagService.Object);

        // Act
        var result = await plugin.SearchNotesAsync("test");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task SearchNotesAsync_SemanticMode_WhenRagServiceIsNull_ReturnsNotAvailable()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);
        plugin.SetCurrentUserId(TestUserId);

        // Act
        var result = await plugin.SearchNotesAsync("test", mode: "semantic");

        // Assert
        result.Should().Contain("Semantic search is not available");
        result.Should().Contain("exact");
    }

    [Fact]
    public async Task SearchNotesAsync_SemanticMode_WhenNoResults_ReturnsNotFoundMessage()
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
        var result = await _sut.SearchNotesAsync("nonexistent", mode: "semantic");

        // Assert
        result.Should().Contain("No notes found semantically related");
        result.Should().Contain("exact");
    }

    [Fact]
    public async Task SearchNotesAsync_SemanticMode_WithResults_ReturnsMatchedNotes()
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

        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.SearchNotesAsync("project discussion", mode: "semantic");

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("Meeting Notes");
        result.Should().Contain("semantically related");
    }

    [Fact]
    public async Task SearchNotesAsync_SemanticMode_DeduplicatesResultsByNoteId()
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

        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(note);

        // Act
        var result = await _sut.SearchNotesAsync("meeting", mode: "semantic");

        // Assert
        result.Should().Contain("Found 1 note");
    }

    #endregion

    #region SearchNotesAsync - Exact Mode Tests

    [Fact]
    public async Task SearchNotesAsync_ExactMode_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);

        // Act
        var result = await plugin.SearchNotesAsync("test", mode: "exact");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task SearchNotesAsync_ExactMode_WhenNoMatches_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note>());

        // Act
        var result = await _sut.SearchNotesAsync("nonexistent", mode: "exact");

        // Assert
        result.Should().Contain("No notes found");
        result.Should().Contain("nonexistent");
    }

    [Fact]
    public async Task SearchNotesAsync_ExactMode_WhenMatchInTitle_ReturnsNote()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Shopping List", "Buy milk and eggs")
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("Shopping", mode: "exact");

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("Shopping List");
        result.Should().Contain("Found 1 note");
    }

    [Fact]
    public async Task SearchNotesAsync_ExactMode_WhenMatchInContent_ReturnsNote()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Groceries", "Buy milk and eggs")
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("milk", mode: "exact");

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("Groceries");
    }

    [Fact]
    public async Task SearchNotesAsync_ExactMode_WhenMatchInTags_ReturnsNote()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "My Note", "Content", tags: new[] { "important", "work" })
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("important", mode: "exact");

        // Assert
        result.Should().Contain("note-1");
    }

    [Fact]
    public async Task SearchNotesAsync_ExactMode_ExcludesArchivedNotes()
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
        var result = await _sut.SearchNotesAsync("Note", mode: "exact");

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
        result.Should().NotContain("Archived Note");
    }

    [Fact]
    public async Task SearchNotesAsync_ExactMode_RespectsMaxResults()
    {
        // Arrange
        var notes = Enumerable.Range(1, 10)
            .Select(i => CreateNote($"note-{i}", $"Test Note {i}", "Content"))
            .ToList();
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("Test", mode: "exact", maxResults: 3);

        // Assert
        result.Should().Contain("Found 3 note");
    }

    [Fact]
    public async Task SearchNotesAsync_ExactMode_IsCaseInsensitive()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Important Meeting", "Content")
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("IMPORTANT", mode: "exact");

        // Assert
        result.Should().Contain("note-1");
    }

    #endregion

    #region SearchNotesAsync - Tags Mode Tests

    [Fact]
    public async Task SearchNotesAsync_TagsMode_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);

        // Act
        var result = await plugin.SearchNotesAsync("work", mode: "tags");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task SearchNotesAsync_TagsMode_WhenTagsEmpty_ReturnsError()
    {
        // Act
        var result = await _sut.SearchNotesAsync("", mode: "tags");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("specify at least one tag");
    }

    [Fact]
    public async Task SearchNotesAsync_TagsMode_WhenTagsWhitespace_ReturnsError()
    {
        // Act
        var result = await _sut.SearchNotesAsync("   ", mode: "tags");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("specify at least one tag");
    }

    [Fact]
    public async Task SearchNotesAsync_TagsMode_WhenNoMatches_ReturnsNotFoundMessage()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Note", "Content", tags: new[] { "personal" })
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("work", mode: "tags");

        // Assert
        result.Should().Contain("No notes found");
        result.Should().Contain("work");
    }

    [Fact]
    public async Task SearchNotesAsync_TagsMode_WithMatchingTags_ReturnsNotes()
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
        var result = await _sut.SearchNotesAsync("work", mode: "tags");

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
    }

    [Fact]
    public async Task SearchNotesAsync_TagsMode_WithRequireAllTags_RequiresAllTags()
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
        var result = await _sut.SearchNotesAsync("work, important", mode: "tags", requireAllTags: true);

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
        result.Should().Contain("all of the tags");
    }

    [Fact]
    public async Task SearchNotesAsync_TagsMode_WithoutRequireAllTags_MatchesAnyTag()
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
        var result = await _sut.SearchNotesAsync("work, important", mode: "tags", requireAllTags: false);

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("note-2");
        result.Should().NotContain("note-3");
        result.Should().Contain("any of the tags");
    }

    [Fact]
    public async Task SearchNotesAsync_TagsMode_IsCaseInsensitive()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateNote("note-1", "Note", "Content", tags: new[] { "Work", "Important" })
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act
        var result = await _sut.SearchNotesAsync("work, IMPORTANT", mode: "tags");

        // Assert
        result.Should().Contain("note-1");
    }

    [Fact]
    public async Task SearchNotesAsync_TagsMode_ExcludesArchivedNotes()
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
        var result = await _sut.SearchNotesAsync("work", mode: "tags");

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
    }

    #endregion

    #region SearchNotesAsync - Date Mode Tests

    [Fact]
    public async Task SearchNotesAsync_DateMode_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);

        // Act
        var result = await plugin.SearchNotesAsync("", mode: "date", startDate: "2024-01-01");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task SearchNotesAsync_DateMode_WhenNoMatches_ReturnsNotFoundMessage()
    {
        // Arrange - Use a fixed date far in the past (2020) that won't overlap with any reasonable query range
        var notes = new List<Note>
        {
            CreateNote("note-1", "Old Note", "Content", createdAt: new DateTime(2020, 6, 15, 12, 0, 0, DateTimeKind.Utc))
        };
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(notes);

        // Act - Query for a range that definitely doesn't include the note (far future)
        var futureYear = DateTime.UtcNow.Year + 10;
        var result = await _sut.SearchNotesAsync("", mode: "date", startDate: $"{futureYear}-01-01", endDate: $"{futureYear}-12-31");

        // Assert
        result.Should().Contain("No notes found");
    }

    [Fact]
    public async Task SearchNotesAsync_DateMode_WithMatchingDates_ReturnsNotes()
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
        var result = await _sut.SearchNotesAsync("", mode: "date", startDate: "last week");

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("Recent Note");
    }

    [Fact]
    public async Task SearchNotesAsync_DateMode_WithRelativeDate_LastWeek()
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
        var result = await _sut.SearchNotesAsync("", mode: "date", startDate: "last week");

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
    }

    [Fact]
    public async Task SearchNotesAsync_DateMode_SwapsStartAndEndIfReversed()
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
        var result = await _sut.SearchNotesAsync("", mode: "date", startDate: "2025-12-31", endDate: "2025-01-01");

        // Assert - Should not throw, should handle reversed dates
        result.Should().NotContain("Error");
    }

    [Fact]
    public async Task SearchNotesAsync_DateMode_ExcludesArchivedNotes()
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
        var result = await _sut.SearchNotesAsync("", mode: "date", startDate: "last week");

        // Assert
        result.Should().Contain("note-1");
        result.Should().NotContain("note-2");
    }

    #endregion

    #region SearchNotesAsync - Related Mode Tests

    [Fact]
    public async Task SearchNotesAsync_RelatedMode_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object, _mockRagService.Object);

        // Act
        var result = await plugin.SearchNotesAsync("", mode: "related", relatedToNoteId: "note-1");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task SearchNotesAsync_RelatedMode_WhenNoteIdNotProvided_ReturnsError()
    {
        // Act
        var result = await _sut.SearchNotesAsync("", mode: "related");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("note ID");
    }

    [Fact]
    public async Task SearchNotesAsync_RelatedMode_WhenNoteNotFound_ReturnsNotFound()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.SearchNotesAsync("", mode: "related", relatedToNoteId: "note-1");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task SearchNotesAsync_RelatedMode_WhenNoteOwnedByDifferentUser_ReturnsNotFound()
    {
        // Arrange
        // GetByIdForUserAsync returns null when note belongs to different user
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.SearchNotesAsync("", mode: "related", relatedToNoteId: "note-1");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task SearchNotesAsync_RelatedMode_WithRagService_FindsSemanticallySimilarNotes()
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

        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-1", It.IsAny<string>()))
            .ReturnsAsync(sourceNote);
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-2", It.IsAny<string>()))
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
        var result = await _sut.SearchNotesAsync("", mode: "related", relatedToNoteId: "note-1");

        // Assert
        result.Should().Contain("note-2");
        result.Should().Contain("Related Note");
        result.Should().Contain("Found 1 note"); // Only 1 note in results (source note excluded)
    }

    [Fact]
    public async Task SearchNotesAsync_RelatedMode_WithoutRagService_FallsBackToTagSimilarity()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);
        plugin.SetCurrentUserId(TestUserId);

        var sourceNote = CreateNote("note-1", "Source Note", "Content", tags: new[] { "work", "meeting" });
        var relatedNote = CreateNote("note-2", "Related Note", "Content", tags: new[] { "work", "important" });
        var unrelatedNote = CreateNote("note-3", "Unrelated Note", "Content", tags: new[] { "personal" });

        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(sourceNote);
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note> { sourceNote, relatedNote, unrelatedNote });

        // Act
        var result = await plugin.SearchNotesAsync("", mode: "related", relatedToNoteId: "note-1");

        // Assert
        result.Should().Contain("note-2");
        result.Should().Contain("similar tags");
        result.Should().NotContain("note-3");
    }

    [Fact]
    public async Task SearchNotesAsync_RelatedMode_WhenNoRelatedNotes_ReturnsNotFoundMessage()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);
        plugin.SetCurrentUserId(TestUserId);

        var sourceNote = CreateNote("note-1", "Source Note", "Content", tags: new[] { "unique" });
        var otherNote = CreateNote("note-2", "Other Note", "Content", tags: new[] { "different" });

        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(sourceNote);
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note> { sourceNote, otherNote });

        // Act
        var result = await plugin.SearchNotesAsync("", mode: "related", relatedToNoteId: "note-1");

        // Assert
        result.Should().Contain("No related notes found");
        result.Should().Contain("Try adding tags");
    }

    [Fact]
    public async Task SearchNotesAsync_RelatedMode_ExcludesArchivedNotesFromResults()
    {
        // Arrange
        var plugin = new NoteSearchPlugin(_mockNoteRepository.Object);
        plugin.SetCurrentUserId(TestUserId);

        var sourceNote = CreateNote("note-1", "Source Note", "Content", tags: new[] { "work" });
        var archivedNote = CreateNote("note-2", "Archived Note", "Content", tags: new[] { "work" }, isArchived: true);

        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(sourceNote);
        _mockNoteRepository.Setup(r => r.GetByUserIdAsync(TestUserId))
            .ReturnsAsync(new List<Note> { sourceNote, archivedNote });

        // Act
        var result = await plugin.SearchNotesAsync("", mode: "related", relatedToNoteId: "note-1");

        // Assert
        result.Should().NotContain("note-2");
        result.Should().Contain("No related notes found");
    }

    #endregion

    #region SearchNotesAsync - Invalid Mode Tests

    [Fact]
    public async Task SearchNotesAsync_WhenInvalidMode_ReturnsError()
    {
        // Act
        var result = await _sut.SearchNotesAsync("test", mode: "invalid");

        // Assert
        result.Should().Contain("Invalid search mode");
        result.Should().Contain("invalid");
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
