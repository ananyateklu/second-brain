using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetBranches;

public record GetGitHubBranchesQuery(
    string? Owner,
    string? Repo
) : IRequest<Result<GitHubBranchesResponse>>;
