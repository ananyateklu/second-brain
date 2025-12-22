using FluentAssertions;
using Moq;
using SecondBrain.Application.Services.Agents.Plugins;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.AI.StructuredOutput.Models;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Plugins;

/// <summary>
/// Unit tests for NoteAnalysisPlugin.
/// Tests AI-powered analysis operations: analyze, suggest tags, summarize, compare.
/// </summary>
public class NoteAnalysisPluginTests
{
    private readonly Mock<IParallelNoteRepository> _mockNoteRepository;
    private readonly Mock<IStructuredOutputService> _mockStructuredOutputService;
    private readonly NoteAnalysisPlugin _sut;
    private readonly NoteAnalysisPlugin _sutWithoutAI;
    private const string TestUserId = "user-123";

    public NoteAnalysisPluginTests()
    {
        _mockNoteRepository = new Mock<IParallelNoteRepository>();
        _mockStructuredOutputService = new Mock<IStructuredOutputService>();

        _sut = new NoteAnalysisPlugin(
            _mockNoteRepository.Object,
            null,
            null,
            _mockStructuredOutputService.Object);
        _sut.SetCurrentUserId(TestUserId);

        _sutWithoutAI = new NoteAnalysisPlugin(
            _mockNoteRepository.Object,
            null,
            null,
            null);
        _sutWithoutAI.SetCurrentUserId(TestUserId);
    }

    #region IAgentPlugin Implementation Tests

    [Fact]
    public void CapabilityId_ReturnsNotesAnalysis()
    {
        _sut.CapabilityId.Should().Be("notes-analysis");
    }

    [Fact]
    public void DisplayName_ReturnsNotesAnalysis()
    {
        _sut.DisplayName.Should().Be("Notes Analysis");
    }

    [Fact]
    public void Description_ContainsAnalysis()
    {
        _sut.Description.Should().Contain("analysis");
    }

    [Fact]
    public void GetPluginName_ReturnsNotesAnalysis()
    {
        _sut.GetPluginName().Should().Be("NotesAnalysis");
    }

    [Fact]
    public void GetSystemPromptAddition_ContainsToolDocumentation()
    {
        var result = _sut.GetSystemPromptAddition();
        result.Should().Contain("AnalyzeNote");
        result.Should().Contain("SuggestTags");
        result.Should().Contain("SummarizeNote");
        result.Should().Contain("CompareNotes");
    }

    #endregion

    #region AnalyzeNoteAsync Tests

    [Fact]
    public async Task AnalyzeNoteAsync_WhenUserIdNotSet_ReturnsError()
    {
        // Arrange
        var plugin = new NoteAnalysisPlugin(_mockNoteRepository.Object, null, null, _mockStructuredOutputService.Object);

        // Act
        var result = await plugin.AnalyzeNoteAsync("note-1");

        // Assert
        result.Should().Contain("Error");
    }

    [Fact]
    public async Task AnalyzeNoteAsync_WhenNoAIService_ReturnsServiceNotAvailableError()
    {
        // Act
        var result = await _sutWithoutAI.AnalyzeNoteAsync("note-1");

        // Assert
        result.Should().Contain("AI structured output service");
        result.Should().Contain("not available");
    }

    [Fact]
    public async Task AnalyzeNoteAsync_WhenNoteNotFound_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.AnalyzeNoteAsync("note-1");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task AnalyzeNoteAsync_WhenNoteNotOwnedByUser_ReturnsNotFound()
    {
        // Arrange
        // GetByIdForUserAsync returns null when note belongs to different user
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.AnalyzeNoteAsync("note-1");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task AnalyzeNoteAsync_WhenAIReturnsNull_ReturnsError()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note");
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(note);
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<NoteAnalysis>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((NoteAnalysis?)null);

        // Act
        var result = await _sut.AnalyzeNoteAsync("note-1");

        // Assert
        result.Should().Contain("Failed to analyze");
    }

    [Fact]
    public async Task AnalyzeNoteAsync_WhenValid_ReturnsAnalysis()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note", tags: new List<string> { "existing-tag" });
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(note);

        var analysis = new NoteAnalysis
        {
            Title = "Test Note",
            Summary = "A test summary",
            Tags = new List<string> { "tag1", "tag2" },
            KeyPoints = new List<string> { "Point 1", "Point 2" },
            Sentiment = "Neutral",
            SuggestedFolder = "Work"
        };
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<NoteAnalysis>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(analysis);

        // Act
        var result = await _sut.AnalyzeNoteAsync("note-1");

