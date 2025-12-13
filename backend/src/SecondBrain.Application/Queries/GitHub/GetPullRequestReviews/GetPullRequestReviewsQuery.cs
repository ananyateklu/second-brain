using MediatR;
using SecondBrain.Application.Services.GitHub.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GitHub.GetPullRequestReviews;

public record GetPullRequestReviewsQuery(
    int PullNumber,
    string? Owner,
    string? Repo
) : IRequest<Result<List<ReviewSummary>>>;
