using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Application.DTOs.Focus;

/// <summary>
/// Request model for creating a focus item from an existing note.
/// </summary>
public sealed class CreateFocusFromNoteRequest
{
    /// <summary>
    /// Optional override title. If not provided, uses the note's title.
    /// </summary>
    [StringLength(500)]
    public string? Title { get; set; }

    /// <summary>
    /// Optional description for the focus item.
    /// </summary>
    [StringLength(2000)]
    public string? Description { get; set; }

    /// <summary>
    /// Priority level: 1 = P1 (High), 2 = P2 (Medium), 3 = P3 (Low).
    /// Default: 2 (Medium).
    /// </summary>
    [Range(1, 3)]
    public int Priority { get; set; } = 2;

    /// <summary>
    /// Date to schedule this item. If null, goes to backlog.
    /// </summary>
    public DateOnly? ScheduledDate { get; set; }

    /// <summary>
    /// Estimated time in minutes.
    /// </summary>
    [Range(1, 1440)]
    public int? EstimatedMinutes { get; set; }
}
