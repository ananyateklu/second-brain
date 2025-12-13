using MediatR;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.Push;

/// <summary>
/// Command to push commits to the remote repository
/// </summary>
public record PushCommand(
    string RepoPath,
    string? Remote,
    string? Branch,
    string UserId
) : IRequest<Result<GitOperationResult>>;
