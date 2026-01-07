using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// SQL Server implementation of focus item repository.
/// </summary>
public class SqlFocusItemRepository : IFocusItemRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlFocusItemRepository> _logger;

    public SqlFocusItemRepository(ApplicationDbContext context, ILogger<SqlFocusItemRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<FocusItem>> GetAllByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Retrieving all focus items for user. UserId: {UserId}", userId);
            var items = await _context.FocusItems
                .AsNoTracking()
                .Where(f => f.UserId == userId)
                .Include(f => f.Note)
                .OrderBy(f => f.Priority)
                .ThenBy(f => f.SortOrder)
                .ToListAsync(cancellationToken);
            _logger.LogDebug("Retrieved {Count} focus items for user", items.Count);
            return items;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving focus items for user. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve focus items", ex);
        }
    }

    public async Task<FocusItem?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Retrieving focus item by ID. FocusItemId: {Id}", id);
            var item = await _context.FocusItems
                .AsNoTracking()
                .Include(f => f.Note)
                .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
            return item;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving focus item by ID. Id: {Id}", id);
            throw new RepositoryException($"Failed to retrieve focus item with ID '{id}'", ex);
        }
    }

    public async Task<IEnumerable<FocusItem>> GetByScheduledDateAsync(
        string userId,
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Retrieving focus items for date (including overdue). UserId: {UserId}, Date: {Date}", userId, date);

            // Calculate today's date boundaries for checking completedAt (must be UTC for PostgreSQL)
            var todayStart = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var todayEnd = DateTime.SpecifyKind(date.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

            // Include:
            // 1. Items scheduled for today (all statuses)
            // 2. Overdue items (past dates) that are NOT completed
            // 3. Items completed TODAY (regardless of original scheduled date)
            var items = await _context.FocusItems
                .AsNoTracking()
                .Where(f => f.UserId == userId
                    && f.ScheduledDate != null
                    && f.ScheduledDate <= date
                    && (
                        f.ScheduledDate == date  // Today's scheduled items
                        || f.Status != "completed"  // Overdue incomplete items
                        || (f.CompletedAt != null && f.CompletedAt >= todayStart && f.CompletedAt < todayEnd)  // Completed today
                    ))
                .Include(f => f.Note)
                .OrderByDescending(f => f.IsCurrentFocus)
                .ThenBy(f => f.ScheduledDate) // Show overdue items first (oldest first)
                .ThenBy(f => f.Priority)
                .ThenBy(f => f.SortOrder)
                .ToListAsync(cancellationToken);
            _logger.LogDebug("Retrieved {Count} focus items for date (including overdue)", items.Count);
            return items;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving focus items for date. UserId: {UserId}, Date: {Date}", userId, date);
            throw new RepositoryException("Failed to retrieve focus items for date", ex);
        }
    }

    public async Task<FocusItem?> GetCurrentFocusAsync(string userId, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Retrieving current focus for user. UserId: {UserId}", userId);
            var item = await _context.FocusItems
                .AsNoTracking()
                .Include(f => f.Note)
                .FirstOrDefaultAsync(f => f.UserId == userId && f.IsCurrentFocus, cancellationToken);
            return item;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving current focus. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve current focus", ex);
        }
    }

    public async Task<IEnumerable<FocusItem>> GetBacklogAsync(
        string userId,
        int? priority = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Retrieving backlog for user. UserId: {UserId}, Priority: {Priority}", userId, priority);
            var query = _context.FocusItems
                .AsNoTracking()
                .Where(f => f.UserId == userId && f.ScheduledDate == null && f.Status != "completed");

            if (priority.HasValue)
            {
                query = query.Where(f => f.Priority == priority.Value);
            }

            var items = await query
                .Include(f => f.Note)
                .OrderBy(f => f.Priority)
                .ThenBy(f => f.SortOrder)
                .ThenByDescending(f => f.CreatedAt)
                .ToListAsync(cancellationToken);

            _logger.LogDebug("Retrieved {Count} backlog items", items.Count);
            return items;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving backlog. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve backlog", ex);
        }
    }

    public async Task<IEnumerable<FocusItem>> GetByStatusAsync(
        string userId,
        string status,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Retrieving focus items by status. UserId: {UserId}, Status: {Status}", userId, status);
            var items = await _context.FocusItems
                .AsNoTracking()
                .Where(f => f.UserId == userId && f.Status == status)
                .Include(f => f.Note)
                .OrderByDescending(f => f.UpdatedAt)
                .ToListAsync(cancellationToken);
            return items;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving focus items by status. UserId: {UserId}, Status: {Status}", userId, status);
            throw new RepositoryException("Failed to retrieve focus items by status", ex);
        }
    }

    public async Task<IEnumerable<FocusItem>> GetCompletedInRangeAsync(
        string userId,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Retrieving completed items in range. UserId: {UserId}, Start: {Start}, End: {End}",
                userId, startDate, endDate);
            var items = await _context.FocusItems
                .AsNoTracking()
                .Where(f => f.UserId == userId
                    && f.Status == "completed"
                    && f.CompletedAt >= startDate
                    && f.CompletedAt <= endDate)
                .Include(f => f.Note)
                .OrderByDescending(f => f.CompletedAt)
                .ToListAsync(cancellationToken);
            return items;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving completed items in range. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve completed items", ex);
        }
    }

    public async Task<FocusItem> CreateAsync(FocusItem item, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Creating focus item. Title: {Title}, UserId: {UserId}", item.Title, item.UserId);

            if (string.IsNullOrEmpty(item.Id))
            {
                item.Id = UuidV7.NewId();
            }

            var now = DateTime.UtcNow;
            item.CreatedAt = now;
            item.UpdatedAt = now;

            _context.FocusItems.Add(item);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogDebug("Focus item created successfully. Id: {Id}", item.Id);
            return item;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating focus item. Title: {Title}", item.Title);
            throw new RepositoryException("Failed to create focus item", ex);
        }
    }

    public async Task<FocusItem?> UpdateAsync(FocusItem item, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Updating focus item. Id: {Id}", item.Id);

            var existing = await _context.FocusItems.FindAsync(new object[] { item.Id }, cancellationToken);
            if (existing == null)
            {
                _logger.LogWarning("Focus item not found for update. Id: {Id}", item.Id);
                return null;
            }

            // Update fields
            existing.Title = item.Title;
            existing.Description = item.Description;
            existing.NoteId = item.NoteId;
            existing.IsCurrentFocus = item.IsCurrentFocus;
            existing.Priority = item.Priority;
            existing.Status = item.Status;
            existing.ScheduledDate = item.ScheduledDate;
            existing.EstimatedMinutes = item.EstimatedMinutes;
            existing.ActualMinutes = item.ActualMinutes;
            existing.CompletedAt = item.CompletedAt;
            existing.DeferredTo = item.DeferredTo;
            existing.AiSuggested = item.AiSuggested;
            existing.AiSuggestionReason = item.AiSuggestionReason;
            existing.AiConfidence = item.AiConfidence;
            existing.SortOrder = item.SortOrder;
            existing.FocusStartedAt = item.FocusStartedAt;
            existing.AccumulatedMinutes = item.AccumulatedMinutes;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogDebug("Focus item updated successfully. Id: {Id}", item.Id);
            return existing;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating focus item. Id: {Id}", item.Id);
            throw new RepositoryException($"Failed to update focus item with ID '{item.Id}'", ex);
        }
    }

    public async Task ClearCurrentFocusAsync(string userId, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Clearing current focus for user. UserId: {UserId}", userId);

            // Get current focus item to calculate elapsed time
            var currentFocus = await _context.FocusItems
                .FirstOrDefaultAsync(f => f.UserId == userId && f.IsCurrentFocus, cancellationToken);

            if (currentFocus != null)
            {
                // Calculate elapsed minutes since focus started (round up partial minutes)
                var elapsedMinutes = 0;
                if (currentFocus.FocusStartedAt.HasValue)
                {
                    var elapsed = DateTime.UtcNow - currentFocus.FocusStartedAt.Value;
                    elapsedMinutes = (int)Math.Ceiling(elapsed.TotalMinutes);
                }

                // Accumulate time and clear focus
                currentFocus.AccumulatedMinutes += elapsedMinutes;
                currentFocus.IsCurrentFocus = false;
                currentFocus.FocusStartedAt = null; // Clear the timer
                currentFocus.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogDebug(
                    "Current focus cleared for user. UserId: {UserId}, ElapsedMinutes: {Elapsed}, TotalAccumulated: {Total}",
                    userId, elapsedMinutes, currentFocus.AccumulatedMinutes);
            }
            else
            {
                _logger.LogDebug("No current focus to clear for user. UserId: {UserId}", userId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing current focus. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to clear current focus", ex);
        }
    }

    public async Task ReorderAsync(
        string userId,
        IEnumerable<(string Id, int SortOrder)> orders,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Reordering focus items. UserId: {UserId}, Count: {Count}", userId, orders.Count());

            foreach (var (id, sortOrder) in orders)
            {
                await _context.FocusItems
                    .Where(f => f.Id == id && f.UserId == userId)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(f => f.SortOrder, sortOrder)
                        .SetProperty(f => f.UpdatedAt, DateTime.UtcNow),
                        cancellationToken);
            }

            _logger.LogDebug("Focus items reordered successfully. UserId: {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reordering focus items. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to reorder focus items", ex);
        }
    }

    public async Task<bool> SoftDeleteAsync(string id, string deletedBy, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Soft deleting focus item. Id: {Id}, DeletedBy: {DeletedBy}", id, deletedBy);

            var rowsAffected = await _context.FocusItems
                .Where(f => f.Id == id)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(f => f.IsDeleted, true)
                    .SetProperty(f => f.DeletedAt, DateTime.UtcNow)
                    .SetProperty(f => f.DeletedBy, deletedBy)
                    .SetProperty(f => f.IsCurrentFocus, false),
                    cancellationToken);

            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error soft deleting focus item. Id: {Id}", id);
            throw new RepositoryException($"Failed to soft delete focus item with ID '{id}'", ex);
        }
    }

    public async Task<bool> HardDeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Hard deleting focus item. Id: {Id}", id);

            var rowsAffected = await _context.FocusItems
                .Where(f => f.Id == id)
                .ExecuteDeleteAsync(cancellationToken);

            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error hard deleting focus item. Id: {Id}", id);
            throw new RepositoryException($"Failed to hard delete focus item with ID '{id}'", ex);
        }
    }

    public async Task<IEnumerable<FocusItem>> GetByNoteIdAsync(string noteId, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Retrieving focus items by note. NoteId: {NoteId}", noteId);
            var items = await _context.FocusItems
                .AsNoTracking()
                .Where(f => f.NoteId == noteId)
                .OrderByDescending(f => f.CreatedAt)
                .ToListAsync(cancellationToken);
            return items;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving focus items by note. NoteId: {NoteId}", noteId);
            throw new RepositoryException("Failed to retrieve focus items by note", ex);
        }
    }

    public async Task<Dictionary<string, int>> GetStatusCountsAsync(
        string userId,
        DateOnly? date = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Getting status counts. UserId: {UserId}, Date: {Date}", userId, date);

            var query = _context.FocusItems
                .AsNoTracking()
                .Where(f => f.UserId == userId);

            if (date.HasValue)
            {
                query = query.Where(f => f.ScheduledDate == date.Value);
            }

            // Get items and calculate effective status for the date
            var items = await query.ToListAsync(cancellationToken);

            // For completed items, only count as "completed" if completedAt is on the same date
            // Otherwise, treat them as "pending" for that historical date
            var counts = new Dictionary<string, int>();
            foreach (var item in items)
            {
                string effectiveStatus = item.Status;

                // If viewing a specific date and item is completed, check if it was completed ON that date
                if (date.HasValue && item.Status == "completed" && item.CompletedAt.HasValue)
                {
                    var completedDate = DateOnly.FromDateTime(item.CompletedAt.Value);
                    if (completedDate != date.Value)
                    {
                        // Item wasn't completed on this date - treat as pending
                        effectiveStatus = "pending";
                    }
                }

                counts[effectiveStatus] = counts.GetValueOrDefault(effectiveStatus, 0) + 1;
            }

            return counts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting status counts. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to get status counts", ex);
        }
    }

    public async Task<IEnumerable<FocusItem>> GetActiveItemsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Retrieving active focus items for deduplication. UserId: {UserId}", userId);

            // Get all non-completed, non-cancelled items (pending or in_progress)
            // This includes today's plan and backlog items
            var items = await _context.FocusItems
                .AsNoTracking()
                .Where(f => f.UserId == userId
                    && f.Status != "completed"
                    && f.Status != "cancelled")
                .ToListAsync(cancellationToken);

            _logger.LogDebug("Retrieved {Count} active focus items for deduplication", items.Count);
            return items;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active focus items. UserId: {UserId}", userId);
            throw new RepositoryException("Failed to retrieve active focus items", ex);
        }
    }

    public async Task<int> GetCompletedOnDateCountAsync(
        string userId,
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogDebug("Getting completed on date count. UserId: {UserId}, Date: {Date}", userId, date);

            // Count items where completed_at falls on the specified date
            var startOfDay = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var endOfDay = date.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

            var count = await _context.FocusItems
                .AsNoTracking()
                .Where(f => f.UserId == userId
                    && f.Status == "completed"
                    && f.CompletedAt >= startOfDay
                    && f.CompletedAt <= endOfDay)
                .CountAsync(cancellationToken);

            _logger.LogDebug("Found {Count} items completed on {Date}", count, date);
            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting completed on date count. UserId: {UserId}, Date: {Date}", userId, date);
            throw new RepositoryException("Failed to get completed on date count", ex);
        }
    }
}
