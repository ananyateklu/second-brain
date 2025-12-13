using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetWorkflowRun;

public record GetWorkflowRunQuery(
    long RunId,
    string? Owner,
    string? Repo
) : IRequest<Result<WorkflowRunSummary>>;
