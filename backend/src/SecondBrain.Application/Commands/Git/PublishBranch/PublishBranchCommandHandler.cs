using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.PublishBranch;

public class PublishBranchCommandHandler : IRequestHandler<PublishBranchCommand, Result<GitOperationResult>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<PublishBranchCommandHandler> _logger;

    public PublishBranchCommandHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<PublishBranchCommandHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<GitOperationResult>> Handle(PublishBranchCommand request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<GitOperationResult>.Failure(authResult.Error!);
        }

        _logger.LogInformation("User {UserId} publishing branch {BranchName} in {RepoPath}",
            request.UserId, request.BranchName, request.RepoPath);

        return await _gitService.PublishBranchAsync(authResult.Value!, request.BranchName, request.Remote);
    }
}
