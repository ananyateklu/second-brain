namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model for trash (soft-deleted notes) endpoint.
/// </summary>
public sealed class TrashNotesResponse
{
    /// <summary>
    /// List of deleted notes
    /// </summary>
    public List<TrashNoteItem> Items { get; set; } = new();

    /// <summary>
    /// Total count of deleted notes
    /// </summary>
    public int TotalCount { get; set; }
}

/// <summary>
/// Lightweight item for trash note list.
/// Includes deletion metadata.
/// </summary>
public sealed class TrashNoteItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// AI-generated summary of the note.
    /// </summary>
    public string? Summary { get; set; }

    public List<string> Tags { get; set; } = new();
    public string? Folder { get; set; }

    /// <summary>
    /// When the note was soft-deleted
    /// </summary>
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// User ID who deleted the note
    /// </summary>
    public string? DeletedBy { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
