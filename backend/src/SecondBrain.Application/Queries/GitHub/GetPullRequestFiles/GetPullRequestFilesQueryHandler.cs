using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetPullRequestFiles;

public class GetPullRequestFilesQueryHandler : IRequestHandler<GetPullRequestFilesQuery, Result<GitHubPullRequestFilesResponse>>
{
    private readonly IGitHubService _gitHubService;

    public GetPullRequestFilesQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<GitHubPullRequestFilesResponse>> Handle(GetPullRequestFilesQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetPullRequestFilesAsync(request.PullNumber, request.Owner, request.Repo, cancellationToken);
    }
}
