using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Stats;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Stats.GetToolActionBreakdown;

/// <summary>
/// Handler for GetToolActionBreakdownQuery
/// </summary>
public class GetToolActionBreakdownQueryHandler : IRequestHandler<GetToolActionBreakdownQuery, Result<List<ToolActionStats>>>
{
    private readonly IToolCallAnalyticsService _toolCallAnalyticsService;
    private readonly ILogger<GetToolActionBreakdownQueryHandler> _logger;

    public GetToolActionBreakdownQueryHandler(
        IToolCallAnalyticsService toolCallAnalyticsService,
        ILogger<GetToolActionBreakdownQueryHandler> logger)
    {
        _toolCallAnalyticsService = toolCallAnalyticsService;
        _logger = logger;
    }

    public async Task<Result<List<ToolActionStats>>> Handle(
        GetToolActionBreakdownQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Retrieving tool action breakdown. UserId: {UserId}, DaysBack: {DaysBack}, ToolName: {ToolName}",
            request.UserId, request.DaysBack, request.ToolName);

        try
        {
            var analyticsRequest = new ToolCallAnalyticsRequest
            {
                DaysBack = request.DaysBack,
                ToolName = request.ToolName
            };

            var actions = await _toolCallAnalyticsService.GetToolActionBreakdownAsync(
                request.UserId, analyticsRequest);

            return Result<List<ToolActionStats>>.Success(actions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tool action breakdown. UserId: {UserId}", request.UserId);
            return Result<List<ToolActionStats>>.Failure(Error.Internal("Failed to retrieve tool action breakdown"));
        }
    }
}
