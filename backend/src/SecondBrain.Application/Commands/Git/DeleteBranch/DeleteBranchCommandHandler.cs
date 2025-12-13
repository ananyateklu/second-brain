using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.DeleteBranch;

public class DeleteBranchCommandHandler : IRequestHandler<DeleteBranchCommand, Result<bool>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<DeleteBranchCommandHandler> _logger;

    public DeleteBranchCommandHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<DeleteBranchCommandHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(DeleteBranchCommand request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<bool>.Failure(authResult.Error!);
        }

        _logger.LogInformation("User {UserId} deleting branch {BranchName} in {RepoPath}",
            request.UserId, request.BranchName, request.RepoPath);

        return await _gitService.DeleteBranchAsync(authResult.Value!, request.BranchName, request.Force);
    }
}
