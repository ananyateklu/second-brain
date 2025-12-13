using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetRepositoryInfo;

public class GetRepositoryInfoQueryHandler : IRequestHandler<GetRepositoryInfoQuery, Result<GitHubRepositoryInfo>>
{
    private readonly IGitHubService _gitHubService;

    public GetRepositoryInfoQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<GitHubRepositoryInfo>> Handle(GetRepositoryInfoQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetRepositoryInfoAsync(request.Owner, request.Repo, cancellationToken);
    }
}
