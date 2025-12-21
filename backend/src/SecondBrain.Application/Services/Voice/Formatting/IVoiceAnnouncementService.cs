namespace SecondBrain.Application.Services.Voice.Formatting;

/// <summary>
/// Service for generating TTS-friendly announcements
/// </summary>
public interface IVoiceAnnouncementService
{
    /// <summary>
    /// Get announcement text for a tool execution start
    /// </summary>
    string GetToolStartAnnouncement(string? toolName);

    /// <summary>
    /// Get announcement text for RAG context retrieval
    /// </summary>
    string GetRagAnnouncement(int noteCount);

    /// <summary>
    /// Get announcement text for thinking step
    /// </summary>
    string GetThinkingAnnouncement();

    /// <summary>
    /// Get announcement text for error recovery
    /// </summary>
    string GetErrorAnnouncement();

    /// <summary>
    /// Format a tool name for TTS (e.g., "SearchNotes" -> "search notes")
    /// </summary>
    string FormatToolName(string toolName);

    /// <summary>
    /// Spell out a number as words for TTS
    /// </summary>
    string SpellNumber(int number);

    /// <summary>
    /// Strip thinking tags from content
    /// </summary>
    string StripThinkingTags(string content);

    /// <summary>
    /// Get the voice agent system prompt
    /// </summary>
    string GetVoiceAgentSystemPrompt();

    /// <summary>
    /// Get the direct AI (non-agent) system prompt
    /// </summary>
    string GetDirectAISystemPrompt();
}
