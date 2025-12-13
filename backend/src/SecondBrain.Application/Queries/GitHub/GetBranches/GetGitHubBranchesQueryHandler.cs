using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetBranches;

public class GetGitHubBranchesQueryHandler : IRequestHandler<GetGitHubBranchesQuery, Result<GitHubBranchesResponse>>
{
    private readonly IGitHubService _gitHubService;

    public GetGitHubBranchesQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<GitHubBranchesResponse>> Handle(GetGitHubBranchesQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetBranchesAsync(request.Owner, request.Repo, cancellationToken);
    }
}
