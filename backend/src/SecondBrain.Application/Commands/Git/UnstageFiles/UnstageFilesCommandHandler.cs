using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.UnstageFiles;

public class UnstageFilesCommandHandler : IRequestHandler<UnstageFilesCommand, Result<bool>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<UnstageFilesCommandHandler> _logger;

    public UnstageFilesCommandHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<UnstageFilesCommandHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(UnstageFilesCommand request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<bool>.Failure(authResult.Error!);
        }

        _logger.LogInformation("User {UserId} unstaging {FileCount} files in {RepoPath}",
            request.UserId, request.Files.Length, request.RepoPath);

        return await _gitService.UnstageFilesAsync(authResult.Value!, request.Files);
    }
}
