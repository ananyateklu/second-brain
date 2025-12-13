using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetIssueComments;

public class GetIssueCommentsQueryHandler : IRequestHandler<GetIssueCommentsQuery, Result<GitHubCommentsResponse>>
{
    private readonly IGitHubService _gitHubService;

    public GetIssueCommentsQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<GitHubCommentsResponse>> Handle(GetIssueCommentsQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetIssueCommentsAsync(request.IssueNumber, request.Owner, request.Repo, cancellationToken);
    }
}
