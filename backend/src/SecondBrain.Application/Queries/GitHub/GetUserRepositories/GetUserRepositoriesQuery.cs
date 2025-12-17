using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetUserRepositories;

public record GetUserRepositoriesQuery(
    string? Type = "all",
    string? Sort = "pushed",
    int Page = 1,
    int PerPage = 30
) : IRequest<Result<GitHubRepositoriesResponse>>;
