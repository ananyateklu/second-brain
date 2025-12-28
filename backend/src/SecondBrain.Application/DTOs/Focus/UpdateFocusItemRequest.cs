using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Application.DTOs.Focus;

/// <summary>
/// Request model for updating an existing focus item.
/// All properties are nullable to support partial updates - only provided fields will be updated.
/// </summary>
public sealed class UpdateFocusItemRequest
{
    /// <summary>
    /// Title of the focus item (null = don't update)
    /// </summary>
    [StringLength(500, MinimumLength = 1, ErrorMessage = "Title must be between 1 and 500 characters")]
    public string? Title { get; set; }

    /// <summary>
    /// Description providing more context (null = don't update)
    /// </summary>
    [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters")]
    public string? Description { get; set; }

    /// <summary>
    /// Flag to explicitly indicate description should be updated (to distinguish null from "clear description")
    /// </summary>
    public bool UpdateDescription { get; set; }

    /// <summary>
    /// Priority level (1 = high, 2 = medium, 3 = low) (null = don't update)
    /// </summary>
    [Range(1, 3, ErrorMessage = "Priority must be between 1 (high) and 3 (low)")]
    public int? Priority { get; set; }

    /// <summary>
    /// Scheduled date for the focus item (null = don't update)
    /// </summary>
    public DateOnly? ScheduledDate { get; set; }

    /// <summary>
    /// Flag to explicitly indicate scheduled date should be updated (to distinguish null from "clear date")
    /// </summary>
    public bool UpdateScheduledDate { get; set; }

    /// <summary>
    /// Estimated time to complete in minutes (null = don't update)
    /// </summary>
    [Range(1, 1440, ErrorMessage = "Estimated minutes must be between 1 and 1440 (24 hours)")]
    public int? EstimatedMinutes { get; set; }

    /// <summary>
    /// Flag to explicitly indicate estimated minutes should be updated (to distinguish null from "clear estimate")
    /// </summary>
    public bool UpdateEstimatedMinutes { get; set; }

    /// <summary>
    /// Whether this item is the current focus (null = don't update)
    /// </summary>
    public bool? IsCurrentFocus { get; set; }

    /// <summary>
    /// Status of the focus item: pending, in_progress, completed, deferred (null = don't update)
    /// </summary>
    public string? Status { get; set; }
}
