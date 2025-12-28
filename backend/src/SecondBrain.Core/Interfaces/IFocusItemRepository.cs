using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Repository interface for focus item operations.
/// </summary>
public interface IFocusItemRepository
{
    /// <summary>
    /// Gets all focus items for a user.
    /// </summary>
    Task<IEnumerable<FocusItem>> GetAllByUserIdAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a focus item by ID.
    /// </summary>
    Task<FocusItem?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets focus items scheduled for a specific date (today's plan).
    /// </summary>
    Task<IEnumerable<FocusItem>> GetByScheduledDateAsync(
        string userId,
        DateOnly date,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the current focus item for a user (only one allowed).
    /// </summary>
    Task<FocusItem?> GetCurrentFocusAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets backlog items (not scheduled, not completed).
    /// </summary>
    Task<IEnumerable<FocusItem>> GetBacklogAsync(
        string userId,
        int? priority = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets items by status.
    /// </summary>
    Task<IEnumerable<FocusItem>> GetByStatusAsync(
        string userId,
        string status,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets completed items within a date range.
    /// </summary>
    Task<IEnumerable<FocusItem>> GetCompletedInRangeAsync(
        string userId,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new focus item.
    /// </summary>
    Task<FocusItem> CreateAsync(FocusItem item, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing focus item.
    /// </summary>
    Task<FocusItem?> UpdateAsync(FocusItem item, CancellationToken cancellationToken = default);

    /// <summary>
    /// Clears the current focus for a user (sets is_current_focus = false for all items).
    /// </summary>
    Task ClearCurrentFocusAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates sort order for multiple items in a single transaction.
    /// </summary>
    Task ReorderAsync(
        string userId,
        IEnumerable<(string Id, int SortOrder)> orders,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Soft deletes a focus item.
    /// </summary>
    Task<bool> SoftDeleteAsync(string id, string deletedBy, CancellationToken cancellationToken = default);

    /// <summary>
    /// Hard deletes a focus item.
    /// </summary>
    Task<bool> HardDeleteAsync(string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets focus items linked to a specific note.
    /// </summary>
    Task<IEnumerable<FocusItem>> GetByNoteIdAsync(string noteId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets count of items by status for a user.
    /// </summary>
    Task<Dictionary<string, int>> GetStatusCountsAsync(
        string userId,
        DateOnly? date = null,
        CancellationToken cancellationToken = default);
}
