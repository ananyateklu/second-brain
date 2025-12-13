using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.RagAnalytics.GetPerformanceStats;

/// <summary>
/// Query to get RAG performance statistics for a user
/// </summary>
public record GetPerformanceStatsQuery(
    string UserId,
    DateTime? Since = null
) : IRequest<Result<RagPerformanceStatsResponse>>;
