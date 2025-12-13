using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Application.Services.Git.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.MergeBranch;

public class MergeBranchCommandHandler : IRequestHandler<MergeBranchCommand, Result<GitOperationResult>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<MergeBranchCommandHandler> _logger;

    public MergeBranchCommandHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<MergeBranchCommandHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<GitOperationResult>> Handle(MergeBranchCommand request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<GitOperationResult>.Failure(authResult.Error!);
        }

        _logger.LogInformation("User {UserId} merging branch {BranchName} in {RepoPath}",
            request.UserId, request.BranchName, request.RepoPath);

        return await _gitService.MergeBranchAsync(authResult.Value!, request.BranchName, request.Message);
    }
}
