using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetWorkflows;

public record GetWorkflowsQuery(
    string? Owner,
    string? Repo
) : IRequest<Result<List<GitHubWorkflow>>>;
