using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Git.GetBranches;

public class GetBranchesQueryHandler : IRequestHandler<GetBranchesQuery, Result<List<GitBranch>>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<GetBranchesQueryHandler> _logger;

    public GetBranchesQueryHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<GetBranchesQueryHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<List<GitBranch>>> Handle(GetBranchesQuery request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<List<GitBranch>>.Failure(authResult.Error!);
        }

        _logger.LogDebug("User {UserId} getting branches for {RepoPath}", request.UserId, request.RepoPath);

        return await _gitService.GetBranchesAsync(authResult.Value!, request.IncludeRemote);
    }
}
