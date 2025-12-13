using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.GitHub.RerunWorkflow;

public class RerunWorkflowCommandHandler : IRequestHandler<RerunWorkflowCommand, Result<bool>>
{
    private readonly IGitHubService _gitHubService;

    public RerunWorkflowCommandHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<bool>> Handle(RerunWorkflowCommand request, CancellationToken cancellationToken)
    {
        return await _gitHubService.RerunWorkflowAsync(request.RunId, request.Owner, request.Repo, cancellationToken);
    }
}
