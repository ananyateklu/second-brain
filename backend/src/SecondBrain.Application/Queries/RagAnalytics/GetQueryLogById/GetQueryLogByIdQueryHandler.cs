using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.RagAnalytics.GetQueryLogById;

/// <summary>
/// Handler for GetQueryLogByIdQuery
/// </summary>
public class GetQueryLogByIdQueryHandler : IRequestHandler<GetQueryLogByIdQuery, Result<RagQueryLogResponse>>
{
    private readonly IRagQueryLogRepository _repository;
    private readonly ILogger<GetQueryLogByIdQueryHandler> _logger;

    public GetQueryLogByIdQueryHandler(
        IRagQueryLogRepository repository,
        ILogger<GetQueryLogByIdQueryHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<Result<RagQueryLogResponse>> Handle(
        GetQueryLogByIdQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Retrieving RAG query log. LogId: {LogId}, UserId: {UserId}",
            request.LogId, request.UserId);

        try
        {
            var log = await _repository.GetByIdAsync(request.LogId);

            if (log == null)
            {
                return Result<RagQueryLogResponse>.Failure(Error.NotFound($"RAG query log '{request.LogId}' not found"));
            }

            if (log.UserId != request.UserId)
            {
                return Result<RagQueryLogResponse>.Failure(Error.Custom("Forbidden", "Access denied"));
            }

            return Result<RagQueryLogResponse>.Success(new RagQueryLogResponse
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
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving RAG query log. LogId: {LogId}", request.LogId);
            return Result<RagQueryLogResponse>.Failure(Error.Internal("Failed to retrieve query log"));
        }
    }
}