        // Assert
        result.Should().Contain("analysis");
        result.Should().Contain("Test Note");
        result.Should().Contain("summary");
    }

    [Fact]
    public async Task AnalyzeNoteAsync_WhenExceptionThrown_ReturnsError()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note");
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(note);
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<NoteAnalysis>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("AI service error"));

        // Act
        var result = await _sut.AnalyzeNoteAsync("note-1");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("AI service error");
    }

    #endregion

    #region SuggestTagsAsync Tests

    [Fact]
    public async Task SuggestTagsAsync_WhenNoAIService_ReturnsServiceNotAvailableError()
    {
        // Act
        var result = await _sutWithoutAI.SuggestTagsAsync("note-1");

        // Assert
        result.Should().Contain("AI structured output service");
    }

    [Fact]
    public async Task SuggestTagsAsync_WhenNoteNotFound_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.SuggestTagsAsync("note-1");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task SuggestTagsAsync_WhenAIReturnsNoTags_ReturnsError()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note");
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(note);

        var analysis = new NoteAnalysis { Tags = new List<string>() };
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<NoteAnalysis>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(analysis);

        // Act
        var result = await _sut.SuggestTagsAsync("note-1");

        // Assert
        result.Should().Contain("Failed to generate tag suggestions");
    }

    [Fact]
    public async Task SuggestTagsAsync_WhenValid_ReturnsSuggestedTags()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note", tags: new List<string> { "existing" });
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(note);

        var analysis = new NoteAnalysis
        {
            Tags = new List<string> { "existing", "new-tag-1", "new-tag-2" }
        };
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<NoteAnalysis>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(analysis);

        // Act
        var result = await _sut.SuggestTagsAsync("note-1", maxTags: 5);

        // Assert
        result.Should().Contain("suggestedTags");
        result.Should().Contain("newTags");
        result.Should().Contain("new-tag-1");
    }

    [Fact]
    public async Task SuggestTagsAsync_RespectsMaxTagsParameter()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note");
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(note);

        var analysis = new NoteAnalysis
        {
            Tags = new List<string> { "tag1", "tag2", "tag3", "tag4", "tag5", "tag6" }
        };
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<NoteAnalysis>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(analysis);

        // Act
        var result = await _sut.SuggestTagsAsync("note-1", maxTags: 3);

        // Assert
        result.Should().Contain("tag1");
        result.Should().Contain("tag2");
        result.Should().Contain("tag3");
    }

    #endregion

    #region SummarizeNoteAsync Tests

    [Fact]
    public async Task SummarizeNoteAsync_WhenNoAIService_ReturnsServiceNotAvailableError()
    {
        // Act
        var result = await _sutWithoutAI.SummarizeNoteAsync("note-1");

        // Assert
        result.Should().Contain("AI structured output service");
    }

    [Fact]
    public async Task SummarizeNoteAsync_WhenNoteNotFound_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.SummarizeNoteAsync("note-1");

        // Assert
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task SummarizeNoteAsync_WhenAIReturnsNull_ReturnsError()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note");
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(note);
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<ContentSummary>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ContentSummary?)null);

        // Act
        var result = await _sut.SummarizeNoteAsync("note-1");

        // Assert
        result.Should().Contain("Failed to generate summary");
    }

    [Fact]
    public async Task SummarizeNoteAsync_WhenValid_ReturnsSummary()
    {
        // Arrange
        var note = CreateNote("note-1", "Test Note");
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(note);

        var summary = new ContentSummary
        {
            OneLiner = "A brief summary",
            ShortSummary = "A short summary with more details",
            DetailedSummary = "A detailed summary with comprehensive information",
            Topics = new List<string> { "Topic 1", "Topic 2" },
            KeyTakeaways = new List<string> { "Takeaway 1", "Takeaway 2" }
        };
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<ContentSummary>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(summary);

        // Act
        var result = await _sut.SummarizeNoteAsync("note-1");

        // Assert
        result.Should().Contain("summary");
        result.Should().Contain("oneLiner");
        result.Should().Contain("keyTakeaways");
    }

    #endregion

    #region CompareNotesAsync Tests

    [Fact]
    public async Task CompareNotesAsync_WhenNoAIService_ReturnsServiceNotAvailableError()
    {
        // Act
        var result = await _sutWithoutAI.CompareNotesAsync("note-1", "note-2");

        // Assert
        result.Should().Contain("AI structured output service");
    }

    [Fact]
    public async Task CompareNotesAsync_WhenFirstNoteNotFound_ReturnsNotFoundMessage()
    {
        // Arrange
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.CompareNotesAsync("note-1", "note-2");

        // Assert
        result.Should().Contain("note-1");
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task CompareNotesAsync_WhenSecondNoteNotFound_ReturnsNotFoundMessage()
    {
        // Arrange
        var note1 = CreateNote("note-1", "First Note");
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-1", It.IsAny<string>()))
            .ReturnsAsync(note1);
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-2", It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.CompareNotesAsync("note-1", "note-2");

        // Assert
        result.Should().Contain("note-2");
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task CompareNotesAsync_WhenNoteNotOwnedByUser_ReturnsNotFound()
    {
        // Arrange
        var note1 = CreateNote("note-1", "First Note");
        // GetByIdForUserAsync returns null when note belongs to different user
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-1", It.IsAny<string>()))
            .ReturnsAsync(note1);
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-2", It.IsAny<string>()))
            .ReturnsAsync((Note?)null);

        // Act
        var result = await _sut.CompareNotesAsync("note-1", "note-2");

        // Assert
        result.Should().Contain("note-2");
        result.Should().Contain("not found");
    }

    [Fact]
    public async Task CompareNotesAsync_WhenAIReturnsNull_ReturnsError()
    {
        // Arrange
        var note1 = CreateNote("note-1", "First Note");
        var note2 = CreateNote("note-2", "Second Note");
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-1", It.IsAny<string>()))
            .ReturnsAsync(note1);
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-2", It.IsAny<string>()))
            .ReturnsAsync(note2);
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<ComparisonResult>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ComparisonResult?)null);

        // Act
        var result = await _sut.CompareNotesAsync("note-1", "note-2");

        // Assert
        result.Should().Contain("Failed to generate comparison");
    }

    [Fact]
    public async Task CompareNotesAsync_WhenValid_ReturnsComparison()
    {
        // Arrange
        var note1 = CreateNote("note-1", "First Note");
        var note2 = CreateNote("note-2", "Second Note");
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-1", It.IsAny<string>()))
            .ReturnsAsync(note1);
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-2", It.IsAny<string>()))
            .ReturnsAsync(note2);

        var comparison = new ComparisonResult
        {
            Similarities = new List<string> { "Similar topic", "Same style" },
            Differences = new List<string> { "Different focus", "Different length" },
            SimilarityScore = 0.75f,
            Recommendation = "Consider merging these notes"
        };
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<ComparisonResult>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(comparison);

        // Act
        var result = await _sut.CompareNotesAsync("note-1", "note-2");

        // Assert
        result.Should().Contain("comparison");
        result.Should().Contain("similarities");
        result.Should().Contain("differences");
        result.Should().Contain("similarityScore");
    }

    [Fact]
    public async Task CompareNotesAsync_TruncatesLongContent()
    {
        // Arrange
        var longContent = new string('x', 3000);
        var note1 = CreateNote("note-1", "First Note", content: longContent);
        var note2 = CreateNote("note-2", "Second Note", content: longContent);
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-1", It.IsAny<string>()))
            .ReturnsAsync(note1);
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-2", It.IsAny<string>()))
            .ReturnsAsync(note2);

        var comparison = new ComparisonResult
        {
            Similarities = new List<string> { "Similar" },
            Differences = new List<string> { "Different" },
            SimilarityScore = 0.5f,
            Recommendation = "Review both"
        };
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<ComparisonResult>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(comparison);

        // Act
        var result = await _sut.CompareNotesAsync("note-1", "note-2");

        // Assert
        result.Should().Contain("comparison");
        // The prompt should truncate content at 2000 chars + "..."
        _mockStructuredOutputService.Verify(s => s.GenerateAsync<ComparisonResult>(
            It.Is<string>(p => p.Contains("...")),
            It.IsAny<StructuredOutputOptions>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CompareNotesAsync_WhenExceptionThrown_ReturnsError()
    {
        // Arrange
        var note1 = CreateNote("note-1", "First Note");
        var note2 = CreateNote("note-2", "Second Note");
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-1", It.IsAny<string>()))
            .ReturnsAsync(note1);
        _mockNoteRepository.Setup(r => r.GetByIdForUserAsync("note-2", It.IsAny<string>()))
            .ReturnsAsync(note2);
        _mockStructuredOutputService.Setup(s => s.GenerateAsync<ComparisonResult>(
                It.IsAny<string>(), It.IsAny<StructuredOutputOptions>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Comparison error"));

        // Act
        var result = await _sut.CompareNotesAsync("note-1", "note-2");

        // Assert
        result.Should().Contain("Error");
        result.Should().Contain("Comparison error");
    }

    #endregion

    #region Helper Methods

    private Note CreateNote(
        string id,
        string title,
        string? userId = null,
        string? content = null,
        List<string>? tags = null)
    {
        return new Note
        {
            Id = id,
            Title = title,
            Content = content ?? $"Content for {title}",
            UserId = userId ?? TestUserId,
            Tags = tags ?? new List<string>(),
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
