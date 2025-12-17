using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetRepositoryTree;

public record GetRepositoryTreeQuery(
    string TreeSha,
    string? Owner,
    string? Repo
) : IRequest<Result<GitHubRepositoryTreeResponse>>;
