using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetIssues;

public record GetIssuesQuery(
    string? Owner,
    string? Repo,
    string State,
    int Page,
    int PerPage
) : IRequest<Result<GitHubIssuesResponse>>;
