using FluentAssertions;
using SecondBrain.Tests.Integration.Agent.Framework;
using SecondBrain.Tests.Integration.Agent.TestCases;
using Xunit;

namespace SecondBrain.Tests.Integration.Agent.Tests;

/// <summary>
/// Tests for graceful error handling and recovery.
/// Validates that the agent handles edge cases and errors appropriately.
/// </summary>
public class ErrorRecoveryTests
{
    private readonly AgentEvaluationRunner _runner;
    private readonly IToolSelectionValidator _validator;

    public ErrorRecoveryTests()
    {
        _validator = new MockToolSelectionValidator();
        _runner = new AgentEvaluationRunner(_validator);
    }

    [Fact]
    public async Task AllErrorRecoveryCases_ShouldHaveReasonablePassRate()
    {
        // Arrange
        var cases = EvaluationTestCases.GetErrorRecoveryCases();

        // Act
        var report = await _runner.RunCategoryAsync(cases, EvaluationCategory.ErrorRecovery);

        // Assert
        report.PassRate.Should().BeGreaterThanOrEqualTo(0.6,
            because: $"at least 60% of error recovery cases should pass. Failures: {string.Join(", ", report.Failures.Select(f => $"{f.Case.Id}: {f.ErrorMessage}"))}");
    }

    [Fact]
    public async Task AmbiguousReference_ShouldTriggerClarification()
    {
        // Arrange
        var userInput = "Update that note with today's date";

        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        // Without context, "that note" is ambiguous - should try to search or list
        result.SelectedTool.Should().BeOneOf(new[] { "SemanticSearch", "ListNotes", "UpdateNote" },
            "ambiguous references should trigger search for clarification");
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task EmptySearchResults_ShouldStillSucceed()
    {
        // Arrange
        var userInput = "Find notes about quantum computing";

        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be("SemanticSearch");
        result.Success.Should().BeTrue(
            because: "search should succeed even if results are empty");
    }

    [Theory]
    [InlineData("Move the note to folder ''")]
    [InlineData("Create a note with title ''")]
    [InlineData("Add '' to my notes")]
    public async Task EmptyParameters_ShouldBeHandledGracefully(string userInput)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.Success.Should().BeTrue(
            because: "empty parameters should be handled gracefully");
    }

    [Fact]
    public async Task InvalidNoteId_ShouldNotCrash()
    {
        // Arrange
        var userInput = "Update the nonexistent-note-12345";

        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.Success.Should().BeTrue(
            because: "invalid note IDs should be handled gracefully");
        result.SelectedTool.Should().NotBeNull();
    }

    [Fact]
    public async Task TextNotFound_ForReplace_ShouldBeHandled()
    {
        // Arrange
        var userInput = "Replace 'xyz123nonexistent' with 'abc' in my notes";

        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.SelectedTool.Should().Be("ReplaceInNote");
        result.Success.Should().BeTrue(
            because: "replace should be selected even if text may not exist");
    }

    [Fact]
    public async Task MalformedInput_ShouldDefaultToSearch()
    {
        // Arrange
        var userInput = "asdf jkl; random nonsense text";

        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.Success.Should().BeTrue();
        result.SelectedTool.Should().Be("SemanticSearch",
            because: "malformed input should default to semantic search");
    }

    [Fact]
    public async Task VeryLongInput_ShouldBeHandled()
    {
        // Arrange
        var longInput = "Find notes about " + new string('a', 1000);

        // Act
        var result = await _validator.ValidateToolSelectionAsync(longInput, null);

        // Assert
        result.Success.Should().BeTrue(
            because: "very long inputs should be handled without crashing");
    }

    [Fact]
    public async Task SpecialCharacters_ShouldBeHandled()
    {
        // Arrange
        var specialInput = "Find notes about C# and .NET (version 8.0)";

        // Act
        var result = await _validator.ValidateToolSelectionAsync(specialInput, null);

        // Assert
        result.Success.Should().BeTrue();
        result.SelectedTool.Should().Be("SemanticSearch",
            because: "special characters should be handled correctly");
    }

    [Fact]
    public async Task ErrorRecoveryRate_ShouldMeetTarget()
    {
        // Arrange
        var cases = EvaluationTestCases.GetErrorRecoveryCases();

        // Act
        var report = await _runner.RunAsync(cases);

        // Assert
        report.ErrorRecoveryRate.Should().BeGreaterThanOrEqualTo(0.6,
            because: "error recovery should succeed in most cases");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\n\t")]
    public async Task WhitespaceOnlyInput_ShouldBeHandled(string input)
    {
        // Act
        var result = await _validator.ValidateToolSelectionAsync(input, null);

        // Assert
        result.Success.Should().BeTrue(
            because: "whitespace-only input should not crash");
    }

    [Fact]
    public async Task NullHistory_ShouldBeHandled()
    {
        // Arrange
        var userInput = "Show me all my notes";

        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, null);

        // Assert
        result.Success.Should().BeTrue(
            because: "null history should be handled gracefully");
    }

    [Fact]
    public async Task EmptyHistory_ShouldBeHandled()
    {
        // Arrange
        var userInput = "Show me all my notes";
        var emptyHistory = new List<ConversationTurn>();

        // Act
        var result = await _validator.ValidateToolSelectionAsync(userInput, emptyHistory);

        // Assert
        result.Success.Should().BeTrue(
            because: "empty history should be handled gracefully");
    }
}
