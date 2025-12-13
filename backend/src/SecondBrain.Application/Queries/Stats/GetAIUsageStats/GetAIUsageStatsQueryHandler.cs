using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Stats;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Stats.GetAIUsageStats;

/// <summary>
/// Handler for GetAIUsageStatsQuery
/// </summary>
public class GetAIUsageStatsQueryHandler : IRequestHandler<GetAIUsageStatsQuery, Result<AIUsageStatsResponse>>
{
    private readonly IStatsService _statsService;
    private readonly ILogger<GetAIUsageStatsQueryHandler> _logger;

    public GetAIUsageStatsQueryHandler(
        IStatsService statsService,
        ILogger<GetAIUsageStatsQueryHandler> logger)
    {
        _statsService = statsService;
        _logger = logger;
    }

    public async Task<Result<AIUsageStatsResponse>> Handle(
        GetAIUsageStatsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Retrieving AI usage stats for user. UserId: {UserId}", request.UserId);

        try
        {
            var stats = await _statsService.GetAIUsageStatsAsync(request.UserId);
            return Result<AIUsageStatsResponse>.Success(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving AI usage stats. UserId: {UserId}", request.UserId);
            return Result<AIUsageStatsResponse>.Failure(Error.Internal("Failed to retrieve AI usage stats"));
        }
    }
}
