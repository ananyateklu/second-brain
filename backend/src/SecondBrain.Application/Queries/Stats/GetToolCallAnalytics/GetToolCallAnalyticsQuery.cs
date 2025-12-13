using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Stats.GetToolCallAnalytics;

/// <summary>
/// Query to get comprehensive tool call analytics
/// </summary>
public record GetToolCallAnalyticsQuery(
    string UserId,
    int DaysBack = 30,
    DateTime? StartDate = null,
    DateTime? EndDate = null
) : IRequest<Result<ToolCallAnalyticsResponse>>;
