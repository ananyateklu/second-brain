namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Lightweight response model for note list endpoints.
/// Contains summary instead of full content for improved performance.
/// </summary>
public sealed class NoteListResponse
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// AI-generated summary of the note (considering title, tags, and content).
    /// Used instead of full content for list views.
    /// </summary>
    public string? Summary { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsArchived { get; set; }
    public string? Folder { get; set; }
    public string Source { get; set; } = "web";
}
