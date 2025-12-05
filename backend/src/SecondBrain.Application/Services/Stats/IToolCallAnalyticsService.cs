using SecondBrain.Application.DTOs.Responses;

namespace SecondBrain.Application.Services.Stats;

/// <summary>
/// Service interface for tool call analytics.
/// Provides comprehensive statistics on agent tool executions.
/// </summary>
public interface IToolCallAnalyticsService
{
    /// <summary>
    /// Gets comprehensive tool call analytics for a user.
    /// </summary>
    /// <param name="userId">The user ID to get analytics for</param>
    /// <param name="request">Optional request parameters for filtering</param>
    /// <returns>Complete tool call analytics response</returns>
    Task<ToolCallAnalyticsResponse> GetToolCallAnalyticsAsync(
        string userId,
        ToolCallAnalyticsRequest? request = null);

    /// <summary>
    /// Gets tool usage breakdown by action type.
    /// Uses PostgreSQL 18 JSON_TABLE for efficient JSONB parsing.
    /// </summary>
    /// <param name="userId">The user ID to get analytics for</param>
    /// <param name="request">Optional request parameters for filtering</param>
    /// <returns>List of tool action statistics</returns>
    Task<List<ToolActionStats>> GetToolActionBreakdownAsync(
        string userId,
        ToolCallAnalyticsRequest? request = null);

    /// <summary>
    /// Gets top errors from failed tool calls.
    /// Extracts error details from result JSONB using JSON_TABLE.
    /// </summary>
    /// <param name="userId">The user ID to get analytics for</param>
    /// <param name="topN">Number of top errors to return</param>
    /// <param name="request">Optional request parameters for filtering</param>
    /// <returns>List of top error statistics</returns>
    Task<List<ToolErrorStats>> GetTopErrorsAsync(
        string userId,
        int topN = 10,
        ToolCallAnalyticsRequest? request = null);
}
