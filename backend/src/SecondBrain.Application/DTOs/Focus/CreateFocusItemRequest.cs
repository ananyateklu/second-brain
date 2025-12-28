using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Application.DTOs.Focus;

/// <summary>
/// Request model for creating a new focus item
/// </summary>
public sealed class CreateFocusItemRequest
{
    /// <summary>
    /// Title of the focus item (required)
    /// </summary>
    [Required(ErrorMessage = "Title is required")]
    [StringLength(500, MinimumLength = 1, ErrorMessage = "Title must be between 1 and 500 characters")]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Optional description providing more context
    /// </summary>
    [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters")]
    public string? Description { get; set; }

    /// <summary>
    /// ID of a note to link to this focus item
    /// </summary>
    public string? NoteId { get; set; }

    /// <summary>
    /// Priority level (1 = high, 2 = medium, 3 = low). Defaults to 2.
    /// </summary>
    [Range(1, 3, ErrorMessage = "Priority must be between 1 (high) and 3 (low)")]
    public int Priority { get; set; } = 2;

    /// <summary>
    /// Scheduled date for the focus item
    /// </summary>
    public DateOnly? ScheduledDate { get; set; }

    /// <summary>
    /// Estimated time to complete in minutes
    /// </summary>
    [Range(1, 1440, ErrorMessage = "Estimated minutes must be between 1 and 1440 (24 hours)")]
    public int? EstimatedMinutes { get; set; }
}
