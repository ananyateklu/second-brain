using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetCheckRuns;

public record GetCheckRunsQuery(
    string Sha,
    string? Owner,
    string? Repo
) : IRequest<Result<List<CheckRunSummary>>>;
