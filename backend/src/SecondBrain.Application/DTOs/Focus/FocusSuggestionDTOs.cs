namespace SecondBrain.Application.DTOs.Focus;

/// <summary>
/// Response for a persisted focus suggestion
/// </summary>
public record PersistedFocusSuggestionResponse(
    string Id,
    string Title,
    string? Description,
    int Priority,
    int? EstimatedMinutes,
    string Reason,
    float Confidence,
    string? SourceNoteId,
    string? SourceNoteTitle,
    bool IsAccepted,
    string? AcceptedFocusItemId,
    DateTime CreatedAt
);

/// <summary>
/// Response for generate suggestions endpoint with deduplication stats
/// </summary>
public record GenerateSuggestionsResponse(
    List<PersistedFocusSuggestionResponse> AllSuggestions,
    int NewSuggestionsAdded,
    int DuplicatesSkipped,
    string Context,
    DateTime GeneratedAt
);

/// <summary>
/// Request to accept a suggestion (mark as converted to FocusItem)
/// </summary>
public record AcceptSuggestionRequest(
    string FocusItemId
);

/// <summary>
/// Request to generate new suggestions
/// </summary>
public record GenerateSuggestionsRequest(
    string? CurrentFocusTitle
);
