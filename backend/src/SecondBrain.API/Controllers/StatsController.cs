using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Stats;
using SecondBrain.Application.Services;

namespace SecondBrain.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
//[Authorize] // Assuming we want auth, but based on other controllers I see ApiKeyAuth might be used or handled globally
public class StatsController : ControllerBase
{
    private readonly IStatsService _statsService;
    private readonly IToolCallAnalyticsService _toolCallAnalyticsService;

    public StatsController(
        IStatsService statsService,
        IToolCallAnalyticsService toolCallAnalyticsService)
    {
        _statsService = statsService;
        _toolCallAnalyticsService = toolCallAnalyticsService;
    }

    [HttpGet("ai")]
    public async Task<ActionResult<AIUsageStatsResponse>> GetAIUsageStats()
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var stats = await _statsService.GetAIUsageStatsAsync(userId);
        return Ok(stats);
    }

    /// <summary>
    /// Gets comprehensive tool call analytics for the authenticated user.
    /// Uses PostgreSQL 18 JSON_TABLE for efficient JSONB analysis.
    /// </summary>
    /// <param name="daysBack">Number of days to look back (default: 30)</param>
    /// <param name="startDate">Optional start date for custom range</param>
    /// <param name="endDate">Optional end date for custom range</param>
    /// <returns>Complete tool call analytics including usage, success rates, and errors</returns>
    [HttpGet("tools")]
    public async Task<ActionResult<ToolCallAnalyticsResponse>> GetToolCallAnalytics(
        [FromQuery] int daysBack = 30,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var request = new ToolCallAnalyticsRequest
        {
            DaysBack = daysBack,
            StartDate = startDate,
            EndDate = endDate
        };

        var analytics = await _toolCallAnalyticsService.GetToolCallAnalyticsAsync(userId, request);
        return Ok(analytics);
    }

    /// <summary>
    /// Gets tool usage breakdown by action type.
    /// Extracts action from arguments JSONB using PostgreSQL 18 JSON_TABLE.
    /// </summary>
    /// <param name="daysBack">Number of days to look back (default: 30)</param>
    /// <param name="toolName">Optional filter by specific tool name</param>
    /// <returns>List of tool action statistics</returns>
    [HttpGet("tools/actions")]
    public async Task<ActionResult<List<ToolActionStats>>> GetToolActionBreakdown(
        [FromQuery] int daysBack = 30,
        [FromQuery] string? toolName = null)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var request = new ToolCallAnalyticsRequest
        {
            DaysBack = daysBack,
            ToolName = toolName
        };

        var actions = await _toolCallAnalyticsService.GetToolActionBreakdownAsync(userId, request);
        return Ok(actions);
    }

    /// <summary>
    /// Gets top errors from failed tool calls.
    /// Extracts error details from result JSONB using PostgreSQL 18 JSON_TABLE.
    /// </summary>
    /// <param name="topN">Number of top errors to return (default: 10)</param>
    /// <param name="daysBack">Number of days to look back (default: 30)</param>
    /// <returns>List of top error statistics</returns>
    [HttpGet("tools/errors")]
    public async Task<ActionResult<List<ToolErrorStats>>> GetTopToolErrors(
        [FromQuery] int topN = 10,
        [FromQuery] int daysBack = 30)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var request = new ToolCallAnalyticsRequest
        {
            DaysBack = daysBack
        };

        var errors = await _toolCallAnalyticsService.GetTopErrorsAsync(userId, topN, request);
        return Ok(errors);
    }
}

