namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Result information for a single imported note
/// </summary>
public sealed class ImportNoteResult
{
    public string Title { get; set; } = string.Empty;
    public string? Id { get; set; }
    public string Status { get; set; } = "created"; // "created" | "updated" | "skipped"
    public string? Message { get; set; }
}

