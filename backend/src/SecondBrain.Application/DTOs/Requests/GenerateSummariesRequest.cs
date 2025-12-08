namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request to generate AI summaries for specific notes.
/// </summary>
public sealed class GenerateSummariesRequest
{
    /// <summary>
    /// List of note IDs to generate summaries for.
    /// If empty, generates summaries for all notes without summaries.
    /// </summary>
    public List<string> NoteIds { get; set; } = [];
}
