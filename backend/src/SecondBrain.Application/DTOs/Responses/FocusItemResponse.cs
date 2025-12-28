namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model containing focus item data.
/// </summary>
public sealed class FocusItemResponse
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Optional link to a note. Null for standalone focus items.
    /// </summary>
    public string? NoteId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>
    /// Whether this is the user's current focus.
    /// </summary>
    public bool IsCurrentFocus { get; set; }

    /// <summary>
    /// Priority level: 1 = P1 (High), 2 = P2 (Medium), 3 = P3 (Low).
    /// </summary>
    public int Priority { get; set; }

    /// <summary>
    /// Current status: pending, in_progress, completed, deferred.
    /// </summary>
    public string Status { get; set; } = "pending";

    /// <summary>
    /// Date when this item is scheduled. Null means it's in the backlog.
    /// </summary>
    public DateOnly? ScheduledDate { get; set; }

    /// <summary>
    /// Estimated time to complete in minutes.
    /// </summary>
    public int? EstimatedMinutes { get; set; }

    /// <summary>
    /// Actual time spent in minutes.
    /// </summary>
    public int? ActualMinutes { get; set; }

    /// <summary>
    /// When the item was marked as completed.
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Date to which the item was deferred.
    /// </summary>
    public DateOnly? DeferredTo { get; set; }

    /// <summary>
    /// Whether this item was suggested by AI.
    /// </summary>
    public bool AiSuggested { get; set; }

    /// <summary>
    /// Reason provided by AI for suggesting this item.
    /// </summary>
    public string? AiSuggestionReason { get; set; }

    /// <summary>
    /// AI confidence score (0-1) for suggested items.
    /// </summary>
    public float? AiConfidence { get; set; }

    /// <summary>
    /// Order within the list for manual sorting.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// When this item became the current focus. Used for time tracking.
    /// Null if not currently focused.
    /// </summary>
    public DateTime? FocusStartedAt { get; set; }

    /// <summary>
    /// Accumulated time in minutes from previous focus sessions.
    /// </summary>
    public int AccumulatedMinutes { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Linked note details (if NoteId is set and note was loaded).
    /// </summary>
    public FocusItemNoteInfo? LinkedNote { get; set; }
}

/// <summary>
/// Lightweight note info for focus item responses.
/// </summary>
public sealed class FocusItemNoteInfo
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
}

/// <summary>
/// Response model for today's plan.
/// </summary>
public sealed class TodaysPlanResponse
{
    /// <summary>
    /// The date for this plan.
    /// </summary>
    public DateOnly Date { get; set; }

    /// <summary>
    /// The current focus item (if any).
    /// </summary>
    public FocusItemResponse? CurrentFocus { get; set; }

    /// <summary>
    /// Items scheduled for this date, ordered by sort order.
    /// </summary>
    public List<FocusItemResponse> ScheduledItems { get; set; } = new();

    /// <summary>
    /// Number of items completed today.
    /// </summary>
    public int CompletedTodayCount { get; set; }

    /// <summary>
    /// Total estimated minutes for remaining items.
    /// </summary>
    public int TotalEstimatedMinutes { get; set; }

    /// <summary>
    /// Status counts for the day.
    /// </summary>
    public Dictionary<string, int> StatusCounts { get; set; } = new();
}

/// <summary>
/// Response model for backlog items.
/// </summary>
public sealed class BacklogResponse
{
    /// <summary>
    /// Backlog items (not scheduled, not completed), grouped by priority.
    /// </summary>
    public List<FocusItemResponse> Items { get; set; } = new();

    /// <summary>
    /// Total count of backlog items.
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Count by priority level.
    /// </summary>
    public Dictionary<int, int> CountByPriority { get; set; } = new();
}

/// <summary>
/// Response model for completed items query.
/// </summary>
public sealed class CompletedItemsResponse
{
    /// <summary>
    /// Start date of the range.
    /// </summary>
    public DateTime StartDate { get; set; }

    /// <summary>
    /// End date of the range.
    /// </summary>
    public DateTime EndDate { get; set; }

    /// <summary>
    /// Completed items in the date range.
    /// </summary>
    public List<FocusItemResponse> Items { get; set; } = new();

    /// <summary>
    /// Total count of completed items in range.
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Total actual minutes spent on completed items.
    /// </summary>
    public int TotalActualMinutes { get; set; }
}
