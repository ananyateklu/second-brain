using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Controller for RAG analytics, feedback collection, and observability
/// Based on best practices from production RAG systems for data-driven optimization
/// </summary>
[ApiController]
[Route("api/rag/analytics")]
[Produces("application/json")]
public class RagAnalyticsController : ControllerBase
{
    private readonly IRagAnalyticsService _analyticsService;
    private readonly ITopicClusteringService _clusteringService;
    private readonly IRagQueryLogRepository _repository;
    private readonly IChatRepository _chatRepository;
    private readonly ILogger<RagAnalyticsController> _logger;

    public RagAnalyticsController(
        IRagAnalyticsService analyticsService,
        ITopicClusteringService clusteringService,
        IRagQueryLogRepository repository,
        IChatRepository chatRepository,
        ILogger<RagAnalyticsController> logger)
    {
        _analyticsService = analyticsService;
        _clusteringService = clusteringService;
        _repository = repository;
        _chatRepository = chatRepository;
        _logger = logger;
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

        try
        {
            // Verify the log exists and belongs to the user
            var log = await _repository.GetByIdAsync(request.LogId);
            if (log == null)
            {
                return NotFound(new { error = $"RAG query log '{request.LogId}' not found" });
            }

            if (log.UserId != userId)
            {
                _logger.LogWarning(
                    "User attempted to submit feedback for another user's RAG query. UserId: {UserId}, LogId: {LogId}",
                    userId, request.LogId);
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
            }

            await _analyticsService.UpdateFeedbackAsync(
                request.LogId,
                request.Feedback,
                request.Category,
                request.Comment,
                cancellationToken);

            // Also update the chat message with the feedback for persistence across page reloads
            if (!string.IsNullOrEmpty(log.ConversationId))
            {
                var conversation = await _chatRepository.GetByIdAsync(log.ConversationId);
                if (conversation != null)
                {
                    // Find the message with this ragLogId and update its feedback
                    var message = conversation.Messages.FirstOrDefault(m => m.RagLogId == request.LogId.ToString());
                    if (message != null)
                    {
                        message.RagFeedback = request.Feedback;
                        await _chatRepository.UpdateAsync(log.ConversationId, conversation);
                        _logger.LogDebug("Updated chat message feedback. MessageId: {MessageId}", message.Id);
                    }
                }
            }

            _logger.LogInformation(
                "RAG feedback submitted. LogId: {LogId}, Feedback: {Feedback}, Category: {Category}",
                request.LogId, request.Feedback, request.Category);

            return Ok(new { success = true, message = "Feedback submitted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting RAG feedback. LogId: {LogId}", request.LogId);
            return StatusCode(500, new { error = "Failed to submit feedback" });
        }
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

        try
        {
            var effectiveSince = since ?? DateTime.UtcNow.AddDays(-30);
            var stats = await _analyticsService.GetPerformanceStatsAsync(userId, effectiveSince, cancellationToken);

            var response = new RagPerformanceStatsResponse
            {
                TotalQueries = stats.TotalQueries,
                QueriesWithFeedback = stats.QueriesWithFeedback,
                PositiveFeedback = stats.PositiveFeedback,
                NegativeFeedback = stats.NegativeFeedback,
                PositiveFeedbackRate = stats.PositiveFeedbackRate,
                AvgTotalTimeMs = stats.AvgTotalTimeMs,
                AvgRetrievedCount = stats.AvgRetrievedCount,
                AvgCosineScore = stats.AvgCosineScore,
                AvgRerankScore = stats.AvgRerankScore,
                CosineScoreCorrelation = stats.CosineScoreCorrelation,
                RerankScoreCorrelation = stats.RerankScoreCorrelation,
                PeriodStart = effectiveSince,
                PeriodEnd = DateTime.UtcNow
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving RAG performance stats. UserId: {UserId}", userId);
            return StatusCode(500, new { error = "Failed to retrieve performance statistics" });
        }
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

        // Validate pagination parameters
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        try
        {
            IEnumerable<Core.Entities.RagQueryLog> logs;
            
            if (feedbackOnly)
            {
                logs = await _repository.GetWithFeedbackAsync(userId, since);
            }
            else
            {
                logs = await _repository.GetByUserIdAsync(userId, since);
            }

            var logsList = logs.ToList();
            var totalCount = logsList.Count;
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var pagedLogs = logsList
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(MapToResponse)
                .ToList();

            return Ok(new RagQueryLogsResponse
            {
                Logs = pagedLogs,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving RAG query logs. UserId: {UserId}", userId);
            return StatusCode(500, new { error = "Failed to retrieve query logs" });
        }
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

        try
        {
            var log = await _repository.GetByIdAsync(id);

            if (log == null)
            {
                return NotFound(new { error = $"RAG query log '{id}' not found" });
            }

            if (log.UserId != userId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
            }

            return Ok(MapToResponse(log));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving RAG query log. LogId: {LogId}", id);
            return StatusCode(500, new { error = "Failed to retrieve query log" });
        }
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

        if (clusterCount < 2 || clusterCount > 20)
        {
            return BadRequest(new { error = "Cluster count must be between 2 and 20" });
        }

        try
        {
            _logger.LogInformation(
                "Starting topic clustering. UserId: {UserId}, ClusterCount: {Count}",
                userId, clusterCount);

            var result = await _clusteringService.ClusterQueriesAsync(
                userId, clusterCount, cancellationToken: cancellationToken);

            if (!result.Success)
            {
                return BadRequest(new { error = result.Error ?? "Clustering failed" });
            }

            return Ok(new
            {
                success = true,
                message = $"Successfully clustered {result.TotalProcessed} queries into {result.ClusterCount} topics",
                totalProcessed = result.TotalProcessed,
                clusterCount = result.ClusterCount,
                topicLabels = result.TopicLabels
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clustering queries. UserId: {UserId}", userId);
            return StatusCode(500, new { error = "Failed to cluster queries" });
        }
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

        try
        {
            var stats = await _clusteringService.GetTopicStatsAsync(userId, cancellationToken);
            var logs = await _repository.GetByUserIdAsync(userId);
            var logsList = logs.ToList();

            var response = new TopicAnalyticsResponse
            {
                Topics = stats.Select(s => new TopicStatsResponse
                {
                    ClusterId = s.ClusterId,
                    Label = s.Label,
                    QueryCount = s.QueryCount,
                    PositiveFeedback = s.PositiveFeedback,
                    NegativeFeedback = s.NegativeFeedback,
                    PositiveFeedbackRate = s.PositiveFeedbackRate,
                    AvgCosineScore = s.AvgCosineScore,
                    AvgRerankScore = s.AvgRerankScore,
                    SampleQueries = s.SampleQueries
                }).ToList(),
                TotalClustered = logsList.Count(l => l.TopicCluster.HasValue),
                TotalUnclustered = logsList.Count(l => !l.TopicCluster.HasValue),
                LastClusteredAt = logsList
                    .Where(l => l.TopicCluster.HasValue)
                    .Select(l => l.CreatedAt)
                    .DefaultIfEmpty()
                    .Max()
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving topic stats. UserId: {UserId}", userId);
            return StatusCode(500, new { error = "Failed to retrieve topic statistics" });
        }
    }

    private static RagQueryLogResponse MapToResponse(Core.Entities.RagQueryLog log)
    {
        return new RagQueryLogResponse
        {
            Id = log.Id,
            Query = log.Query,
            ConversationId = log.ConversationId,
            CreatedAt = log.CreatedAt,
            TotalTimeMs = log.TotalTimeMs,
            QueryEmbeddingTimeMs = log.QueryEmbeddingTimeMs,
            VectorSearchTimeMs = log.VectorSearchTimeMs,
            RerankTimeMs = log.RerankTimeMs,
            RetrievedCount = log.RetrievedCount,
            FinalCount = log.FinalCount,
            TopCosineScore = log.TopCosineScore,
            AvgCosineScore = log.AvgCosineScore,
            TopRerankScore = log.TopRerankScore,
            AvgRerankScore = log.AvgRerankScore,
            HybridSearchEnabled = log.HybridSearchEnabled,
            HyDEEnabled = log.HyDEEnabled,
            MultiQueryEnabled = log.MultiQueryEnabled,
            RerankingEnabled = log.RerankingEnabled,
            UserFeedback = log.UserFeedback,
            FeedbackCategory = log.FeedbackCategory,
            FeedbackComment = log.FeedbackComment,
            TopicCluster = log.TopicCluster,
            TopicLabel = log.TopicLabel
        };
    }
}

