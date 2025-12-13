using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Stats.GetAIUsageStats;

/// <summary>
/// Query to get AI usage statistics for a user
/// </summary>
public record GetAIUsageStatsQuery(string UserId) : IRequest<Result<AIUsageStatsResponse>>;
