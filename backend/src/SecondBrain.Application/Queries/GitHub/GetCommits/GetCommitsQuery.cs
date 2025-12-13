using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetCommits;

public record GetCommitsQuery(
    string? Owner,
    string? Repo,
    string? Branch,
    int Page,
    int PerPage
) : IRequest<Result<GitHubCommitsResponse>>;
