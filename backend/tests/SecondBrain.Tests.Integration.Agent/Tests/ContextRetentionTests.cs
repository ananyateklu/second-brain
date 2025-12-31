using FluentAssertions;
using SecondBrain.Tests.Integration.Agent.Framework;
using SecondBrain.Tests.Integration.Agent.TestCases;
using Xunit;

namespace SecondBrain.Tests.Integration.Agent.Tests;

/// <summary>
/// Tests for maintaining context across conversation turns.
/// Validates that the agent correctly resolves references to previous
/// operations and maintains state throughout a conversation.
/// </summary>
public class ContextRetentionTests
{
    private readonly AgentEvaluationRunner _runner;
    private readonly IToolSelectionValidator _validator;

    public ContextRetentionTests()
    {
        _validator = new MockToolSelectionValidator();
        _runner = new AgentEvaluationRunner(_validator);
    }

    [Fact]
    public async Task AllContextRetentionCases_ShouldHaveHighPassRate()
    {
        // Arrange
        var cases = EvaluationTestCases.GetContextRetentionCases();

        // Act
        var report = await _runner.RunCategoryAsync(cases, EvaluationCategory.ContextRetention);

        // Assert
        report.PassRate.Should().BeGreaterThanOrEqualTo(0.7,
            because: $"at least 70% of context retention cases should pass. Failures: {string.Join(", ", report.Failures.Select(f => $"{f.Case.Id}: {f.ErrorMessage}"))}");
    }

    [Fact]
    public async Task ThatNote_ShouldResolve_FromPreviousSearch()
    {
        // Arrange
        var history = new List<ConversationTurn>
        {
            new() { Role = "user", Content = "Find my grocery list" },
            new()
            {
                Role = "assistant",
                Content = "Found: Grocery List",
                ToolName = "SemanticSearch",
                ToolResult = "{\"id\": \"note-456\", \"title\": \"Grocery List\"}"
            }
        };

        // Act
        var result = await _validator.ValidateToolSelectionAsync("Edit that note", history);

        // Assert
        result.SelectedTool.Should().BeOneOf(new[] { "GetNote", "UpdateNote" },
            "'that note' should resolve to editing the found note");
    }

    [Fact]
    public async Task It_ShouldResolve_FromCreateOperation()
    {
        // Arrange
        var history = new List<ConversationTurn>
        {
            new() { Role = "user", Content = "Create a note called Test" },
            new()
            {
                Role = "assistant",
                Content = "Created note",
                ToolName = "CreateNote",
                ToolResult = "{\"id\": \"note-789\", \"title\": \"Test\"}"
            }
        };

        // Act
        var result = await _validator.ValidateToolSelectionAsync("Now add some more content to it", history);

        // Assert
        result.SelectedTool.Should().Be("AppendToNote",
            because: "'it' should resolve to the created note");
    }

    [Fact]
    public async Task TopicContext_ShouldPersist_AcrossTurns()
    {
        // Arrange
        var history = new List<ConversationTurn>
        {
            new() { Role = "user", Content = "Find notes about machine learning" },
            new()
            {
                Role = "assistant",
                Content = "Found 3 notes about ML",
                ToolName = "SemanticSearch",
                ToolResult = "[{\"title\": \"ML Basics\"}]"
            }
        };

        // Act
        var result = await _validator.ValidateToolSelectionAsync("What else do I have on this topic?", history);

        // Assert
        result.SelectedTool.Should().Be("SemanticSearch",
            because: "topic-related follow-up should continue searching");
    }

    [Fact]
    public async Task FolderContext_ShouldBeRemembered()
    {
        // Arrange
        var history = new List<ConversationTurn>
        {
            new() { Role = "user", Content = "Move my recipe to Cooking folder" },
            new()
            {
                Role = "assistant",
                Content = "Moved to Cooking",
                ToolName = "MoveToFolder",
                ToolResult = "{\"folder\": \"Cooking\"}"
            }
        };

        // Act
        var result = await _validator.ValidateToolSelectionAsync("Move another note there", history);

        // Assert
        result.SelectedTool.Should().Be("MoveToFolder",
            because: "'there' should resolve to the same folder from context");
    }

