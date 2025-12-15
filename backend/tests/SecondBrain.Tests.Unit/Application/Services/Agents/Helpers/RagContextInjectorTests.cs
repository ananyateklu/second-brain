using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Services.Agents.Helpers;

/// <summary>
/// Unit tests for RagContextInjector.
/// Tests context retrieval, formatting, and intent detection.
/// </summary>
public class RagContextInjectorTests
{
    private readonly Mock<ILogger<RagContextInjector>> _mockLogger;
    private readonly RagContextInjector _sut;

    public RagContextInjectorTests()
    {
        _mockLogger = new Mock<ILogger<RagContextInjector>>();
        _sut = new RagContextInjector(_mockLogger.Object);
    }

    #region ShouldRetrieveContext Tests

    [Theory]
    [InlineData("What is in my notes about AI?", true)]
    [InlineData("Where did I write about machine learning?", true)]
    [InlineData("How do I implement a binary tree?", true)]
    [InlineData("Why did I save that information?", true)]
    [InlineData("Show me my notes on TypeScript", true)]
    [InlineData("Tell me about my meetings", true)]
    [InlineData("What have I documented about React?", true)]
    public void ShouldRetrieveContext_WithQuestionOrRecallQuery_ReturnsTrue(string query, bool expected)
    {
        // Act
        var result = _sut.ShouldRetrieveContext(query);

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("Create a new note about AI", false)]
    [InlineData("Delete the note titled Test", false)]
    [InlineData("Update my shopping list", false)]
    [InlineData("Add a tag to my notes", false)]
    [InlineData("Make a note about the meeting", false)]
    [InlineData("Archive the old notes", false)]
    public void ShouldRetrieveContext_WithActionCommand_ReturnsFalse(string query, bool expected)
    {
        // Act
        var result = _sut.ShouldRetrieveContext(query);

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("", false)]
    [InlineData("   ", false)]
    [InlineData(null, false)]
    public void ShouldRetrieveContext_WithEmptyOrNullQuery_ReturnsFalse(string? query, bool expected)
    {
        // Act
        var result = _sut.ShouldRetrieveContext(query!);

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("Find my notes about project management")]
    [InlineData("Search for information on databases")]
    [InlineData("Recall what I wrote about testing")]
    [InlineData("Remember the details about deployment")]
    public void ShouldRetrieveContext_WithRecallPhrases_ReturnsTrue(string query)
    {
        // Act
        var result = _sut.ShouldRetrieveContext(query);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region TryRetrieveContextAsync Tests

    [Fact]
    public async Task TryRetrieveContextAsync_WhenQueryDoesNotRequireContext_ReturnsEmptyResult()
    {
        // Arrange
        var query = "Create a new note";
        var ragSettings = CreateRagSettings();
        var mockUserPrefs = new Mock<IUserPreferencesService>();
        var mockRagService = new Mock<IRagService>();

        // Act
        var result = await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object);

        // Assert
        result.ContextMessage.Should().BeNull();
        result.RetrievedNotes.Should().BeNull();
        result.RagLogId.Should().BeNull();
    }

    [Fact]
    public async Task TryRetrieveContextAsync_WhenNoNotesFound_ReturnsEmptyResult()
    {
        // Arrange
        var query = "What do I know about quantum computing?";
        var ragSettings = CreateRagSettings();
        var mockUserPrefs = new Mock<IUserPreferencesService>();
        mockUserPrefs.Setup(x => x.GetPreferencesAsync(It.IsAny<string>()))
            .ReturnsAsync(CreateUserPreferences());

        var mockRagService = new Mock<IRagService>();
        mockRagService.Setup(x => x.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RagContext
            {
                RetrievedNotes = new List<VectorSearchResult>(),
                RagLogId = null
            });

        // Act
        var result = await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object);

