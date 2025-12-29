using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Application.DTOs.Focus;

/// <summary>
/// Request model for bulk reordering focus items
/// </summary>
public sealed class ReorderFocusItemsRequest
{
    /// <summary>
    /// List of items with their new sort order
    /// </summary>
    [Required(ErrorMessage = "Items list is required")]
    [MinLength(1, ErrorMessage = "At least one item must be provided")]
    public List<FocusItemSortOrder> Items { get; set; } = new();
}

/// <summary>
/// Represents a focus item's new sort order
/// </summary>
public sealed class FocusItemSortOrder
{
    /// <summary>
    /// ID of the focus item
    /// </summary>
    [Required(ErrorMessage = "Item ID is required")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// New sort order value
    /// </summary>
    [Range(0, int.MaxValue, ErrorMessage = "Sort order must be a non-negative integer")]
    public int SortOrder { get; set; }
}
