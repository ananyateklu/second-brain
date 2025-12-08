namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Service interface for generating AI-powered note summaries.
/// Summaries consider title, tags, and content for full context.
/// </summary>
public interface INoteSummaryService
{
    /// <summary>
    /// Generates a concise summary of a note using AI.
    /// </summary>
    /// <param name="title">The note title</param>
    /// <param name="content">The note content</param>
    /// <param name="tags">The note tags</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A 1-2 sentence summary of the note</returns>
    Task<string?> GenerateSummaryAsync(
        string title,
        string content,
        List<string> tags,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Determines whether a summary should be regenerated based on content changes.
    /// </summary>
    /// <param name="oldContent">Previous content</param>
    /// <param name="newContent">Updated content</param>
    /// <param name="oldTitle">Previous title</param>
    /// <param name="newTitle">Updated title</param>
    /// <param name="oldTags">Previous tags</param>
    /// <param name="newTags">Updated tags</param>
    /// <returns>True if summary should be regenerated</returns>
    bool ShouldRegenerateSummary(
        string? oldContent,
        string? newContent,
        string? oldTitle,
        string? newTitle,
        List<string>? oldTags,
        List<string>? newTags);

    /// <summary>
    /// Checks if the summary generation feature is enabled.
    /// </summary>
    bool IsEnabled { get; }
}
