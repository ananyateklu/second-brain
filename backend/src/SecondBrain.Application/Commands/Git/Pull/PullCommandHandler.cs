using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.Pull;

public class PullCommandHandler : IRequestHandler<PullCommand, Result<GitOperationResult>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<PullCommandHandler> _logger;

    public PullCommandHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<PullCommandHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<GitOperationResult>> Handle(PullCommand request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<GitOperationResult>.Failure(authResult.Error!);
        }

        _logger.LogInformation("User {UserId} pulling in {RepoPath}", request.UserId, request.RepoPath);

        return await _gitService.PullAsync(authResult.Value!, request.Remote, request.Branch);
    }
}
