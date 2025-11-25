namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model for bulk note import operations
/// </summary>
public sealed class ImportNotesResponse
{
    public int ImportedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int SkippedCount { get; set; }
    public List<ImportNoteResult> Notes { get; set; } = new();
}

