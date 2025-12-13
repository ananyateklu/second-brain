using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Git.GetLog;

public class GetLogQueryHandler : IRequestHandler<GetLogQuery, Result<List<GitLogEntry>>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<GetLogQueryHandler> _logger;

    public GetLogQueryHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<GetLogQueryHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<List<GitLogEntry>>> Handle(GetLogQuery request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<List<GitLogEntry>>.Failure(authResult.Error!);
        }

        _logger.LogDebug("User {UserId} getting log for {RepoPath}", request.UserId, request.RepoPath);

        return await _gitService.GetLogAsync(authResult.Value!, request.Count);
    }
}
