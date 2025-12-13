using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetWorkflowRuns;

public class GetWorkflowRunsQueryHandler : IRequestHandler<GetWorkflowRunsQuery, Result<GitHubActionsResponse>>
{
    private readonly IGitHubService _gitHubService;

    public GetWorkflowRunsQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<GitHubActionsResponse>> Handle(GetWorkflowRunsQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetWorkflowRunsAsync(
            request.Owner, request.Repo, request.Branch, request.Status, request.Page, request.PerPage, cancellationToken);
    }
}
