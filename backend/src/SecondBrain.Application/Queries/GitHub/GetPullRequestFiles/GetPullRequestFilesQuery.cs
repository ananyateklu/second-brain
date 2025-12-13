using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetPullRequestFiles;

public record GetPullRequestFilesQuery(
    int PullNumber,
    string? Owner,
    string? Repo
) : IRequest<Result<GitHubPullRequestFilesResponse>>;
