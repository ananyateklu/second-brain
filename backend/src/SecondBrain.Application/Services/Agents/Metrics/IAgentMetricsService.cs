namespace SecondBrain.Application.Services.Agents.Metrics;

/// <summary>
/// Summary of agent metrics over a time period.
/// </summary>
public record AgentMetricsSummary
{
    /// <summary>
    /// Start of the measurement period.
    /// </summary>
    public DateTime PeriodStart { get; init; }

    /// <summary>
    /// End of the measurement period.
    /// </summary>
    public DateTime PeriodEnd { get; init; }

    /// <summary>
    /// Total number of agent requests.
    /// </summary>
    public int TotalRequests { get; init; }

    /// <summary>
    /// Total number of tool executions.
    /// </summary>
    public int TotalToolExecutions { get; init; }

    /// <summary>
    /// Number of successful tool executions.
    /// </summary>
    public int SuccessfulToolExecutions { get; init; }

    /// <summary>
    /// Number of failed tool executions.
    /// </summary>
    public int FailedToolExecutions { get; init; }

    /// <summary>
    /// Tool execution success rate (0-1).
    /// </summary>
    public double ToolSuccessRate => TotalToolExecutions > 0
        ? (double)SuccessfulToolExecutions / TotalToolExecutions
        : 0;

    /// <summary>
    /// Average tool execution duration in milliseconds.
    /// </summary>
    public double AverageToolDurationMs { get; init; }

    /// <summary>
    /// Total input tokens across all requests.
    /// </summary>
    public long TotalInputTokens { get; init; }

    /// <summary>
    /// Total output tokens across all requests.
    /// </summary>
    public long TotalOutputTokens { get; init; }

    /// <summary>
    /// Average input tokens per request.
    /// </summary>
    public double AverageInputTokens => TotalRequests > 0
        ? (double)TotalInputTokens / TotalRequests
        : 0;

    /// <summary>
    /// Average output tokens per request.
    /// </summary>
    public double AverageOutputTokens => TotalRequests > 0
        ? (double)TotalOutputTokens / TotalRequests
        : 0;

    /// <summary>
    /// Average tool calls per request.
    /// </summary>
    public double AverageToolCallsPerRequest => TotalRequests > 0
        ? (double)TotalToolExecutions / TotalRequests
        : 0;

    /// <summary>
    /// Breakdown by provider.
    /// </summary>
    public IReadOnlyDictionary<string, ProviderMetrics> ByProvider { get; init; } =
        new Dictionary<string, ProviderMetrics>();

    /// <summary>
    /// Breakdown by tool.
    /// </summary>
    public IReadOnlyDictionary<string, ToolMetrics> ByTool { get; init; } =
        new Dictionary<string, ToolMetrics>();
}

/// <summary>
/// Metrics for a specific AI provider.
/// </summary>
public record ProviderMetrics
{
    public string Provider { get; init; } = string.Empty;
    public int RequestCount { get; init; }
    public int ToolExecutions { get; init; }
    public long InputTokens { get; init; }
    public long OutputTokens { get; init; }
    public double AverageLatencyMs { get; init; }
}

/// <summary>
/// Metrics for a specific tool.
/// </summary>
public record ToolMetrics
{
    public string ToolName { get; init; } = string.Empty;
    public int ExecutionCount { get; init; }
    public int SuccessCount { get; init; }
    public int FailureCount { get; init; }
    public double AverageDurationMs { get; init; }
    public double SuccessRate => ExecutionCount > 0
        ? (double)SuccessCount / ExecutionCount
        : 0;
}

/// <summary>
/// Service for collecting and aggregating agent metrics.
/// </summary>
public interface IAgentMetricsService
{
    /// <summary>
    /// Record a tool execution.
    /// </summary>
    /// <param name="toolName">Name of the tool.</param>
    /// <param name="durationMs">Duration in milliseconds.</param>
    /// <param name="success">Whether the execution succeeded.</param>
    /// <param name="provider">AI provider used.</param>
    void RecordToolExecution(string toolName, long durationMs, bool success, string? provider = null);

    /// <summary>
    /// Record an agent request.
    /// </summary>
    /// <param name="provider">AI provider used.</param>
    /// <param name="inputTokens">Input token count.</param>
    /// <param name="outputTokens">Output token count.</param>
    /// <param name="toolCallCount">Number of tool calls in this request.</param>
    void RecordRequest(string provider, int inputTokens, int outputTokens, int toolCallCount);

    /// <summary>
    /// Get aggregated metrics summary for a time period.
    /// </summary>
    /// <param name="period">Time period to aggregate.</param>
    AgentMetricsSummary GetSummary(TimeSpan period);

    /// <summary>
    /// Get aggregated metrics summary from a specific start time.
    /// </summary>
    /// <param name="from">Start of the period.</param>
    /// <param name="to">End of the period (defaults to now).</param>
    AgentMetricsSummary GetSummary(DateTime from, DateTime? to = null);

    /// <summary>
    /// Reset all metrics (typically for testing).
    /// </summary>
    void Reset();
}
