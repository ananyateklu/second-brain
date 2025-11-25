namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model containing note data
/// </summary>
public sealed class NoteResponse
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsArchived { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Source { get; set; } = "web";
    public string? ExternalId { get; set; }
    public string? Folder { get; set; }
}

