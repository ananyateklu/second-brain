using MediatR;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Git.GetStatus;

/// <summary>
/// Query to get the current status of a Git repository
/// </summary>
public record GetStatusQuery(
    string RepoPath,
    string UserId
) : IRequest<Result<GitStatus>>;
