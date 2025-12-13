using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.UnstageFiles;

/// <summary>
/// Command to unstage files from the staging area
/// </summary>
public record UnstageFilesCommand(
    string RepoPath,
    string[] Files,
    string UserId
) : IRequest<Result<bool>>;
