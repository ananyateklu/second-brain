using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Application.DTOs.Focus;

/// <summary>
/// Request model for deferring a focus item to a future date
/// </summary>
public sealed class DeferFocusItemRequest
{
    /// <summary>
    /// The date to defer the focus item to
    /// </summary>
    [Required(ErrorMessage = "Defer date is required")]
    public DateOnly DeferToDate { get; set; }
}
