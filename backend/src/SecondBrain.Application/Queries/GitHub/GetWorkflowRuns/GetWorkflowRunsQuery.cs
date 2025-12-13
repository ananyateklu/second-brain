using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetWorkflowRuns;

public record GetWorkflowRunsQuery(
    string? Owner,
    string? Repo,
    string? Branch,
    string? Status,
    int Page,
    int PerPage
) : IRequest<Result<GitHubActionsResponse>>;
