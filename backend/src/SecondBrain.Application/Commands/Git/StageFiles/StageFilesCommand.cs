using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.StageFiles;

/// <summary>
/// Command to stage files for commit
/// </summary>
public record StageFilesCommand(
    string RepoPath,
    string[] Files,
    string UserId
) : IRequest<Result<bool>>;
