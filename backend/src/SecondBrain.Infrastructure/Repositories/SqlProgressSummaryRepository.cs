using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// SQL implementation of progress summary repository for caching AI-generated summaries.
/// </summary>
public class SqlProgressSummaryRepository : IProgressSummaryRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlProgressSummaryRepository> _logger;

    public SqlProgressSummaryRepository(
        ApplicationDbContext context,
        ILogger<SqlProgressSummaryRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ProgressSummary?> GetByDateAndPeriodAsync(
        string userId,
        DateOnly date,
        string period,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Retrieving cached progress summary. UserId: {UserId}, Date: {Date}, Period: {Period}",
                userId, date, period);

            var summary = await _context.ProgressSummaries
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    s => s.UserId == userId && s.SummaryDate == date && s.Period == period,
                    cancellationToken);

            if (summary != null)
            {
                _logger.LogDebug("Found cached summary. GeneratedAt: {GeneratedAt}", summary.GeneratedAt);
            }
            else
            {
                _logger.LogDebug("No cached summary found");
            }

            return summary;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error retrieving progress summary. UserId: {UserId}, Date: {Date}, Period: {Period}",
                userId, date, period);
            throw new RepositoryException("Failed to retrieve progress summary", ex);
        }
    }

    public async Task<ProgressSummary> UpsertAsync(
        ProgressSummary summary,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Upserting progress summary. UserId: {UserId}, Date: {Date}, Period: {Period}",
                summary.UserId, summary.SummaryDate, summary.Period);

            // Check if an existing summary exists
            var existing = await _context.ProgressSummaries
                .FirstOrDefaultAsync(
                    s => s.UserId == summary.UserId
                        && s.SummaryDate == summary.SummaryDate
                        && s.Period == summary.Period,
                    cancellationToken);

            if (existing != null)
            {
                // Update existing
                existing.TotalCompleted = summary.TotalCompleted;
                existing.TotalMinutesTracked = summary.TotalMinutesTracked;
                existing.P1Completed = summary.P1Completed;
                existing.P2Completed = summary.P2Completed;
                existing.P3Completed = summary.P3Completed;
                existing.StreakDays = summary.StreakDays;
                existing.Summary = summary.Summary;
                existing.HighlightsJson = summary.HighlightsJson;
                existing.Encouragement = summary.Encouragement;
                existing.AiProvider = summary.AiProvider;
                existing.AiModel = summary.AiModel;
                existing.GeneratedAt = summary.GeneratedAt;
                existing.PeriodStart = summary.PeriodStart;
                existing.PeriodEnd = summary.PeriodEnd;
                existing.UpdatedAt = DateTime.UtcNow;

                _logger.LogDebug("Updated existing summary. Id: {Id}", existing.Id);
            }
            else
            {
                // Create new
                if (string.IsNullOrEmpty(summary.Id))
                {
                    summary.Id = UuidV7.NewId();
                }
                summary.CreatedAt = DateTime.UtcNow;
                summary.UpdatedAt = DateTime.UtcNow;

                _context.ProgressSummaries.Add(summary);
                existing = summary;

                _logger.LogDebug("Created new summary. Id: {Id}", summary.Id);
            }

            await _context.SaveChangesAsync(cancellationToken);
            return existing;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error upserting progress summary. UserId: {UserId}, Date: {Date}, Period: {Period}",
                summary.UserId, summary.SummaryDate, summary.Period);
            throw new RepositoryException("Failed to save progress summary", ex);
        }
    }

    public async Task<bool> InvalidateAsync(
        string userId,
        DateOnly date,
        string? period = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Invalidating progress summaries. UserId: {UserId}, Date: {Date}, Period: {Period}",
                userId, date, period ?? "all");

            var query = _context.ProgressSummaries
                .Where(s => s.UserId == userId && s.SummaryDate == date);

            if (!string.IsNullOrEmpty(period))
            {
                query = query.Where(s => s.Period == period);
            }

            var count = await query.ExecuteDeleteAsync(cancellationToken);

            _logger.LogDebug("Invalidated {Count} summaries", count);
            return count > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error invalidating progress summaries. UserId: {UserId}, Date: {Date}, Period: {Period}",
                userId, date, period ?? "all");
            throw new RepositoryException("Failed to invalidate progress summaries", ex);
        }
    }

    public async Task<IEnumerable<ProgressSummary>> GetByDateRangeAsync(
        string userId,
        DateOnly startDate,
        DateOnly endDate,
        string? period = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug(
                "Retrieving progress summaries for date range. UserId: {UserId}, Start: {Start}, End: {End}, Period: {Period}",
                userId, startDate, endDate, period ?? "all");

            var query = _context.ProgressSummaries
                .AsNoTracking()
                .Where(s => s.UserId == userId
                    && s.SummaryDate >= startDate
                    && s.SummaryDate <= endDate);

            if (!string.IsNullOrEmpty(period))
            {
                query = query.Where(s => s.Period == period);
            }

            var summaries = await query
                .OrderByDescending(s => s.SummaryDate)
                .ToListAsync(cancellationToken);

            _logger.LogDebug("Retrieved {Count} summaries", summaries.Count);
            return summaries;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error retrieving progress summaries for date range. UserId: {UserId}, Start: {Start}, End: {End}",
                userId, startDate, endDate);
            throw new RepositoryException("Failed to retrieve progress summaries", ex);
        }
    }

    public async Task<int> CleanupOldSummariesAsync(
        int olderThanDays = 90,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var cutoffDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-olderThanDays));

            _logger.LogDebug(
                "Cleaning up summaries older than {Days} days (before {CutoffDate})",
                olderThanDays, cutoffDate);

            var count = await _context.ProgressSummaries
                .Where(s => s.SummaryDate < cutoffDate)
                .ExecuteDeleteAsync(cancellationToken);

            _logger.LogInformation("Cleaned up {Count} old progress summaries", count);
            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up old progress summaries");
            throw new RepositoryException("Failed to cleanup old progress summaries", ex);
        }
    }
}
