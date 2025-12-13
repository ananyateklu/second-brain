using MediatR;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.MergeBranch;

/// <summary>
/// Command to merge a branch into the current branch
/// </summary>
public record MergeBranchCommand(
    string RepoPath,
    string BranchName,
    string? Message,
    string UserId
) : IRequest<Result<GitOperationResult>>;
