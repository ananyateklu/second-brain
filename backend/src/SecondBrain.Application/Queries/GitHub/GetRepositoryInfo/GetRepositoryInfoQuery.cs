using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetRepositoryInfo;

public record GetRepositoryInfoQuery(
    string? Owner,
    string? Repo
) : IRequest<Result<GitHubRepositoryInfo>>;
