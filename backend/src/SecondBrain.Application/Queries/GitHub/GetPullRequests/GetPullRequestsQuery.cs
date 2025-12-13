using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetPullRequests;

public record GetPullRequestsQuery(
    string? Owner,
    string? Repo,
    string State,
    int Page,
    int PerPage
) : IRequest<Result<GitHubPullRequestsResponse>>;
