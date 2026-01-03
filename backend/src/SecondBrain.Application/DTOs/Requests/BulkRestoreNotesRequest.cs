namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for bulk restoring notes from trash
/// </summary>
public class BulkRestoreNotesRequest
{
    /// <summary>
    /// List of note IDs to restore
    /// </summary>
    public List<string> NoteIds { get; set; } = new();
}
