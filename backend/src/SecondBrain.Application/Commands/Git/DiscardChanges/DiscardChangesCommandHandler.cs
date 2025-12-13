using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.DiscardChanges;

public class DiscardChangesCommandHandler : IRequestHandler<DiscardChangesCommand, Result<bool>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<DiscardChangesCommandHandler> _logger;

    public DiscardChangesCommandHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<DiscardChangesCommandHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(DiscardChangesCommand request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<bool>.Failure(authResult.Error!);
        }

        _logger.LogInformation("User {UserId} discarding changes to {FilePath} in {RepoPath}",
            request.UserId, request.FilePath, request.RepoPath);

        return await _gitService.DiscardChangesAsync(authResult.Value!, request.FilePath);
    }
}
