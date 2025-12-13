using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.RagAnalytics.GetTopicStats;

/// <summary>
/// Query to get topic statistics for identifying problem areas
/// </summary>
public record GetTopicStatsQuery(
    string UserId
) : IRequest<Result<TopicAnalyticsResponse>>;
