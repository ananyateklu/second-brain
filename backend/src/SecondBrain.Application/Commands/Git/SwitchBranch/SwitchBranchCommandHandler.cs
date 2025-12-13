using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.SwitchBranch;

public class SwitchBranchCommandHandler : IRequestHandler<SwitchBranchCommand, Result<bool>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<SwitchBranchCommandHandler> _logger;

    public SwitchBranchCommandHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<SwitchBranchCommandHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(SwitchBranchCommand request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<bool>.Failure(authResult.Error!);
        }

        _logger.LogInformation("User {UserId} switching to branch {BranchName} in {RepoPath}",
            request.UserId, request.BranchName, request.RepoPath);

        return await _gitService.SwitchBranchAsync(authResult.Value!, request.BranchName);
    }
}
