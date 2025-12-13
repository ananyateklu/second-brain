using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetCommits;

public class GetCommitsQueryHandler : IRequestHandler<GetCommitsQuery, Result<GitHubCommitsResponse>>
{
    private readonly IGitHubService _gitHubService;

    public GetCommitsQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<GitHubCommitsResponse>> Handle(GetCommitsQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetCommitsAsync(
            request.Owner, request.Repo, request.Branch, request.Page, request.PerPage, cancellationToken);
    }
}
