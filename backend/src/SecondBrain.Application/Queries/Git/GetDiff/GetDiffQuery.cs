using MediatR;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Git.GetDiff;

/// <summary>
/// Query to get the diff for a specific file in a Git repository
/// </summary>
public record GetDiffQuery(
    string RepoPath,
    string FilePath,
    bool Staged,
    string UserId
) : IRequest<Result<GitDiffResult>>;
