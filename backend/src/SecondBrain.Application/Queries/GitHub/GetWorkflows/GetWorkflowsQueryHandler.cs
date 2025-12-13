using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetWorkflows;

public class GetWorkflowsQueryHandler : IRequestHandler<GetWorkflowsQuery, Result<List<GitHubWorkflow>>>
{
    private readonly IGitHubService _gitHubService;

    public GetWorkflowsQueryHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<List<GitHubWorkflow>>> Handle(GetWorkflowsQuery request, CancellationToken cancellationToken)
    {
        return await _gitHubService.GetWorkflowsAsync(request.Owner, request.Repo, cancellationToken);
    }
}
