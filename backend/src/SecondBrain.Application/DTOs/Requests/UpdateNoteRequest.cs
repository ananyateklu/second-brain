namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for updating an existing note
/// </summary>
public sealed class UpdateNoteRequest
{
    /// <summary>
    /// Title of the note
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Content/body of the note
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// List of tags associated with the note
    /// </summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Whether the note is archived
    /// </summary>
    public bool IsArchived { get; set; }

    /// <summary>
    /// Folder/category for the note
    /// </summary>
    public string? Folder { get; set; }
}

