namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Repository interface for tool call analytics using PostgreSQL 18 JSON_TABLE.
/// Provides efficient querying of JSONB data in the tool_calls table.
/// </summary>
public interface IToolCallAnalyticsRepository
{
    /// <summary>
    /// Gets overall tool call statistics for a user within the specified date range.
    /// </summary>
    Task<ToolCallOverallStats> GetOverallStatsAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets tool usage breakdown by tool name.
    /// Uses JSON_TABLE to efficiently aggregate tool call data.
    /// </summary>
    Task<List<ToolUsageByNameResult>> GetToolUsageByNameAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets tool usage breakdown by action type extracted from arguments JSONB.
    /// Uses PostgreSQL 18 JSON_TABLE for efficient parsing.
    /// </summary>
    Task<List<ToolUsageByActionResult>> GetToolUsageByActionAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets daily tool call counts for trend analysis.
    /// </summary>
    Task<Dictionary<string, int>> GetDailyToolCallsAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets daily success rates for trend analysis.
    /// </summary>
    Task<Dictionary<string, double>> GetDailySuccessRatesAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets top error patterns from failed tool calls.
    /// Extracts error information from result JSONB using JSON_TABLE.
    /// </summary>
    Task<List<ToolErrorResult>> GetTopErrorsAsync(
        string userId,
        int topN = 10,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets hourly distribution of tool calls (0-23 hours).
    /// </summary>
    Task<Dictionary<int, int>> GetHourlyDistributionAsync(
        string userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default);
}

#region Result DTOs for Repository

/// <summary>
/// Overall statistics result from database
/// </summary>
public record ToolCallOverallStats(
    int TotalCalls,
    int SuccessfulCalls,
    int FailedCalls,
    double SuccessRate,
    double AverageExecutionTimeMs);

/// <summary>
/// Tool usage by name result from database
/// </summary>
public record ToolUsageByNameResult(
    string ToolName,
    int CallCount,
    int SuccessCount,
    int FailureCount,
    double SuccessRate,
    DateTime? FirstUsed,
    DateTime? LastUsed);

/// <summary>
/// Tool usage by action result from database
/// </summary>
public record ToolUsageByActionResult(
    string ToolName,
    string Action,
    int CallCount,
    int SuccessCount,
    double SuccessRate);

/// <summary>
/// Tool error result from database
/// </summary>
public record ToolErrorResult(
    string ToolName,
    string ErrorType,
    string ErrorMessage,
    int OccurrenceCount,
    DateTime? FirstOccurrence,
    DateTime? LastOccurrence);

#endregion
