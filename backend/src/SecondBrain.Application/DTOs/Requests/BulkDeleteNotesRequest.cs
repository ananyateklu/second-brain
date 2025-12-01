namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for bulk deleting notes
/// </summary>
public class BulkDeleteNotesRequest
{
    /// <summary>
    /// List of note IDs to delete
    /// </summary>
    public List<string> NoteIds { get; set; } = new();
}

