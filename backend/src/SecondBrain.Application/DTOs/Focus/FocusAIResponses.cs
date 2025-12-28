namespace SecondBrain.Application.DTOs.Focus;

/// <summary>
/// A single AI-generated focus suggestion
/// </summary>
public record FocusSuggestionItem(
    string Title,
    string? Description,
    int Priority,
    int? EstimatedMinutes,
    string Reason,
    string? SourceNoteId,
    string? SourceNoteTitle,
    float Confidence
);

/// <summary>
/// Response containing AI-generated focus suggestions
/// </summary>
public record FocusSuggestionsResponse(
    List<FocusSuggestionItem> Suggestions,
    string? Context,
    DateTime GeneratedAt
);

/// <summary>
/// Statistics about completed items
/// </summary>
public record CompletionStats(
    int TotalCompleted,
    int TotalMinutesTracked,
    Dictionary<int, int> CompletedByPriority,
    int StreakDays
);

/// <summary>
/// Response containing progress summary with AI insights
/// </summary>
public record ProgressSummaryResponse(
    string Period,
    DateTime StartDate,
    DateTime EndDate,
    CompletionStats Stats,
    string Summary,
    List<string> Highlights,
    string? Encouragement,
    DateTime GeneratedAt
);
