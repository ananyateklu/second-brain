using MediatR;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.Pull;

/// <summary>
/// Command to pull changes from the remote repository
/// </summary>
public record PullCommand(
    string RepoPath,
    string? Remote,
    string? Branch,
    string UserId
) : IRequest<Result<GitOperationResult>>;
