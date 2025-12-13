using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetCheckRuns;

public class GetCheckRunsQueryHandler : IRequestHandler<GetCheckRunsQuery, Result<List<CheckRunSummary>>>
{
    private readonly IGitHubService _gitHubService;

    public GetCheckRunsQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<List<CheckRunSummary>>> Handle(GetCheckRunsQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetCheckRunsAsync(request.Sha, request.Owner, request.Repo, cancellationToken);
    }
}
