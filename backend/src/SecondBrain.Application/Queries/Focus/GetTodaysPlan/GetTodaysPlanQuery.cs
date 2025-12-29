using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Focus.GetTodaysPlan;

/// <summary>
/// Query to retrieve today's focus plan for a user.
/// Returns current focus, scheduled items, and completion stats.
/// </summary>
/// <param name="UserId">The user ID to get the plan for</param>
/// <param name="Date">The date to get the plan for (defaults to today)</param>
public record GetTodaysPlanQuery(
    string UserId,
    DateOnly? Date = null) : IRequest<Result<TodaysPlanResponse>>
{
    /// <summary>
    /// Gets the effective date, defaulting to today if not specified.
    /// </summary>
    public DateOnly EffectiveDate => Date ?? DateOnly.FromDateTime(DateTime.UtcNow);
}
