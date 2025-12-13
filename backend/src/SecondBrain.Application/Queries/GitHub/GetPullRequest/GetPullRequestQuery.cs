using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetPullRequest;

public record GetPullRequestQuery(
    int PullNumber,
    string? Owner,
    string? Repo
) : IRequest<Result<PullRequestSummary>>;
