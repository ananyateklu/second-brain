using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetRepositoryTree;

public class GetRepositoryTreeQueryHandler : IRequestHandler<GetRepositoryTreeQuery, Result<GitHubRepositoryTreeResponse>>
{
    private readonly IGitHubService _gitHubService;

    public GetRepositoryTreeQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<GitHubRepositoryTreeResponse>> Handle(GetRepositoryTreeQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetRepositoryTreeAsync(request.TreeSha, request.Owner, request.Repo, cancellationToken);
    }
}
