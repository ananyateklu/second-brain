using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetPullRequestReviews;

public class GetPullRequestReviewsQueryHandler : IRequestHandler<GetPullRequestReviewsQuery, Result<List<ReviewSummary>>>
{
    private readonly IGitHubService _gitHubService;

    public GetPullRequestReviewsQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<List<ReviewSummary>>> Handle(GetPullRequestReviewsQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetPullRequestReviewsAsync(
            request.PullNumber, request.Owner, request.Repo, cancellationToken);
    }
}
