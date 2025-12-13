using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.CreateBranch;

public class CreateBranchCommandHandler : IRequestHandler<CreateBranchCommand, Result<bool>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<CreateBranchCommandHandler> _logger;

    public CreateBranchCommandHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<CreateBranchCommandHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(CreateBranchCommand request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<bool>.Failure(authResult.Error!);
        }

        _logger.LogInformation("User {UserId} creating branch {BranchName} in {RepoPath}",
            request.UserId, request.BranchName, request.RepoPath);

        return await _gitService.CreateBranchAsync(
            authResult.Value!,
            request.BranchName,
            request.SwitchToNewBranch,
            request.BaseBranch);
    }
}
