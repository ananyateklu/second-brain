using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using SecondBrain.API.Extensions;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.Stats.GetAIUsageStats;
using SecondBrain.Application.Queries.Stats.GetToolActionBreakdown;
using SecondBrain.Application.Queries.Stats.GetToolCallAnalytics;
using SecondBrain.Application.Queries.Stats.GetTopToolErrors;

namespace SecondBrain.API.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
public class StatsController : ControllerBase
{
    private readonly IMediator _mediator;

    public StatsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("ai")]
    [OutputCache(PolicyName = "Stats")]
    public async Task<ActionResult<AIUsageStatsResponse>> GetAIUsageStats(CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetAIUsageStatsQuery(userId);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Gets comprehensive tool call analytics for the authenticated user.
    /// Uses PostgreSQL 18 JSON_TABLE for efficient JSONB analysis.
    /// </summary>
    /// <param name="daysBack">Number of days to look back (default: 30)</param>
    /// <param name="startDate">Optional start date for custom range</param>
    /// <param name="endDate">Optional end date for custom range</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Complete tool call analytics including usage, success rates, and errors</returns>
    [HttpGet("tools")]
    [OutputCache(PolicyName = "Stats")]
    public async Task<ActionResult<ToolCallAnalyticsResponse>> GetToolCallAnalytics(
        [FromQuery] int daysBack = 30,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetToolCallAnalyticsQuery(userId, daysBack, startDate, endDate);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Gets tool usage breakdown by action type.
    /// Extracts action from arguments JSONB using PostgreSQL 18 JSON_TABLE.
    /// </summary>
    /// <param name="daysBack">Number of days to look back (default: 30)</param>
    /// <param name="toolName">Optional filter by specific tool name</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of tool action statistics</returns>
    [HttpGet("tools/actions")]
    [OutputCache(PolicyName = "Stats")]
    public async Task<ActionResult<List<ToolActionStats>>> GetToolActionBreakdown(
        [FromQuery] int daysBack = 30,
        [FromQuery] string? toolName = null,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetToolActionBreakdownQuery(userId, daysBack, toolName);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Gets top errors from failed tool calls.
    /// Extracts error details from result JSONB using PostgreSQL 18 JSON_TABLE.
    /// </summary>
    /// <param name="topN">Number of top errors to return (default: 10)</param>
    /// <param name="daysBack">Number of days to look back (default: 30)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of top error statistics</returns>
    [HttpGet("tools/errors")]
    [OutputCache(PolicyName = "Stats")]
    public async Task<ActionResult<List<ToolErrorStats>>> GetTopToolErrors(
        [FromQuery] int topN = 10,
        [FromQuery] int daysBack = 30,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetTopToolErrorsQuery(userId, topN, daysBack);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }
}
