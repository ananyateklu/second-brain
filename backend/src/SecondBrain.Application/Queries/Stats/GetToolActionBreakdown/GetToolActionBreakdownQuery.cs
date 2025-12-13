using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Stats.GetToolActionBreakdown;

/// <summary>
/// Query to get tool usage breakdown by action type
/// </summary>
public record GetToolActionBreakdownQuery(
    string UserId,
    int DaysBack = 30,
    string? ToolName = null
) : IRequest<Result<List<ToolActionStats>>>;
