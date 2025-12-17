using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetUserRepositories;

public class GetUserRepositoriesQueryHandler : IRequestHandler<GetUserRepositoriesQuery, Result<GitHubRepositoriesResponse>>
{
    private readonly IGitHubService _gitHubService;

    public GetUserRepositoriesQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<GitHubRepositoriesResponse>> Handle(GetUserRepositoriesQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetUserRepositoriesAsync(
            request.Type,
            request.Sort,
            request.Page,
            request.PerPage,
            cancellationToken);
    }
}
