using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.CreateBranch;

/// <summary>
/// Command to create a new branch
/// </summary>
public record CreateBranchCommand(
    string RepoPath,
    string BranchName,
    bool SwitchToNewBranch,
    string? BaseBranch,
    string UserId
) : IRequest<Result<bool>>;
