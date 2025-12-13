using MediatR;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.PublishBranch;

/// <summary>
/// Command to publish a local branch to the remote repository
/// </summary>
public record PublishBranchCommand(
    string RepoPath,
    string BranchName,
    string? Remote,
    string UserId
) : IRequest<Result<GitOperationResult>>;
