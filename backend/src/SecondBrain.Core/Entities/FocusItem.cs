using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Core.Entities;

/// <summary>
/// Status of a focus item.
/// </summary>
public enum FocusItemStatus
{
    /// <summary>Item is waiting to be started</summary>
    Pending = 0,

    /// <summary>Item is currently being worked on</summary>
    InProgress = 1,

    /// <summary>Item has been completed</summary>
    Completed = 2,

    /// <summary>Item has been deferred to another date</summary>
    Deferred = 3
}

/// <summary>
/// Represents a focus/task item for productivity management.
/// Supports single current focus and priority levels (P1/P2/P3).
/// </summary>
[Table("focus_items")]
public class FocusItem : ISoftDeletable
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("user_id")]
    [MaxLength(128)]
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Optional link to a note. Allows focus items to be standalone or note-based.
    /// </summary>
    [Column("note_id")]
    public string? NoteId { get; set; }

    [Column("title")]
    [MaxLength(500)]
    [Required]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Whether this is the user's current focus. Only one item per user can have this set to true.
    /// </summary>
    [Column("is_current_focus")]
    public bool IsCurrentFocus { get; set; }

    /// <summary>
    /// Priority level: 1 = P1 (High), 2 = P2 (Medium), 3 = P3 (Low).
    /// </summary>
    [Column("priority")]
    [Range(1, 3)]
    public int Priority { get; set; } = 2;

    /// <summary>
    /// Current status of the focus item.
    /// </summary>
    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    /// <summary>
    /// Date when this item is scheduled. Null means it's in the backlog.
    /// </summary>
    [Column("scheduled_date")]
    public DateOnly? ScheduledDate { get; set; }

    /// <summary>
    /// Estimated time to complete in minutes.
    /// </summary>
    [Column("estimated_minutes")]
    public int? EstimatedMinutes { get; set; }

    /// <summary>
    /// Actual time spent in minutes.
    /// </summary>
    [Column("actual_minutes")]
    public int? ActualMinutes { get; set; }

    /// <summary>
    /// When the item was marked as completed.
    /// </summary>
    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Date to which the item was deferred.
    /// </summary>
    [Column("deferred_to")]
    public DateOnly? DeferredTo { get; set; }

    /// <summary>
    /// Whether this item was suggested by AI based on user's notes.
    /// </summary>
    [Column("ai_suggested")]
    public bool AiSuggested { get; set; }

    /// <summary>
    /// Reason provided by AI for suggesting this item.
    /// </summary>
    [Column("ai_suggestion_reason")]
    public string? AiSuggestionReason { get; set; }

    /// <summary>
    /// AI confidence score (0-1) for suggested items.
    /// </summary>
    [Column("ai_confidence")]
    public float? AiConfidence { get; set; }

    /// <summary>
    /// Order within the list for manual sorting.
    /// </summary>
    [Column("sort_order")]
    public int SortOrder { get; set; }

    /// <summary>
    /// When this item became the current focus. Used for time tracking.
    /// Null if not currently focused.
    /// </summary>
    [Column("focus_started_at")]
    public DateTime? FocusStartedAt { get; set; }

    /// <summary>
    /// Accumulated time in minutes from previous focus sessions.
    /// When focus is cleared without completing, elapsed time is added here.
    /// </summary>
    [Column("accumulated_minutes")]
    public int AccumulatedMinutes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Soft delete properties (ISoftDeletable)
    [Column("is_deleted")]
    public bool IsDeleted { get; set; }

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    [Column("deleted_by")]
    [MaxLength(128)]
    public string? DeletedBy { get; set; }

    // Navigation properties
    public Note? Note { get; set; }

    /// <summary>
    /// Gets the status as an enum value.
    /// </summary>
    [NotMapped]
    public FocusItemStatus StatusEnum => Status?.ToLowerInvariant() switch
    {
        "pending" => FocusItemStatus.Pending,
        "in_progress" => FocusItemStatus.InProgress,
        "completed" => FocusItemStatus.Completed,
        "deferred" => FocusItemStatus.Deferred,
        _ => FocusItemStatus.Pending
    };

    /// <summary>
    /// Sets the status from an enum value.
    /// </summary>
    public void SetStatus(FocusItemStatus status)
    {
        Status = status switch
        {
            FocusItemStatus.Pending => "pending",
            FocusItemStatus.InProgress => "in_progress",
            FocusItemStatus.Completed => "completed",
            FocusItemStatus.Deferred => "deferred",
            _ => "pending"
        };
    }
}
