using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetPullRequest;

public class GetPullRequestQueryHandler : IRequestHandler<GetPullRequestQuery, Result<PullRequestSummary>>
{
    private readonly IGitHubService _gitHubService;

    public GetPullRequestQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<PullRequestSummary>> Handle(GetPullRequestQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetPullRequestAsync(
            request.PullNumber, request.Owner, request.Repo, cancellationToken);
    }
}
