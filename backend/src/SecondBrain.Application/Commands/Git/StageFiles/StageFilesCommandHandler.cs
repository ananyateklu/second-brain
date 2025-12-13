using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.StageFiles;

public class StageFilesCommandHandler : IRequestHandler<StageFilesCommand, Result<bool>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<StageFilesCommandHandler> _logger;

    public StageFilesCommandHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<StageFilesCommandHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(StageFilesCommand request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<bool>.Failure(authResult.Error!);
        }

        _logger.LogInformation("User {UserId} staging {FileCount} files in {RepoPath}",
            request.UserId, request.Files.Length, request.RepoPath);

        return await _gitService.StageFilesAsync(authResult.Value!, request.Files);
    }
}
