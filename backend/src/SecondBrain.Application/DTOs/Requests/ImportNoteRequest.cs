namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for importing a note from external source
/// </summary>
public sealed class ImportNoteRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Folder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public string Source { get; set; } = "ios_notes";
    public string? ExternalId { get; set; }
    public List<string> Tags { get; set; } = new();
}

