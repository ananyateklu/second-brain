using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.DeleteBranch;

/// <summary>
/// Command to delete a branch
/// </summary>
public record DeleteBranchCommand(
    string RepoPath,
    string BranchName,
    bool Force,
    string UserId
) : IRequest<Result<bool>>;
