using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Git.ValidateRepository;

/// <summary>
/// Query to validate if a path is a valid Git repository
/// </summary>
public record ValidateRepositoryQuery(
    string RepoPath,
    string UserId
) : IRequest<Result<bool>>;
