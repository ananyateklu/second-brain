using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Git.GetDiff;

public class GetDiffQueryHandler : IRequestHandler<GetDiffQuery, Result<GitDiffResult>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<GetDiffQueryHandler> _logger;

    public GetDiffQueryHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<GetDiffQueryHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<GitDiffResult>> Handle(GetDiffQuery request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<GitDiffResult>.Failure(authResult.Error!);
        }

        _logger.LogDebug("User {UserId} getting diff for {FilePath} (staged: {Staged}) in {RepoPath}",
            request.UserId, request.FilePath, request.Staged, request.RepoPath);

        return await _gitService.GetDiffAsync(authResult.Value!, request.FilePath, request.Staged);
    }
}
