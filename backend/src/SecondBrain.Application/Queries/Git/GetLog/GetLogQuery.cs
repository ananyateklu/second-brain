using MediatR;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Git.GetLog;

/// <summary>
/// Query to get the commit log for a Git repository
/// </summary>
public record GetLogQuery(
    string RepoPath,
    int Count,
    string UserId
) : IRequest<Result<List<GitLogEntry>>>;
