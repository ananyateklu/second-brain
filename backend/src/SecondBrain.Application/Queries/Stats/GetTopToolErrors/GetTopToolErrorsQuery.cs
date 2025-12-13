using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Stats.GetTopToolErrors;

/// <summary>
/// Query to get top errors from failed tool calls
/// </summary>
public record GetTopToolErrorsQuery(
    string UserId,
    int TopN = 10,
    int DaysBack = 30
) : IRequest<Result<List<ToolErrorStats>>>;
