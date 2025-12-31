namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Structured audit data for tool executions.
/// Captures all relevant information for debugging, compliance, and metrics.
/// </summary>
public record ToolExecutionAudit
{
    /// <summary>
    /// Unique identifier for the agent request that triggered this tool call.
    /// </summary>
    public required string RequestId { get; init; }

    /// <summary>
    /// User ID who initiated the request.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Conversation ID if available.
    /// </summary>
    public string? ConversationId { get; init; }

    /// <summary>
    /// Name of the tool that was executed.
    /// </summary>
    public required string ToolName { get; init; }

    /// <summary>
    /// Plugin that provided the tool.
    /// </summary>
    public required string PluginName { get; init; }

    /// <summary>
    /// JSON-serialized arguments passed to the tool.
    /// </summary>
    public required string Arguments { get; init; }

    /// <summary>
    /// Summary of the result (truncated for large outputs).
    /// </summary>
    public required string ResultSummary { get; init; }

    /// <summary>
    /// Full result (may be large, use sparingly).
    /// </summary>
    public string? FullResult { get; init; }

    /// <summary>
    /// Whether the tool execution succeeded.
    /// </summary>
    public required bool Success { get; init; }

    /// <summary>
    /// Error message if the execution failed.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Duration of the tool execution in milliseconds.
    /// </summary>
    public required long DurationMs { get; init; }

    /// <summary>
    /// UTC timestamp when the tool execution started.
    /// </summary>
    public required DateTime StartedAt { get; init; }

    /// <summary>
    /// UTC timestamp when the tool execution completed.
    /// </summary>
    public required DateTime CompletedAt { get; init; }

    /// <summary>
    /// AI provider used for this request (e.g., "OpenAI", "Anthropic").
    /// </summary>
    public string? Provider { get; init; }

    /// <summary>
    /// AI model used for this request (e.g., "gpt-4o", "claude-3-5-sonnet").
    /// </summary>
    public string? Model { get; init; }

    /// <summary>
    /// Sequence number of this tool call within the request (1-based).
    /// </summary>
    public int ToolCallSequence { get; init; } = 1;

    /// <summary>
    /// Whether this was executed in parallel with other tools.
    /// </summary>
    public bool WasParallelExecution { get; init; }
}

/// <summary>
/// Provides structured audit logging for tool executions.
/// Enables debugging, compliance auditing, and performance analysis.
/// </summary>
public interface IToolAuditLogger
{
    /// <summary>
    /// Log a completed tool execution.
    /// </summary>
    /// <param name="audit">The audit data to log.</param>
    void Log(ToolExecutionAudit audit);

    /// <summary>
    /// Log a completed tool execution asynchronously.
    /// Use for persistent storage scenarios.
    /// </summary>
    /// <param name="audit">The audit data to log.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task LogAsync(ToolExecutionAudit audit, CancellationToken cancellationToken = default);

    /// <summary>
    /// Log the start of a tool execution (for long-running tools).
    /// </summary>
    /// <param name="requestId">Request ID.</param>
    /// <param name="toolName">Tool name.</param>
    /// <param name="arguments">Tool arguments.</param>
    void LogToolStart(string requestId, string toolName, string arguments);

    /// <summary>
    /// Log a batch of tool executions (for parallel execution scenarios).
    /// </summary>
    /// <param name="audits">The audit data to log.</param>
    void LogBatch(IEnumerable<ToolExecutionAudit> audits);
}
