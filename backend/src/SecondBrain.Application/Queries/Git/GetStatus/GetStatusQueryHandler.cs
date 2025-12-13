using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Git.GetStatus;

public class GetStatusQueryHandler : IRequestHandler<GetStatusQuery, Result<GitStatus>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<GetStatusQueryHandler> _logger;

    public GetStatusQueryHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<GetStatusQueryHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<GitStatus>> Handle(GetStatusQuery request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<GitStatus>.Failure(authResult.Error!);
        }

        _logger.LogDebug("User {UserId} getting status for {RepoPath}", request.UserId, request.RepoPath);

        return await _gitService.GetStatusAsync(authResult.Value!);
    }
}
