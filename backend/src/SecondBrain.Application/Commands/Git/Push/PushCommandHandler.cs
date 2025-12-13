using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.Push;

public class PushCommandHandler : IRequestHandler<PushCommand, Result<GitOperationResult>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<PushCommandHandler> _logger;

    public PushCommandHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<PushCommandHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<GitOperationResult>> Handle(PushCommand request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<GitOperationResult>.Failure(authResult.Error!);
        }

        _logger.LogInformation("User {UserId} pushing in {RepoPath}", request.UserId, request.RepoPath);

        return await _gitService.PushAsync(authResult.Value!, request.Remote, request.Branch);
    }
}
