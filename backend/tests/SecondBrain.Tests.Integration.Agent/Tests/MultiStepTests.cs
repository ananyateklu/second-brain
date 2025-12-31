using FluentAssertions;
using SecondBrain.Tests.Integration.Agent.Framework;
using SecondBrain.Tests.Integration.Agent.TestCases;
using Xunit;

namespace SecondBrain.Tests.Integration.Agent.Tests;

/// <summary>
/// Tests for multi-step task completion.
/// Validates that the agent can correctly sequence tool calls
/// for complex tasks that require multiple operations.
/// </summary>
public class MultiStepTests
{
    private readonly AgentEvaluationRunner _runner;
    private readonly IToolSelectionValidator _validator;

    public MultiStepTests()
    {
        _validator = new MockToolSelectionValidator();
        _runner = new AgentEvaluationRunner(_validator);
    }

    [Fact]
    public async Task AllMultiStepCases_ShouldHaveHighPassRate()
    {
        // Arrange
        var cases = EvaluationTestCases.GetMultiStepCases();

        // Act
        var report = await _runner.RunCategoryAsync(cases, EvaluationCategory.MultiStep);

        // Assert
        report.PassRate.Should().BeGreaterThanOrEqualTo(0.8,
            because: $"at least 80% of multi-step cases should pass. Failures: {string.Join(", ", report.Failures.Select(f => $"{f.Case.Id}: {f.ErrorMessage}"))}");
    }

    [Fact]
    public async Task SearchThenAppend_FirstStep_ShouldSelectSearch()
    {
        // Arrange
        var userInput = "Find my grocery list and add eggs to it";

        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be("SemanticSearch",
            because: "the first step of a search-then-modify should be to search");
    }

    [Fact]
    public async Task SearchThenAppend_SecondStep_ShouldUseContextToAppend()
    {
        // Arrange
        var history = new List<ConversationTurn>
        {
            new() { Role = "user", Content = "Find my grocery list" },
            new() { Role = "assistant", Content = "Found your grocery list", ToolName = "SemanticSearch", ToolResult = "{\"id\": \"note-123\", \"title\": \"Grocery List\"}" }
        };

        // Act
        var result = await _validator.ValidateToolSelectionAsync("Now add eggs to it", history);

        // Assert
        result.SelectedTool.Should().Be("AppendToNote",
            because: "with search context, adding content should use AppendToNote");
        result.Parameters.Should().ContainKey("noteId",
            because: "the note ID from the previous search should be used");
    }

    [Fact]
    public async Task CreateThenOrganize_ShouldStartWithCreate()
    {
        // Arrange
        var userInput = "Create a new note about recipes";

        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be("CreateNote",
            because: "creating should come before organizing");
    }

    [Fact]
    public async Task ChainOfOperations_ShouldMaintainContext()
    {
        // Arrange
        var history = new List<ConversationTurn>
        {
            new() { Role = "user", Content = "Find my todo list" },
            new() { Role = "assistant", Content = "Found", ToolName = "SemanticSearch", ToolResult = "{\"id\": \"note-todo\"}" },
            new() { Role = "user", Content = "Add 'buy groceries' to it" },
            new() { Role = "assistant", Content = "Added", ToolName = "AppendToNote", ToolResult = "{\"success\": true}" }
        };

        // Act
        var result = await _validator.ValidateToolSelectionAsync("Also add a bullet point at the start", history);

        // Assert
        result.SelectedTool.Should().Be("PrependToNote",
            because: "adding at the start with context should use PrependToNote");
    }

    [Theory]
    [InlineData("Find all notes about the old project", "SemanticSearch")]
    [InlineData("Search for my meeting notes", "SemanticSearch")]
    [InlineData("Find my recipes", "SemanticSearch")]
    public async Task BulkOperations_ShouldStartWithSearch(string userInput, string expectedFirstTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedFirstTool,
            because: "bulk operations should start with finding the relevant notes");
    }

    [Fact]
    public async Task ConditionalOperation_ShouldCheckExistenceFirst()
    {
        // Arrange
        var userInput = "Check if I have a note about Python, if not create one";

        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be("SemanticSearch",
            because: "checking existence before creating requires a search first");
    }

    [Fact]
    public async Task CopyBetweenNotes_ShouldStartWithGetNote()
    {
        // Arrange
        var userInput = "Get the summary from my meeting notes and add it to my weekly report";

        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().BeOneOf(new[] { "GetNote", "SemanticSearch" },
            "copying content requires first reading the source note");
    }

    [Fact]
    public async Task RestoreAndUpdate_ShouldHandleBothOperations()
    {
        // Arrange - First do the restore
        var restoreHistory = new List<ConversationTurn>
        {
            new() { Role = "user", Content = "Unarchive my project notes" },
            new() { Role = "assistant", Content = "Restored", ToolName = "SetNoteArchived", ToolResult = "{\"id\": \"note-123\", \"isArchived\": false}" }
        };

        // Act - Then add content with explicit reference
        var result = await _validator.ValidateToolSelectionAsync("Add a date to it", restoreHistory);

        // Assert
        result.SelectedTool.Should().Be("AppendToNote",
            because: "after restoring, adding content should use AppendToNote");
    }

    [Fact]
    public async Task MultiStepSuccessRate_ShouldMeetTarget()
    {
        // Arrange
        var cases = EvaluationTestCases.GetMultiStepCases();

        // Act
        var report = await _runner.RunAsync(cases);

        // Assert
        report.MultiStepSuccessRate.Should().BeGreaterThanOrEqualTo(0.7,
            because: "multi-step operations are complex but should still have good success rate");
    }

    [Fact]
    public async Task SequentialOperations_ShouldRespectOrder()
    {
        // Test that when given a multi-step instruction,
        // the first operation is correctly identified

        var testCases = new[]
        {
            ("Find my project notes", new[] { "SemanticSearch" }),
            ("Show me all my notes", new[] { "ListNotes" }),
            ("Find all my #work notes", new[] { "SearchByTags" })
        };

        foreach (var (input, expectedFirstTools) in testCases)
        {
            var result = await _validator.ValidateToolSelectionAsync(input, null);
            result.SelectedTool.Should().BeOneOf(expectedFirstTools,
                $"for input '{input}', first step should be one of: {string.Join(", ", expectedFirstTools)}");
        }
    }
}