        // Assert
        result.ContextMessage.Should().BeNull();
        result.RetrievedNotes.Should().BeNull();
    }

    [Fact]
    public async Task TryRetrieveContextAsync_WithRetrievedNotes_ReturnsFormattedContext()
    {
        // Arrange
        var query = "What do I know about TypeScript?";
        var ragSettings = CreateRagSettings();
        var ragLogId = Guid.NewGuid();
        var mockUserPrefs = new Mock<IUserPreferencesService>();
        mockUserPrefs.Setup(x => x.GetPreferencesAsync(It.IsAny<string>()))
            .ReturnsAsync(CreateUserPreferences());

        var mockRagService = new Mock<IRagService>();
        mockRagService.Setup(x => x.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RagContext
            {
                RetrievedNotes = new List<VectorSearchResult>
                {
                    CreateVectorSearchResult("note1", "TypeScript Basics", "TypeScript is a typed superset of JavaScript", 0.85f),
                    CreateVectorSearchResult("note2", "Advanced TypeScript", "Generics and type guards in TypeScript", 0.78f)
                },
                RagLogId = ragLogId
            });

        // Act
        var result = await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object);

        // Assert
        result.ContextMessage.Should().NotBeNullOrEmpty();
        result.ContextMessage.Should().Contain("RELEVANT NOTES CONTEXT");
        result.ContextMessage.Should().Contain("TypeScript Basics");
        result.ContextMessage.Should().Contain("Advanced TypeScript");
        result.RetrievedNotes.Should().HaveCount(2);
        result.RagLogId.Should().Be(ragLogId);
    }

    [Fact]
    public async Task TryRetrieveContextAsync_DeduplicatesNotesByNoteId()
    {
        // Arrange
        var query = "Tell me about React";
        var ragSettings = CreateRagSettings();
        var mockUserPrefs = new Mock<IUserPreferencesService>();
        mockUserPrefs.Setup(x => x.GetPreferencesAsync(It.IsAny<string>()))
            .ReturnsAsync(CreateUserPreferences());

        var mockRagService = new Mock<IRagService>();
        mockRagService.Setup(x => x.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RagContext
            {
                RetrievedNotes = new List<VectorSearchResult>
                {
                    CreateVectorSearchResult("note1", "React Basics", "Content chunk 1", 0.85f),
                    CreateVectorSearchResult("note1", "React Basics", "Content chunk 2", 0.75f), // Same note, lower score
                    CreateVectorSearchResult("note2", "React Hooks", "Hooks content", 0.80f)
                },
                RagLogId = Guid.NewGuid()
            });

        // Act
        var result = await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object);

        // Assert
        result.RetrievedNotes.Should().HaveCount(2); // Deduplicated
        result.RetrievedNotes!.First(n => n.NoteId == "note1").SimilarityScore.Should().Be(0.85f); // Highest score kept
    }

    [Fact]
    public async Task TryRetrieveContextAsync_WhenUserPreferencesFails_UsesDefaults()
    {
        // Arrange
        var query = "What do I know about testing?";
        var ragSettings = CreateRagSettings();
        var mockUserPrefs = new Mock<IUserPreferencesService>();
        mockUserPrefs.Setup(x => x.GetPreferencesAsync(It.IsAny<string>()))
            .ThrowsAsync(new Exception("Database error"));

        var mockRagService = new Mock<IRagService>();
        mockRagService.Setup(x => x.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RagContext
            {
                RetrievedNotes = new List<VectorSearchResult>
                {
                    CreateVectorSearchResult("note1", "Testing Guide", "Unit testing content", 0.90f)
                },
                RagLogId = Guid.NewGuid()
            });

        // Act
        var result = await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object);

        // Assert - Should still return results despite preferences failure
        result.ContextMessage.Should().NotBeNull();
        result.RetrievedNotes.Should().NotBeNull();
    }

    [Fact]
    public async Task TryRetrieveContextAsync_WhenRagServiceFails_ReturnsEmptyResult()
    {
        // Arrange
        var query = "What is in my notes?";
        var ragSettings = CreateRagSettings();
        var mockUserPrefs = new Mock<IUserPreferencesService>();
        mockUserPrefs.Setup(x => x.GetPreferencesAsync(It.IsAny<string>()))
            .ReturnsAsync(CreateUserPreferences());

        var mockRagService = new Mock<IRagService>();
        mockRagService.Setup(x => x.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("RAG service unavailable"));

        // Act
        var result = await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object);

        // Assert
        result.ContextMessage.Should().BeNull();
        result.RetrievedNotes.Should().BeNull();
        result.RagLogId.Should().BeNull();
    }

    [Fact]
    public async Task TryRetrieveContextAsync_UsesConfiguredTopKAndThreshold()
    {
        // Arrange
        var query = "Tell me about my notes";
        var ragSettings = new RagSettings
        {
            TopK = 10,
            SimilarityThreshold = 0.5f
        };
        var mockUserPrefs = new Mock<IUserPreferencesService>();
        mockUserPrefs.Setup(x => x.GetPreferencesAsync(It.IsAny<string>()))
            .ReturnsAsync(CreateUserPreferences());

        int? capturedTopK = null;
        float? capturedThreshold = null;

        var mockRagService = new Mock<IRagService>();
        mockRagService.Setup(x => x.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, string, int?, float?, string?, string?, RagOptions?, CancellationToken>((q, u, topK, threshold, vs, conv, o, c) =>
            {
                capturedTopK = topK;
                capturedThreshold = threshold;
            })
            .ReturnsAsync(new RagContext
            {
                RetrievedNotes = new List<VectorSearchResult>(),
                RagLogId = null
            });

        // Act
        await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object);

        // Assert
        capturedTopK.Should().Be(10);
        capturedThreshold.Should().Be(0.5f);
    }

    [Fact]
    public async Task TryRetrieveContextAsync_FormatsContextMessageCorrectly()
    {
        // Arrange
        var query = "What did I write about databases?";
        var ragSettings = CreateRagSettings();
        var mockUserPrefs = new Mock<IUserPreferencesService>();
        mockUserPrefs.Setup(x => x.GetPreferencesAsync(It.IsAny<string>()))
            .ReturnsAsync(CreateUserPreferences());

        var mockRagService = new Mock<IRagService>();
        mockRagService.Setup(x => x.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RagContext
            {
                RetrievedNotes = new List<VectorSearchResult>
                {
                    CreateVectorSearchResult("note1", "SQL Guide", "SQL basics and queries", 0.92f)
                },
                RagLogId = Guid.NewGuid()
            });

        // Act
        var result = await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object);

        // Assert
        result.ContextMessage.Should().Contain("---RELEVANT NOTES CONTEXT");
        result.ContextMessage.Should().Contain("---END CONTEXT---");
        result.ContextMessage.Should().Contain("INSTRUCTIONS:");
        result.ContextMessage.Should().Contain("NOTE 1");
        result.ContextMessage.Should().Contain("Title: SQL Guide");
        result.ContextMessage.Should().Contain("Note ID: note1");
        result.ContextMessage.Should().Contain("Relevance:");
    }

    [Fact]
    public async Task TryRetrieveContextAsync_TruncatesPreviewForLongContent()
    {
        // Arrange
        var query = "What is my documentation?";
        var ragSettings = CreateRagSettings();
        var mockUserPrefs = new Mock<IUserPreferencesService>();
        mockUserPrefs.Setup(x => x.GetPreferencesAsync(It.IsAny<string>()))
            .ReturnsAsync(CreateUserPreferences());

        var longContent = new string('A', 500); // 500 character content

        var mockRagService = new Mock<IRagService>();
        mockRagService.Setup(x => x.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RagContext
            {
                RetrievedNotes = new List<VectorSearchResult>
                {
                    CreateVectorSearchResult("note1", "Long Note", longContent, 0.85f)
                },
                RagLogId = Guid.NewGuid()
            });

        // Act
        var result = await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object);

        // Assert
        var retrievedNote = result.RetrievedNotes!.First();
        retrievedNote.Preview.Length.Should().BeLessThanOrEqualTo(303); // 300 + "..."
        retrievedNote.Preview.Should().EndWith("...");
    }

    [Fact]
    public async Task TryRetrieveContextAsync_SupportsCancellation()
    {
        // Arrange
        var query = "Tell me about my project";
        var ragSettings = CreateRagSettings();
        var cts = new CancellationTokenSource();
        cts.Cancel();

        var mockUserPrefs = new Mock<IUserPreferencesService>();
        var mockRagService = new Mock<IRagService>();
        mockRagService.Setup(x => x.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.Is<CancellationToken>(t => t.IsCancellationRequested)))
            .ThrowsAsync(new OperationCanceledException());

        // Act
        var result = await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object,
            cts.Token);

        // Assert - Exception caught, returns empty result
        result.ContextMessage.Should().BeNull();
    }

    #endregion

    #region RetrievedNotes Formatting Tests

    [Fact]
    public async Task TryRetrieveContextAsync_IncludesTagsInContext()
    {
        // Arrange
        var query = "What are my tagged notes?";
        var ragSettings = CreateRagSettings();
        var mockUserPrefs = new Mock<IUserPreferencesService>();
        mockUserPrefs.Setup(x => x.GetPreferencesAsync(It.IsAny<string>()))
            .ReturnsAsync(CreateUserPreferences());

        var mockRagService = new Mock<IRagService>();
        mockRagService.Setup(x => x.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RagContext
            {
                RetrievedNotes = new List<VectorSearchResult>
                {
                    new()
                    {
                        NoteId = "note1",
                        NoteTitle = "Tagged Note",
                        NoteTags = new List<string> { "important", "work" },
                        Content = "Content with tags",
                        SimilarityScore = 0.9f
                    }
                },
                RagLogId = Guid.NewGuid()
            });

        // Act
        var result = await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object);

        // Assert
        result.ContextMessage.Should().Contain("Tags:");
        result.RetrievedNotes!.First().Tags.Should().Contain("important");
        result.RetrievedNotes!.First().Tags.Should().Contain("work");
    }

    [Fact]
    public async Task TryRetrieveContextAsync_HandlesNotesWithMetadata()
    {
        // Arrange
        var query = "Show me my notes";
        var ragSettings = CreateRagSettings();
        var mockUserPrefs = new Mock<IUserPreferencesService>();
        mockUserPrefs.Setup(x => x.GetPreferencesAsync(It.IsAny<string>()))
            .ReturnsAsync(CreateUserPreferences());

        var mockRagService = new Mock<IRagService>();
        mockRagService.Setup(x => x.RetrieveContextAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<float?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<RagOptions?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RagContext
            {
                RetrievedNotes = new List<VectorSearchResult>
                {
                    new()
                    {
                        NoteId = "note1",
                        NoteTitle = "Note with Metadata",
                        Content = "Some content",
                        SimilarityScore = 0.85f,
                        Metadata = new Dictionary<string, object>
                        {
                            { "rerankScore", 8.5f }
                        }
                    }
                },
                RagLogId = Guid.NewGuid()
            });

        // Act
        var result = await _sut.TryRetrieveContextAsync(
            query,
            "user1",
            ragSettings,
            mockUserPrefs.Object,
            mockRagService.Object);

        // Assert
        result.ContextMessage.Should().Contain("Relevance:");
    }

    #endregion

    #region Helper Methods

    private static RagSettings CreateRagSettings()
    {
        return new RagSettings
        {
            TopK = 5,
            SimilarityThreshold = 0.3f
        };
    }

    private static UserPreferencesResponse CreateUserPreferences()
    {
        return new UserPreferencesResponse
        {
            RagEnableHyde = true,
            RagEnableQueryExpansion = true,
            RagEnableHybridSearch = true,
            RagEnableReranking = true,
            RagEnableAnalytics = true,
            RerankingProvider = "llm"
        };
    }

    private static VectorSearchResult CreateVectorSearchResult(string noteId, string title, string content, float score)
    {
        return new VectorSearchResult
        {
            NoteId = noteId,
            NoteTitle = title,
            Content = content,
            SimilarityScore = score,
            NoteTags = new List<string>()
        };
    }

    #endregion
}
