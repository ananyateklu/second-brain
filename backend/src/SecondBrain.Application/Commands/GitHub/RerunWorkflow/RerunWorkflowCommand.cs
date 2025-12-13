using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.GitHub.RerunWorkflow;

public record RerunWorkflowCommand(
    long RunId,
    string? Owner,
    string? Repo
) : IRequest<Result<bool>>;
