using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.RagAnalytics.GetPerformanceStats;

/// <summary>
/// Handler for GetPerformanceStatsQuery
/// </summary>
public class GetPerformanceStatsQueryHandler : IRequestHandler<GetPerformanceStatsQuery, Result<RagPerformanceStatsResponse>>
{
    private readonly IRagAnalyticsService _analyticsService;
    private readonly ILogger<GetPerformanceStatsQueryHandler> _logger;

    public GetPerformanceStatsQueryHandler(
        IRagAnalyticsService analyticsService,
        ILogger<GetPerformanceStatsQueryHandler> logger)
    {
        _analyticsService = analyticsService;
        _logger = logger;
    }

    public async Task<Result<RagPerformanceStatsResponse>> Handle(
        GetPerformanceStatsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Retrieving RAG performance stats. UserId: {UserId}", request.UserId);

        try
        {
            var effectiveSince = request.Since ?? DateTime.UtcNow.AddDays(-30);
            var stats = await _analyticsService.GetPerformanceStatsAsync(request.UserId, effectiveSince, cancellationToken);

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

            return Result<RagPerformanceStatsResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving RAG performance stats. UserId: {UserId}", request.UserId);
            return Result<RagPerformanceStatsResponse>.Failure(Error.Internal("Failed to retrieve performance statistics"));
        }
    }
}
