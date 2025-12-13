using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Git.ValidateRepository;

public class ValidateRepositoryQueryHandler : IRequestHandler<ValidateRepositoryQuery, Result<bool>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<ValidateRepositoryQueryHandler> _logger;

    public ValidateRepositoryQueryHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<ValidateRepositoryQueryHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(ValidateRepositoryQuery request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<bool>.Failure(authResult.Error!);
        }

        _logger.LogDebug("User {UserId} validating repository at {RepoPath}", request.UserId, request.RepoPath);

        return await _gitService.ValidateRepositoryAsync(authResult.Value!);
    }
}
