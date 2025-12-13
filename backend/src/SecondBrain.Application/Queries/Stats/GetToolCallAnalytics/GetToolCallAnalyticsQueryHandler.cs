using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Stats;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Stats.GetToolCallAnalytics;

/// <summary>
/// Handler for GetToolCallAnalyticsQuery
/// </summary>
public class GetToolCallAnalyticsQueryHandler : IRequestHandler<GetToolCallAnalyticsQuery, Result<ToolCallAnalyticsResponse>>
{
    private readonly IToolCallAnalyticsService _toolCallAnalyticsService;
    private readonly ILogger<GetToolCallAnalyticsQueryHandler> _logger;

    public GetToolCallAnalyticsQueryHandler(
        IToolCallAnalyticsService toolCallAnalyticsService,
        ILogger<GetToolCallAnalyticsQueryHandler> logger)
    {
        _toolCallAnalyticsService = toolCallAnalyticsService;
        _logger = logger;
    }

    public async Task<Result<ToolCallAnalyticsResponse>> Handle(
        GetToolCallAnalyticsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Retrieving tool call analytics. UserId: {UserId}, DaysBack: {DaysBack}",
            request.UserId, request.DaysBack);

        try
        {
            var analyticsRequest = new ToolCallAnalyticsRequest
            {
                DaysBack = request.DaysBack,
                StartDate = request.StartDate,
                EndDate = request.EndDate
            };

            var analytics = await _toolCallAnalyticsService.GetToolCallAnalyticsAsync(
                request.UserId, analyticsRequest);

            return Result<ToolCallAnalyticsResponse>.Success(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tool call analytics. UserId: {UserId}", request.UserId);
            return Result<ToolCallAnalyticsResponse>.Failure(Error.Internal("Failed to retrieve tool call analytics"));
        }
    }
}
