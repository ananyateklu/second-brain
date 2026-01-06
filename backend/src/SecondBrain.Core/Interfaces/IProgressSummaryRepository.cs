using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Repository interface for progress summary caching operations.
/// </summary>
public interface IProgressSummaryRepository
{
    /// <summary>
    /// Gets a cached summary for a specific user, date, and period.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="date">The date to get the summary for.</param>
    /// <param name="period">The period type ('today' or 'week').</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The cached summary if found, null otherwise.</returns>
    Task<ProgressSummary?> GetByDateAndPeriodAsync(
        string userId,
        DateOnly date,
        string period,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates or updates a progress summary.
    /// Uses upsert semantics - if a summary exists for the user/date/period, it's updated.
    /// </summary>
    /// <param name="summary">The summary to save.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The saved summary.</returns>
    Task<ProgressSummary> UpsertAsync(
        ProgressSummary summary,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidates (deletes) the cached summary for a specific user, date, and period.
    /// Called when a task is completed to force regeneration.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="date">The date to invalidate.</param>
    /// <param name="period">The period type (null = invalidate all periods for the date).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if any summaries were invalidated.</returns>
    Task<bool> InvalidateAsync(
        string userId,
        DateOnly date,
        string? period = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all summaries for a user within a date range.
    /// Useful for viewing historical summaries.
    /// </summary>
    /// <param name="userId">The user ID.</param>
    /// <param name="startDate">Start of date range (inclusive).</param>
    /// <param name="endDate">End of date range (inclusive).</param>
    /// <param name="period">Optional period filter.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IEnumerable<ProgressSummary>> GetByDateRangeAsync(
        string userId,
        DateOnly startDate,
        DateOnly endDate,
        string? period = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes old summaries to prevent unbounded growth.
    /// Keeps summaries for the most recent N days.
    /// </summary>
    /// <param name="olderThanDays">Delete summaries older than this many days.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Number of summaries deleted.</returns>
    Task<int> CleanupOldSummariesAsync(
        int olderThanDays = 90,
        CancellationToken cancellationToken = default);
}
