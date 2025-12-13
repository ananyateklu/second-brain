using MediatR;
using SecondBrain.Application.Services.GitHub;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.GitHub.CancelWorkflowRun;

public class CancelWorkflowRunCommandHandler : IRequestHandler<CancelWorkflowRunCommand, Result<bool>>
{
    private readonly IGitHubService _gitHubService;

    public CancelWorkflowRunCommandHandler(IGitHubService gitHubService)
    {
        _gitHubService = gitHubService;
    }

    public async Task<Result<bool>> Handle(CancelWorkflowRunCommand request, CancellationToken cancellationToken)
    {
        return await _gitHubService.CancelWorkflowRunAsync(request.RunId, request.Owner, request.Repo, cancellationToken);
    }
}
