using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Focus.GetBacklog;

/// <summary>
/// Query to retrieve backlog items (not scheduled, not completed) for a user.
/// Optionally filtered by priority level.
/// </summary>
/// <param name="UserId">The user ID to get the backlog for</param>
/// <param name="Priority">Optional priority filter (1=P1/High, 2=P2/Medium, 3=P3/Low)</param>
public record GetBacklogQuery(
    string UserId,
    int? Priority = null) : IRequest<Result<BacklogResponse>>;
