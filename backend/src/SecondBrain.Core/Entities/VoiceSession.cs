using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SecondBrain.Core.Entities;

/// <summary>
/// Represents a voice conversation session between a user and an AI assistant.
/// Tracks the full lifecycle of a voice interaction including start/end times,
/// provider/model used, and aggregated token usage.
/// </summary>
[Table("voice_sessions")]
public class VoiceSession
{
    /// <summary>
    /// UUIDv7 identifier for time-ordered primary key.
    /// </summary>
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.CreateVersion7();

    /// <summary>
    /// User who initiated the voice session.
    /// </summary>
    [Column("user_id")]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// AI provider used for this session (e.g., "OpenAI", "Grok", "ElevenLabs").
    /// </summary>
    [Column("provider")]
    [MaxLength(50)]
    public string Provider { get; set; } = string.Empty;

    /// <summary>
    /// AI model used for this session (e.g., "gpt-4o-realtime", "grok-beta").
    /// </summary>
    [Column("model")]
    [MaxLength(100)]
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// When the voice session started.
    /// </summary>
    [Column("started_at")]
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the voice session ended (null if still active).
    /// </summary>
    [Column("ended_at")]
    public DateTime? EndedAt { get; set; }

    /// <summary>
    /// Current status of the session: "active", "ended", "error".
    /// </summary>
    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = VoiceSessionStatus.Active;

    /// <summary>
    /// JSON serialized session options (voice settings, system prompt, etc.).
    /// </summary>
    [Column("options_json", TypeName = "jsonb")]
    public string? OptionsJson { get; set; }

    /// <summary>
    /// Total input tokens used across all turns in this session.
    /// </summary>
    [Column("total_input_tokens")]
    public int TotalInputTokens { get; set; }

    /// <summary>
    /// Total output tokens used across all turns in this session.
    /// </summary>
    [Column("total_output_tokens")]
    public int TotalOutputTokens { get; set; }

    /// <summary>
    /// Total audio duration in milliseconds across all turns.
    /// </summary>
    [Column("total_audio_duration_ms")]
    public int TotalAudioDurationMs { get; set; }

    /// <summary>
    /// When this record was created.
    /// </summary>
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property for turns in this session.
    /// </summary>
    public ICollection<VoiceTurn> Turns { get; set; } = new List<VoiceTurn>();

    /// <summary>
    /// Computed property for session duration.
    /// </summary>
    [NotMapped]
    public TimeSpan? Duration => EndedAt.HasValue ? EndedAt.Value - StartedAt : null;

    /// <summary>
    /// Computed property to check if session is still active.
    /// </summary>
    [NotMapped]
    public bool IsActive => Status == VoiceSessionStatus.Active && !EndedAt.HasValue;
}

/// <summary>
/// Status constants for voice sessions.
/// </summary>
public static class VoiceSessionStatus
{
    public const string Active = "active";
    public const string Ended = "ended";
    public const string Error = "error";
}
