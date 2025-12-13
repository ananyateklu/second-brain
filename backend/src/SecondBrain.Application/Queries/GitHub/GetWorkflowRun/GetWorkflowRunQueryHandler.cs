using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetWorkflowRun;

public class GetWorkflowRunQueryHandler : IRequestHandler<GetWorkflowRunQuery, Result<WorkflowRunSummary>>
{
    private readonly IGitHubService _gitHubService;

    public GetWorkflowRunQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<WorkflowRunSummary>> Handle(GetWorkflowRunQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetWorkflowRunAsync(request.RunId, request.Owner, request.Repo, cancellationToken);
    }
}
