using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.RagAnalytics.GetTopicStats;

/// <summary>
/// Handler for GetTopicStatsQuery
/// </summary>
public class GetTopicStatsQueryHandler : IRequestHandler<GetTopicStatsQuery, Result<TopicAnalyticsResponse>>
{
    private readonly ITopicClusteringService _clusteringService;
    private readonly IRagQueryLogRepository _repository;
    private readonly ILogger<GetTopicStatsQueryHandler> _logger;

    public GetTopicStatsQueryHandler(
        ITopicClusteringService clusteringService,
        IRagQueryLogRepository repository,
        ILogger<GetTopicStatsQueryHandler> logger)
    {
        _clusteringService = clusteringService;
        _repository = repository;
        _logger = logger;
    }

    public async Task<Result<TopicAnalyticsResponse>> Handle(
        GetTopicStatsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Retrieving topic stats. UserId: {UserId}", request.UserId);

        try
        {
            var stats = await _clusteringService.GetTopicStatsAsync(request.UserId, cancellationToken);
            var logs = await _repository.GetByUserIdAsync(request.UserId);
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

            return Result<TopicAnalyticsResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving topic stats. UserId: {UserId}", request.UserId);
            return Result<TopicAnalyticsResponse>.Failure(Error.Internal("Failed to retrieve topic statistics"));
        }
    }
}
