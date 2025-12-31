namespace SecondBrain.Tests.Integration.Agent.Framework;

/// <summary>
/// Categories for agent evaluation test cases.
/// </summary>
public enum EvaluationCategory
{
    /// <summary>
    /// Tests for correct tool selection based on user intent.
    /// </summary>
    ToolSelection,

    /// <summary>
    /// Tests for multi-step task completion.
    /// </summary>
    MultiStep,

    /// <summary>
    /// Tests for graceful error handling and recovery.
    /// </summary>
    ErrorRecovery,

    /// <summary>
    /// Tests for maintaining context across conversation turns.
    /// </summary>
    ContextRetention,

    /// <summary>
    /// Tests for security and prompt injection resistance.
    /// </summary>
    Security
}

/// <summary>
/// Defines an evaluation test case for agent behavior.
/// </summary>
public record EvaluationCase
{
    /// <summary>
    /// Unique identifier for this test case.
    /// </summary>
    public required string Id { get; init; }

    /// <summary>
    /// Human-readable description of what this test validates.
    /// </summary>
    public required string Description { get; init; }

    /// <summary>
    /// Category of this evaluation case.
    /// </summary>
    public required EvaluationCategory Category { get; init; }

    /// <summary>
    /// The user input/prompt to send to the agent.
    /// </summary>
    public required string UserInput { get; init; }

    /// <summary>
    /// Previous conversation context (if any).
    /// </summary>
    public List<ConversationTurn>? ConversationHistory { get; init; }

    /// <summary>
    /// Expected tool(s) to be called. If multiple, any match is considered success.
    /// </summary>
    public required List<string> ExpectedTools { get; init; }

    /// <summary>
    /// Expected parameters for the tool call (key-value pairs to validate).
    /// </summary>
    public Dictionary<string, object>? ExpectedParameters { get; init; }

    /// <summary>
    /// Keywords that should appear in the response.
    /// </summary>
    public List<string>? ExpectedResponseKeywords { get; init; }

    /// <summary>
    /// Keywords that should NOT appear in the response (for security tests).
    /// </summary>
    public List<string>? ForbiddenResponseKeywords { get; init; }

    /// <summary>
    /// Whether this test expects the tool call to succeed.
    /// </summary>
    public bool ExpectSuccess { get; init; } = true;

    /// <summary>
    /// Tags for filtering/grouping tests.
    /// </summary>
    public List<string>? Tags { get; init; }

    /// <summary>
    /// Priority/weight for this test case (1-10, higher = more important).
    /// </summary>
    public int Priority { get; init; } = 5;
}

/// <summary>
/// Represents a turn in the conversation history.
/// </summary>
public record ConversationTurn
{
    public required string Role { get; init; } // "user" or "assistant"
    public required string Content { get; init; }
    public string? ToolName { get; init; }
    public string? ToolResult { get; init; }
}

/// <summary>
/// Result of evaluating a single test case.
/// </summary>
public record EvaluationResult
{
    /// <summary>
    /// The test case that was evaluated.
    /// </summary>
    public required EvaluationCase Case { get; init; }

    /// <summary>
    /// Whether the test passed.
    /// </summary>
    public required bool Passed { get; init; }

    /// <summary>
    /// Whether the correct tool was selected.
    /// </summary>
    public required bool ToolSelectionCorrect { get; init; }

    /// <summary>
    /// Whether the parameters were correct (if checked).
    /// </summary>
    public bool? ParametersCorrect { get; init; }

    /// <summary>
    /// The tool that was actually called.
    /// </summary>
    public string? ActualTool { get; init; }

    /// <summary>
    /// The actual parameters passed to the tool.
    /// </summary>
    public Dictionary<string, object>? ActualParameters { get; init; }

    /// <summary>
    /// The agent's response content.
    /// </summary>
    public string? ResponseContent { get; init; }

    /// <summary>
    /// Error message if the test failed.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Duration of the evaluation in milliseconds.
    /// </summary>
    public long DurationMs { get; init; }

    /// <summary>
    /// Timestamp when evaluation completed.
    /// </summary>
    public DateTime CompletedAt { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// Aggregated report from running multiple evaluation cases.
/// </summary>
public record EvaluationReport
{
    /// <summary>
    /// When the evaluation started.
    /// </summary>
    public DateTime StartedAt { get; init; }

    /// <summary>
    /// When the evaluation completed.
    /// </summary>
    public DateTime CompletedAt { get; init; }

    /// <summary>
    /// Total number of test cases evaluated.
    /// </summary>
    public int TotalCases { get; init; }

    /// <summary>
    /// Number of passed test cases.
    /// </summary>
    public int PassedCases { get; init; }

    /// <summary>
    /// Number of failed test cases.
    /// </summary>
    public int FailedCases => TotalCases - PassedCases;

    /// <summary>
    /// Overall pass rate (0-1).
    /// </summary>
    public double PassRate => TotalCases > 0 ? (double)PassedCases / TotalCases : 0;

    /// <summary>
    /// Tool selection accuracy (0-1).
    /// </summary>
    public double ToolSelectionAccuracy { get; init; }

    /// <summary>
    /// Parameter accuracy (0-1).
    /// </summary>
    public double ParameterAccuracy { get; init; }

    /// <summary>
    /// Multi-step task success rate (0-1).
    /// </summary>
    public double MultiStepSuccessRate { get; init; }

    /// <summary>
    /// Error recovery success rate (0-1).
    /// </summary>
    public double ErrorRecoveryRate { get; init; }

    /// <summary>
    /// Context retention accuracy (0-1).
    /// </summary>
    public double ContextRetentionRate { get; init; }

    /// <summary>
    /// Security test pass rate (0-1).
    /// </summary>
    public double SecurityPassRate { get; init; }

    /// <summary>
    /// Average evaluation duration in milliseconds.
    /// </summary>
    public double AverageDurationMs { get; init; }

    /// <summary>
    /// Results grouped by category.
    /// </summary>
    public IReadOnlyDictionary<EvaluationCategory, CategorySummary> ByCategory { get; init; } =
        new Dictionary<EvaluationCategory, CategorySummary>();

    /// <summary>
    /// List of failed cases for debugging.
    /// </summary>
    public IReadOnlyList<EvaluationResult> Failures { get; init; } = Array.Empty<EvaluationResult>();

    /// <summary>
    /// All individual results.
    /// </summary>
    public IReadOnlyList<EvaluationResult> AllResults { get; init; } = Array.Empty<EvaluationResult>();
}

/// <summary>
/// Summary statistics for a category.
/// </summary>
public record CategorySummary
{
    public EvaluationCategory Category { get; init; }
    public int Total { get; init; }
    public int Passed { get; init; }
    public int Failed => Total - Passed;
    public double PassRate => Total > 0 ? (double)Passed / Total : 0;
}
