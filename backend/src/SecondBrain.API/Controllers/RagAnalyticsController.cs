using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.API.Extensions;
using SecondBrain.Application.Commands.RagAnalytics.ClusterQueries;
using SecondBrain.Application.Commands.RagAnalytics.SubmitFeedback;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.RagAnalytics.GetPerformanceStats;
using SecondBrain.Application.Queries.RagAnalytics.GetQueryLogById;
using SecondBrain.Application.Queries.RagAnalytics.GetQueryLogs;
using SecondBrain.Application.Queries.RagAnalytics.GetTopicStats;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Controller for RAG analytics, feedback collection, and observability
/// Based on best practices from production RAG systems for data-driven optimization
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/rag/analytics")]
[Route("api/v{version:apiVersion}/rag/analytics")]
[Produces("application/json")]
public class RagAnalyticsController : ControllerBase
{
    private readonly IMediator _mediator;

    public RagAnalyticsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Submit feedback for a RAG query response
    /// This is critical for correlating retrieval metrics with user satisfaction
    /// </summary>
    /// <param name="request">Feedback details including logId, feedback type, and optional category</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Success status</returns>
    [HttpPost("feedback")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SubmitFeedback(
        [FromBody] RagFeedbackRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new SubmitFeedbackCommand(
            userId,
            request.LogId,
            request.Feedback,
            request.Category,
            request.Comment);

        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<IActionResult>(
            onSuccess: _ => Ok(new { success = true, message = "Feedback submitted successfully" }),
            onFailure: error => error.Code switch
            {
                "NotFound" => NotFound(new { error = error.Message }),
                "Forbidden" => StatusCode(StatusCodes.Status403Forbidden, new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Get aggregated RAG performance statistics for the current user
    /// Use this to analyze correlation between scores and user satisfaction
    /// </summary>
    /// <param name="since">Optional start date for statistics (defaults to last 30 days)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Performance statistics including feedback correlations</returns>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(RagPerformanceStatsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<RagPerformanceStatsResponse>> GetPerformanceStats(
        [FromQuery] DateTime? since = null,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetPerformanceStatsQuery(userId, since);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Get paginated RAG query logs for the analytics dashboard
    /// </summary>
    /// <param name="page">Page number (1-based)</param>
    /// <param name="pageSize">Number of items per page (max 100)</param>
    /// <param name="since">Optional start date filter</param>
    /// <param name="feedbackOnly">If true, only return queries with feedback</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Paginated list of RAG query logs</returns>
    [HttpGet("logs")]
    [ProducesResponseType(typeof(RagQueryLogsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<RagQueryLogsResponse>> GetQueryLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] DateTime? since = null,
        [FromQuery] bool feedbackOnly = false,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetQueryLogsQuery(userId, page, pageSize, since, feedbackOnly);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Get a single RAG query log by ID
    /// </summary>
    /// <param name="id">The log ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The RAG query log details</returns>
    [HttpGet("logs/{id:guid}")]
    [ProducesResponseType(typeof(RagQueryLogResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RagQueryLogResponse>> GetQueryLog(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetQueryLogByIdQuery(userId, id);
        var result = await _mediator.Send(query, cancellationToken);

        return result.Match<ActionResult<RagQueryLogResponse>>(
            onSuccess: log => Ok(log),
            onFailure: error => error.Code switch
            {
                "NotFound" => NotFound(new { error = error.Message }),
                "Forbidden" => StatusCode(StatusCodes.Status403Forbidden, new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Run topic clustering on recent queries to identify patterns
    /// </summary>
    /// <param name="clusterCount">Number of clusters to create (default 5)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Clustering result with topic labels</returns>
    [HttpPost("cluster")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ClusterQueries(
        [FromQuery] int clusterCount = 5,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new ClusterQueriesCommand(userId, clusterCount);
        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<IActionResult>(
            onSuccess: clusterResult => Ok(new
            {
                success = true,
                message = $"Successfully clustered {clusterResult.TotalProcessed} queries into {clusterResult.ClusterCount} topics",
                totalProcessed = clusterResult.TotalProcessed,
                clusterCount = clusterResult.ClusterCount,
                topicLabels = clusterResult.TopicLabels
            }),
            onFailure: error => error.Code switch
            {
                "Validation" => BadRequest(new { error = error.Message }),
                "ClusteringFailed" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Get topic statistics for identifying problem areas
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Statistics for each topic cluster</returns>
    [HttpGet("topics")]
    [ProducesResponseType(typeof(TopicAnalyticsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<TopicAnalyticsResponse>> GetTopicStats(
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetTopicStatsQuery(userId);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }
}
