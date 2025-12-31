using FluentAssertions;
using SecondBrain.Tests.Integration.Agent.Framework;
using SecondBrain.Tests.Integration.Agent.TestCases;
using Xunit;

namespace SecondBrain.Tests.Integration.Agent.Tests;

/// <summary>
/// Tests for correct tool selection based on user intent.
/// Uses a mock validator to validate that tool descriptions and patterns
/// would lead to correct tool selection.
/// </summary>
public class ToolSelectionTests
{
    private readonly AgentEvaluationRunner _runner;
    private readonly IToolSelectionValidator _validator;

    public ToolSelectionTests()
    {
        _validator = new MockToolSelectionValidator();
        _runner = new AgentEvaluationRunner(_validator);
    }

    [Fact]
    public async Task AllToolSelectionCases_ShouldPass()
    {
        // Arrange
        var cases = EvaluationTestCases.GetToolSelectionCases();

        // Act
        var report = await _runner.RunCategoryAsync(cases, EvaluationCategory.ToolSelection);

        // Assert
        report.PassRate.Should().BeGreaterThanOrEqualTo(0.9,
            because: $"at least 90% of tool selection cases should pass. Failures: {string.Join(", ", report.Failures.Select(f => $"{f.Case.Id}: {f.ErrorMessage}"))}");
    }

    [Theory]
    [InlineData("Find my notes about machine learning", "SemanticSearch")]
    [InlineData("search for my project ideas", "SemanticSearch")]
    [InlineData("what notes do I have about cooking", "SemanticSearch")]
    [InlineData("look up my travel plans", "SemanticSearch")]
    public async Task SemanticSearch_ShouldBeSelected_ForGeneralSearchQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
        result.Success.Should().BeTrue();
    }

    [Theory]
    [InlineData("Search for exact text 'API configuration'", "SearchNotes")]
    [InlineData("Find the exact phrase 'hello world'", "SearchNotes")]
    [InlineData("Contains exactly 'TODO:'", "SearchNotes")]
    public async Task SearchNotes_ShouldBeSelected_ForExactTextQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
    }

    [Theory]
    [InlineData("Show notes tagged with #work", "SearchByTags")]
    [InlineData("Find notes with tag important", "SearchByTags")]
    [InlineData("Notes labeled as urgent", "SearchByTags")]
    public async Task SearchByTags_ShouldBeSelected_ForTagQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
    }

    [Theory]
    [InlineData("Show notes created last week", "GetNotesByDateRange")]
    [InlineData("Notes updated last month", "GetNotesByDateRange")]
    [InlineData("What notes did I create yesterday", "GetNotesByDateRange")]
    public async Task GetNotesByDateRange_ShouldBeSelected_ForDateQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
    }

    [Theory]
    [InlineData("Create a new note about my project", "CreateNote")]
    [InlineData("Make a note called Shopping List", "CreateNote")]
    [InlineData("Create a new note for meeting notes", "CreateNote")]
    [InlineData("Write a new note about Python", "CreateNote")]
    public async Task CreateNote_ShouldBeSelected_ForCreateQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
    }

    [Theory]
    [InlineData("Add 'buy milk' to my grocery list", "AppendToNote")]
    [InlineData("Append this to my notes", "AppendToNote")]
    [InlineData("Add a new item to the end of my list", "AppendToNote")]
    public async Task AppendToNote_ShouldBeSelected_ForAppendQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
    }

    [Theory]
    [InlineData("Put a header at the beginning of my note", "PrependToNote")]
    [InlineData("Add text at the top of my document", "PrependToNote")]
    [InlineData("Prepend this to my notes", "PrependToNote")]
    public async Task PrependToNote_ShouldBeSelected_ForPrependQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
    }

    [Theory]
    [InlineData("Change 2024 to 2025 in my goals", "ReplaceInNote")]
    [InlineData("Fix the typo in my document", "ReplaceInNote")]
    [InlineData("Replace 'old' with 'new' in my notes", "ReplaceInNote")]
    public async Task ReplaceInNote_ShouldBeSelected_ForReplaceQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
    }

    [Theory]
    [InlineData("Delete the old project note", "DeleteNote")]
    [InlineData("Remove my outdated notes", "DeleteNote")]
    [InlineData("Trash the old meeting notes", "DeleteNote")]
    public async Task DeleteNote_ShouldBeSelected_ForDeleteQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
    }

    [Theory]
    [InlineData("Show me all my notes", "ListNotes")]
    [InlineData("List all my notes", "ListNotes")]
    [InlineData("Display my archived notes", "ListNotes")]
    public async Task ListNotes_ShouldBeSelected_ForListQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
    }

    [Theory]
    [InlineData("Archive the project note", "SetNoteArchived")]
    [InlineData("Unarchive my old notes", "SetNoteArchived")]
    [InlineData("Restore from archive my document", "SetNoteArchived")]
    public async Task SetNoteArchived_ShouldBeSelected_ForArchiveQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
    }

    [Theory]
    [InlineData("Move my recipe to the Cooking folder", "MoveToFolder")]
    [InlineData("Put my notes into the Work category", "MoveToFolder")]
    [InlineData("File this in the Archive folder", "MoveToFolder")]
    public async Task MoveToFolder_ShouldBeSelected_ForMoveQueries(string userInput, string expectedTool)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be(expectedTool);
    }

    [Fact]
    public async Task ToolSelectionAccuracy_ShouldBeAbove90Percent()
    {
        // Arrange
        var cases = EvaluationTestCases.GetToolSelectionCases();

        // Act
        var report = await _runner.RunAsync(cases);

        // Assert
        report.ToolSelectionAccuracy.Should().BeGreaterThanOrEqualTo(0.9,
            because: "tool selection should be at least 90% accurate");
    }

    [Fact]
    public async Task HighPriorityToolSelectionCases_ShouldAllPass()
    {
        // Arrange
        var highPriorityCases = EvaluationTestCases.GetToolSelectionCases()
            .Where(c => c.Priority >= 9);

        // Act
        var report = await _runner.RunAsync(highPriorityCases);

        // Assert
        report.PassRate.Should().Be(1.0,
            because: $"all high priority cases should pass. Failures: {string.Join(", ", report.Failures.Select(f => f.Case.Id))}");
    }
}
