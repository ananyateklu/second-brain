using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Git;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Git.Commit;

public class CommitCommandHandler : IRequestHandler<CommitCommand, Result<string>>
{
    private readonly IGitService _gitService;
    private readonly IGitAuthorizationService _gitAuthorization;
    private readonly ILogger<CommitCommandHandler> _logger;

    public CommitCommandHandler(
        IGitService gitService,
        IGitAuthorizationService gitAuthorization,
        ILogger<CommitCommandHandler> logger)
    {
        _gitService = gitService;
        _gitAuthorization = gitAuthorization;
        _logger = logger;
    }

    public async Task<Result<string>> Handle(CommitCommand request, CancellationToken cancellationToken)
    {
        var authResult = _gitAuthorization.AuthorizeRepository(request.RepoPath, request.UserId);
        if (authResult.IsFailure)
        {
            return Result<string>.Failure(authResult.Error!);
        }

        _logger.LogInformation("User {UserId} creating commit in {RepoPath}", request.UserId, request.RepoPath);

        return await _gitService.CommitAsync(authResult.Value!, request.Message);
    }
}
