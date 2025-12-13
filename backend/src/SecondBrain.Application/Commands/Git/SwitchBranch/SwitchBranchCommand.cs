using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.SwitchBranch;

/// <summary>
/// Command to switch to a different branch
/// </summary>
public record SwitchBranchCommand(
    string RepoPath,
    string BranchName,
    string UserId
) : IRequest<Result<bool>>;
