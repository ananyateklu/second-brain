using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetIssues;

public class GetIssuesQueryHandler : IRequestHandler<GetIssuesQuery, Result<GitHubIssuesResponse>>
{
    private readonly IGitHubService _gitHubService;

    public GetIssuesQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<GitHubIssuesResponse>> Handle(GetIssuesQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetIssuesAsync(
            request.Owner, request.Repo, request.State, request.Page, request.PerPage, cancellationToken);
    }
}