    [Fact]
    public async Task ChainOfModifications_ShouldMaintainNoteReference()
    {
        // Arrange
        var history = new List<ConversationTurn>
        {
            new() { Role = "user", Content = "Find my todo list" },
            new()
            {
                Role = "assistant",
                Content = "Found",
                ToolName = "SemanticSearch",
                ToolResult = "{\"id\": \"note-todo\"}"
            },
            new() { Role = "user", Content = "Add 'buy groceries' to it" },
            new()
            {
                Role = "assistant",
                Content = "Added",
                ToolName = "AppendToNote",
                ToolResult = "{\"success\": true}"
            }
        };

        // Act
        var result = await _validator.ValidateToolSelectionAsync("Also add a bullet point at the start", history);

        // Assert
        result.SelectedTool.Should().Be("PrependToNote",
            because: "chain of operations should maintain note reference");
    }

    [Fact]
    public async Task MultipleNotesInContext_ShouldHandleCorrectly()
    {
        // Arrange - Multiple notes mentioned in history
        var history = new List<ConversationTurn>
        {
            new() { Role = "user", Content = "Find my project notes" },
            new()
            {
                Role = "assistant",
                Content = "Found 3 notes",
                ToolName = "SemanticSearch",
                ToolResult = "[{\"id\": \"n1\", \"title\": \"Project A\"}, {\"id\": \"n2\", \"title\": \"Project B\"}, {\"id\": \"n3\", \"title\": \"Project C\"}]"
            }
        };

        // Act
        var result = await _validator.ValidateToolSelectionAsync("Archive the first one", history);

        // Assert
        result.SelectedTool.Should().Be("SetNoteArchived",
            because: "should be able to reference notes from list by position");
    }

    [Fact]
    public async Task ContextRetentionRate_ShouldMeetTarget()
    {
        // Arrange
        var cases = EvaluationTestCases.GetContextRetentionCases();

        // Act
        var report = await _runner.RunAsync(cases);

        // Assert
        report.ContextRetentionRate.Should().BeGreaterThanOrEqualTo(0.7,
            because: "context retention is critical for conversational agents");
    }

    [Theory]
    [InlineData("the same note", "AppendToNote")]
    [InlineData("that one", "AppendToNote")]
    [InlineData("it", "AppendToNote")]
    public async Task DifferentPronouns_ShouldResolveToContextNote(string pronoun, string expectedTool)
    {
        // Arrange
        var history = new List<ConversationTurn>
        {
            new() { Role = "user", Content = "Find my shopping list" },
            new()
            {
                Role = "assistant",
                Content = "Found",
                ToolName = "SemanticSearch",
                ToolResult = "{\"id\": \"note-shop\", \"title\": \"Shopping\"}"
            }
        };

        // Act
        var result = await _validator.ValidateToolSelectionAsync($"Add 'bread' to {pronoun}", history);

        // Assert
        result.SelectedTool.Should().Be(expectedTool,
            because: $"pronoun '{pronoun}' should resolve to the found note");
    }

    [Fact]
    public async Task LongConversationHistory_ShouldStillFindContext()
    {
        // Arrange - 10 turns of history
        var history = new List<ConversationTurn>();
        for (int i = 0; i < 10; i++)
        {
            history.Add(new ConversationTurn
            {
                Role = "user",
                Content = $"Message {i}"
            });
            history.Add(new ConversationTurn
            {
                Role = "assistant",
                Content = $"Response {i}"
            });
        }
        // Add a relevant tool call in the middle
        history[5] = new ConversationTurn
        {
            Role = "assistant",
            Content = "Found your note",
            ToolName = "SemanticSearch",
            ToolResult = "{\"id\": \"note-important\", \"title\": \"Important Note\"}"
        };

        // Act
        var result = await _validator.ValidateToolSelectionAsync("Update that note I found earlier", history);

        // Assert
        result.SelectedTool.Should().BeOneOf(new[] { "GetNote", "UpdateNote" },
            "should find relevant context even in long history");
    }
}
