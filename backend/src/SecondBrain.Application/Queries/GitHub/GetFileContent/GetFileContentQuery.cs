using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetFileContent;

public record GetFileContentQuery(
    string Path,
    string? Reference,
    string? Owner,
    string? Repo
) : IRequest<Result<GitHubFileContentResponse>>;
