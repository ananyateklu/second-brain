namespace SecondBrain.Application.DTOs.Voice;

/// <summary>
/// Summary of a voice session for list display.
/// Does not include turns for performance.
/// </summary>
public record VoiceSessionSummary(
    Guid Id,
    string Provider,
    string Model,
    DateTime StartedAt,
    DateTime? EndedAt,
    string Status,
    int TurnCount,
    int TotalAudioDurationMs,
    int TotalInputTokens,
    int TotalOutputTokens,
    string? FirstUserMessage
);

/// <summary>
/// Full voice session detail with all turns for transcript display.
/// </summary>
public record VoiceSessionDetail(
    Guid Id,
    string UserId,
    string Provider,
    string Model,
    DateTime StartedAt,
    DateTime? EndedAt,
    string Status,
    int TotalInputTokens,
    int TotalOutputTokens,
    int TotalAudioDurationMs,
    string? OptionsJson,
    IReadOnlyList<VoiceTurnDto> Turns
);

/// <summary>
/// Voice turn for transcript display.
/// </summary>
public record VoiceTurnDto(
    Guid Id,
    string Role,
    string? Content,
    string? TranscriptText,
    DateTime Timestamp,
    int? InputTokens,
    int? OutputTokens,
    int? AudioDurationMs,
    string? ToolCallsJson
);

/// <summary>
/// Paginated response for voice session history.
/// </summary>
public record VoiceSessionHistoryResponse(
    IReadOnlyList<VoiceSessionSummary> Sessions,
    int TotalCount,
    int Page,
    int PageSize
)
{
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}

/// <summary>
/// Request to create a new voice session.
/// </summary>
public record CreateVoiceSessionRequest(
    string Provider,
    string Model,
    string? VoiceId,
    string? SystemPrompt,
    bool? AgentEnabled,
    string[]? Capabilities,
    string? VoiceProviderType,
    string? GrokVoice,
    bool? EnableGrokWebSearch,
    bool? EnableGrokXSearch
);

/// <summary>
/// Response after creating a voice session.
/// </summary>
public record CreateVoiceSessionResponse(
    Guid SessionId,
    string WebSocketUrl,
    string Status
);
