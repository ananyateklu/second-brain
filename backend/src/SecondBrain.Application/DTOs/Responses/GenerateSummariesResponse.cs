namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response from generating AI summaries for notes.
/// </summary>
public sealed class GenerateSummariesResponse
{
    /// <summary>
    /// Total number of notes processed.
    /// </summary>
    public int TotalProcessed { get; set; }

    /// <summary>
    /// Number of notes that successfully had summaries generated.
    /// </summary>
    public int SuccessCount { get; set; }

    /// <summary>
    /// Number of notes that failed summary generation.
    /// </summary>
    public int FailureCount { get; set; }

    /// <summary>
    /// Number of notes skipped (e.g., already have summaries).
    /// </summary>
    public int SkippedCount { get; set; }

    /// <summary>
    /// Individual results for each note processed.
    /// </summary>
    public List<SummaryGenerationResult> Results { get; set; } = [];
}

/// <summary>
/// Result of generating a summary for a single note.
/// </summary>
public sealed class SummaryGenerationResult
{
    /// <summary>
    /// The note ID.
    /// </summary>
    public required string NoteId { get; set; }

    /// <summary>
    /// The note title.
    /// </summary>
    public required string Title { get; set; }

    /// <summary>
    /// Whether the summary was successfully generated.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The generated summary, if successful.
    /// </summary>
    public string? Summary { get; set; }

    /// <summary>
    /// Error message if generation failed.
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Whether the note was skipped (e.g., already has a summary).
    /// </summary>
    public bool Skipped { get; set; }
}
