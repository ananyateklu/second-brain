using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.Commit;

/// <summary>
/// Command to create a commit with staged changes
/// </summary>
public record CommitCommand(
    string RepoPath,
    string Message,
    string UserId
) : IRequest<Result<string>>;
