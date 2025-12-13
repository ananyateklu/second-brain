using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Stats;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Stats.GetTopToolErrors;

/// <summary>
/// Handler for GetTopToolErrorsQuery
/// </summary>
public class GetTopToolErrorsQueryHandler : IRequestHandler<GetTopToolErrorsQuery, Result<List<ToolErrorStats>>>
{
    private readonly IToolCallAnalyticsService _toolCallAnalyticsService;
    private readonly ILogger<GetTopToolErrorsQueryHandler> _logger;

    public GetTopToolErrorsQueryHandler(
        IToolCallAnalyticsService toolCallAnalyticsService,
        ILogger<GetTopToolErrorsQueryHandler> logger)
    {
        _toolCallAnalyticsService = toolCallAnalyticsService;
        _logger = logger;
    }

    public async Task<Result<List<ToolErrorStats>>> Handle(
        GetTopToolErrorsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Retrieving top tool errors. UserId: {UserId}, TopN: {TopN}, DaysBack: {DaysBack}",
            request.UserId, request.TopN, request.DaysBack);

        try
        {
            var analyticsRequest = new ToolCallAnalyticsRequest
            {
                DaysBack = request.DaysBack
            };

            var errors = await _toolCallAnalyticsService.GetTopErrorsAsync(
                request.UserId, request.TopN, analyticsRequest);

            return Result<List<ToolErrorStats>>.Success(errors);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving top tool errors. UserId: {UserId}", request.UserId);
            return Result<List<ToolErrorStats>>.Failure(Error.Internal("Failed to retrieve top tool errors"));
        }
    }
}
