using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetPullRequests;

public class GetPullRequestsQueryHandler : IRequestHandler<GetPullRequestsQuery, Result<GitHubPullRequestsResponse>>
{
    private readonly IGitHubService _gitHubService;

    public GetPullRequestsQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<GitHubPullRequestsResponse>> Handle(GetPullRequestsQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetPullRequestsAsync(
            request.Owner, request.Repo, request.State, request.Page, request.PerPage, cancellationToken);
    }
}
