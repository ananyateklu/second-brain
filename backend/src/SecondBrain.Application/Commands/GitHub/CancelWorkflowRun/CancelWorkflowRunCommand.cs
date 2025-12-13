using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.GitHub.CancelWorkflowRun;

public record CancelWorkflowRunCommand(
    long RunId,
    string? Owner,
    string? Repo
) : IRequest<Result<bool>>;
