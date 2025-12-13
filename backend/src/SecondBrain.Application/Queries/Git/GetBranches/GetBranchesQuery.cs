using MediatR;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Git.GetBranches;

/// <summary>
/// Query to get all branches in a Git repository
/// </summary>
public record GetBranchesQuery(
    string RepoPath,
    bool IncludeRemote,
    string UserId
) : IRequest<Result<List<GitBranch>>>;
