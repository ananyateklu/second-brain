using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.RagAnalytics.GetQueryLogs;

/// <summary>
/// Handler for GetQueryLogsQuery
/// </summary>
public class GetQueryLogsQueryHandler : IRequestHandler<GetQueryLogsQuery, Result<RagQueryLogsResponse>>
{
    private readonly IRagQueryLogRepository _repository;
    private readonly ILogger<GetQueryLogsQueryHandler> _logger;

    public GetQueryLogsQueryHandler(
        IRagQueryLogRepository repository,
        ILogger<GetQueryLogsQueryHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<Result<RagQueryLogsResponse>> Handle(
        GetQueryLogsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Retrieving RAG query logs. UserId: {UserId}, Page: {Page}, PageSize: {PageSize}",
            request.UserId, request.Page, request.PageSize);

        try
        {
            // Validate pagination parameters
            var page = Math.Max(1, request.Page);
            var pageSize = Math.Clamp(request.PageSize, 1, 100);

            IEnumerable<RagQueryLog> logs;

            if (request.FeedbackOnly)
            {
                logs = await _repository.GetWithFeedbackAsync(request.UserId, request.Since);
            }
            else
            {
                logs = await _repository.GetByUserIdAsync(request.UserId, request.Since);
            }

            var logsList = logs.ToList();
            var totalCount = logsList.Count;
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var pagedLogs = logsList
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(MapToResponse)
                .ToList();

            return Result<RagQueryLogsResponse>.Success(new RagQueryLogsResponse
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
            _logger.LogError(ex, "Error retrieving RAG query logs. UserId: {UserId}", request.UserId);
            return Result<RagQueryLogsResponse>.Failure(Error.Internal("Failed to retrieve query logs"));
        }
    }

    private static RagQueryLogResponse MapToResponse(RagQueryLog log)
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
