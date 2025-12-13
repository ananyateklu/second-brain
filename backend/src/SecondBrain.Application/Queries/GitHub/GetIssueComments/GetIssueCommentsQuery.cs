using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetIssueComments;

public record GetIssueCommentsQuery(
    int IssueNumber,
    string? Owner,
    string? Repo
) : IRequest<Result<GitHubCommentsResponse>>;
