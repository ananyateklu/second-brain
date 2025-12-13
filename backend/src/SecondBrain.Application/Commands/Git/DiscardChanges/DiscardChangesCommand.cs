using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.DiscardChanges;

/// <summary>
/// Command to discard changes to a file (restore to last committed state)
/// </summary>
public record DiscardChangesCommand(
    string RepoPath,
    string FilePath,
    string UserId
) : IRequest<Result<bool>>;
