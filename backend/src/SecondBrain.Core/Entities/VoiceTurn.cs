using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SecondBrain.Core.Entities;

/// <summary>
/// Represents a single turn (user speech or assistant response) within a voice session.
/// Each turn captures the transcript, any text content, audio URL, and token usage.
/// </summary>
[Table("voice_turns")]
public class VoiceTurn
{
    /// <summary>
    /// UUIDv7 identifier for time-ordered primary key.
    /// </summary>
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.CreateVersion7();

    /// <summary>
    /// Reference to the parent voice session.
    /// </summary>
    [Column("session_id")]
    public Guid SessionId { get; set; }

    /// <summary>
    /// Role of the speaker: "user" or "assistant".
    /// </summary>
    [Column("role")]
    [MaxLength(20)]
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Text content of the turn (for assistant, the response text).
    /// </summary>
    [Column("content")]
    public string? Content { get; set; }

    /// <summary>
    /// Transcribed text from audio (for user turns, the speech-to-text result).
    /// </summary>
    [Column("transcript_text")]
    public string? TranscriptText { get; set; }

    /// <summary>
    /// URL to the audio file if stored externally.
    /// </summary>
    [Column("audio_url")]
    [MaxLength(2048)]
    public string? AudioUrl { get; set; }

    /// <summary>
    /// When this turn occurred.
    /// </summary>
    [Column("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Input tokens used for this turn (for assistant turns).
    /// </summary>
    [Column("input_tokens")]
    public int? InputTokens { get; set; }

    /// <summary>
    /// Output tokens generated for this turn (for assistant turns).
    /// </summary>
    [Column("output_tokens")]
    public int? OutputTokens { get; set; }

    /// <summary>
    /// Duration of audio in milliseconds.
    /// </summary>
    [Column("audio_duration_ms")]
    public int? AudioDurationMs { get; set; }

    /// <summary>
    /// JSON serialized tool calls made during this turn (if any).
    /// </summary>
    [Column("tool_calls_json", TypeName = "jsonb")]
    public string? ToolCallsJson { get; set; }

    /// <summary>
    /// Navigation property back to session (ignored to prevent circular serialization).
    /// </summary>
    [ForeignKey("SessionId")]
    [JsonIgnore]
    public VoiceSession? Session { get; set; }
}

/// <summary>
/// Role constants for voice turns.
/// </summary>
public static class VoiceTurnRole
{
    public const string User = "user";
    public const string Assistant = "assistant";
}
