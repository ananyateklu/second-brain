using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Stats;

/// <summary>
/// Service implementation for tool call analytics.
/// Orchestrates repository calls to provide comprehensive statistics.
/// </summary>
public class ToolCallAnalyticsService : IToolCallAnalyticsService
{
    private readonly IToolCallAnalyticsRepository _repository;
    private readonly ILogger<ToolCallAnalyticsService> _logger;

    public ToolCallAnalyticsService(
        IToolCallAnalyticsRepository repository,
        ILogger<ToolCallAnalyticsService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<ToolCallAnalyticsResponse> GetToolCallAnalyticsAsync(
        string userId,
        ToolCallAnalyticsRequest? request = null)
    {
        _logger.LogInformation(
            "Getting tool call analytics. UserId: {UserId}, DaysBack: {DaysBack}",
            userId, request?.DaysBack ?? 30);

        var (startDate, endDate) = GetDateRange(request);

        // Execute all queries in parallel for better performance
        var overallStatsTask = _repository.GetOverallStatsAsync(userId, startDate, endDate);
        var toolUsageByNameTask = _repository.GetToolUsageByNameAsync(userId, startDate, endDate);
        var toolUsageByActionTask = _repository.GetToolUsageByActionAsync(userId, startDate, endDate);
        var dailyToolCallsTask = _repository.GetDailyToolCallsAsync(userId, startDate, endDate);
        var dailySuccessRatesTask = _repository.GetDailySuccessRatesAsync(userId, startDate, endDate);
        var topErrorsTask = _repository.GetTopErrorsAsync(userId, 10, startDate, endDate);
        var hourlyDistributionTask = _repository.GetHourlyDistributionAsync(userId, startDate, endDate);

        await Task.WhenAll(
            overallStatsTask,
            toolUsageByNameTask,
            toolUsageByActionTask,
            dailyToolCallsTask,
            dailySuccessRatesTask,
            topErrorsTask,
            hourlyDistributionTask);

        var overallStats = await overallStatsTask;
        var toolUsageByName = await toolUsageByNameTask;
        var toolUsageByAction = await toolUsageByActionTask;
        var dailyToolCalls = await dailyToolCallsTask;
        var dailySuccessRates = await dailySuccessRatesTask;
        var topErrors = await topErrorsTask;
        var hourlyDistribution = await hourlyDistributionTask;

        // Calculate percentages for tool usage
        var totalCalls = overallStats.TotalCalls;
        var toolUsageStats = toolUsageByName.Select(t => new ToolUsageStats
        {
            ToolName = t.ToolName,
            CallCount = t.CallCount,
            SuccessCount = t.SuccessCount,
            FailureCount = t.FailureCount,
            SuccessRate = t.SuccessRate,
            PercentageOfTotal = totalCalls > 0 ? Math.Round(100.0 * t.CallCount / totalCalls, 2) : 0,
            FirstUsed = t.FirstUsed,
            LastUsed = t.LastUsed
        }).ToList();

        // Group action stats by tool and calculate percentages
        var toolActionStats = CalculateToolActionStats(toolUsageByAction, toolUsageByName);

        // Map error results
        var errorStats = topErrors.Select(e => new ToolErrorStats
        {
            ToolName = e.ToolName,
            ErrorType = e.ErrorType,
            ErrorMessage = e.ErrorMessage,
            OccurrenceCount = e.OccurrenceCount,
            FirstOccurrence = e.FirstOccurrence,
            LastOccurrence = e.LastOccurrence
        }).ToList();

        var response = new ToolCallAnalyticsResponse
        {
            TotalToolCalls = overallStats.TotalCalls,
            SuccessRate = overallStats.SuccessRate,
            AverageExecutionTimeMs = overallStats.AverageExecutionTimeMs,
            ToolUsageByName = toolUsageStats,
            ToolUsageByAction = toolActionStats,
            DailyToolCalls = dailyToolCalls,
            DailySuccessRates = dailySuccessRates,
            TopErrors = errorStats,
            HourlyDistribution = hourlyDistribution
        };

        _logger.LogInformation(
            "Tool call analytics retrieved. UserId: {UserId}, TotalCalls: {TotalCalls}, SuccessRate: {SuccessRate}%",
            userId, response.TotalToolCalls, response.SuccessRate);

        return response;
    }

    public async Task<List<ToolActionStats>> GetToolActionBreakdownAsync(
        string userId,
        ToolCallAnalyticsRequest? request = null)
    {
        _logger.LogInformation("Getting tool action breakdown. UserId: {UserId}", userId);

        var (startDate, endDate) = GetDateRange(request);

        var toolUsageByAction = await _repository.GetToolUsageByActionAsync(userId, startDate, endDate);
        var toolUsageByName = await _repository.GetToolUsageByNameAsync(userId, startDate, endDate);

        return CalculateToolActionStats(toolUsageByAction, toolUsageByName);
    }

    public async Task<List<ToolErrorStats>> GetTopErrorsAsync(
        string userId,
        int topN = 10,
        ToolCallAnalyticsRequest? request = null)
    {
        _logger.LogInformation("Getting top errors. UserId: {UserId}, TopN: {TopN}", userId, topN);

        var (startDate, endDate) = GetDateRange(request);

        var topErrors = await _repository.GetTopErrorsAsync(userId, topN, startDate, endDate);

        return topErrors.Select(e => new ToolErrorStats
        {
            ToolName = e.ToolName,
            ErrorType = e.ErrorType,
            ErrorMessage = e.ErrorMessage,
            OccurrenceCount = e.OccurrenceCount,
            FirstOccurrence = e.FirstOccurrence,
            LastOccurrence = e.LastOccurrence
        }).ToList();
    }

    #region Private Methods

    private static (DateTime? startDate, DateTime? endDate) GetDateRange(ToolCallAnalyticsRequest? request)
    {
        if (request == null)
        {
            // Default to last 30 days
            return (DateTime.UtcNow.AddDays(-30), DateTime.UtcNow);
        }

        if (request.StartDate.HasValue || request.EndDate.HasValue)
        {
            return (request.StartDate, request.EndDate);
        }

        // Use DaysBack parameter
        return (DateTime.UtcNow.AddDays(-request.DaysBack), DateTime.UtcNow);
    }

    private static List<ToolActionStats> CalculateToolActionStats(
        List<ToolUsageByActionResult> actionResults,
        List<ToolUsageByNameResult> nameResults)
    {
        // Create lookup for tool total counts
        var toolTotals = nameResults.ToDictionary(t => t.ToolName, t => t.CallCount);

        return actionResults.Select(a => new ToolActionStats
        {
            ToolName = a.ToolName,
            Action = a.Action,
            CallCount = a.CallCount,
            SuccessCount = a.SuccessCount,
            SuccessRate = a.SuccessRate,
            PercentageOfTool = toolTotals.TryGetValue(a.ToolName, out var total) && total > 0
                ? Math.Round(100.0 * a.CallCount / total, 2)
                : 0
        }).ToList();
    }

    #endregion
}
