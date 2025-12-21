using System.Text.Json.Serialization;

namespace SecondBrain.Application.Services.Voice.Models;

// ============================================================================
// Client -> Server Messages
// ============================================================================

/// <summary>
/// Base class for all client-to-server WebSocket messages
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(AudioChunkMessage), "audio")]
[JsonDerivedType(typeof(ControlMessage), "control")]
[JsonDerivedType(typeof(ConfigMessage), "config")]
public abstract class ClientVoiceMessage
{
    [JsonPropertyName("type")]
    public abstract string Type { get; }
}

/// <summary>
/// Audio data chunk from client microphone
/// </summary>
public class AudioChunkMessage : ClientVoiceMessage
{
    [JsonPropertyName("type")]
    public override string Type => "audio";

    /// <summary>
    /// Base64-encoded audio data
    /// </summary>
    [JsonPropertyName("data")]
    public string Data { get; set; } = string.Empty;

    /// <summary>
    /// Timestamp when audio was captured
    /// </summary>
    [JsonPropertyName("timestamp")]
    public long Timestamp { get; set; }

    /// <summary>
    /// Whether this is the final chunk of the current speech segment
    /// </summary>
    [JsonPropertyName("isFinal")]
    public bool IsFinal { get; set; }
}

/// <summary>
/// Control commands from client
/// </summary>
public class ControlMessage : ClientVoiceMessage
{
    [JsonPropertyName("type")]
    public override string Type => "control";

    /// <summary>
    /// Control action to perform
    /// </summary>
    [JsonPropertyName("action")]
    public string Action { get; set; } = string.Empty;
}

/// <summary>
/// Control actions
/// </summary>
public static class ControlActions
{
    public const string Start = "start";
    public const string Stop = "stop";
    public const string Interrupt = "interrupt";
    public const string Mute = "mute";
    public const string Unmute = "unmute";
    public const string Ping = "ping";
}

/// <summary>
/// Session configuration update from client
/// </summary>
public class ConfigMessage : ClientVoiceMessage
{
    [JsonPropertyName("type")]
    public override string Type => "config";

    /// <summary>
    /// Updated session options
    /// </summary>
    [JsonPropertyName("options")]
    public VoiceSessionOptions? Options { get; set; }
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

/// <summary>
/// Base class for all server-to-client WebSocket messages
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(TranscriptMessage), "transcript")]
[JsonDerivedType(typeof(AudioMessage), "audio")]
[JsonDerivedType(typeof(StateMessage), "state")]
[JsonDerivedType(typeof(ErrorMessage), "error")]
[JsonDerivedType(typeof(MetadataMessage), "metadata")]
[JsonDerivedType(typeof(PongMessage), "pong")]
public abstract class ServerVoiceMessage
{
    [JsonPropertyName("type")]
    public abstract string Type { get; }

    [JsonPropertyName("timestamp")]
    public long Timestamp { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}

/// <summary>
/// Transcription result from STT
/// </summary>
public class TranscriptMessage : ServerVoiceMessage
{
    [JsonPropertyName("type")]
    public override string Type => "transcript";

    /// <summary>
    /// Transcribed text
    /// </summary>
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Whether this is a final (vs interim) transcript
    /// </summary>
    [JsonPropertyName("isFinal")]
    public bool IsFinal { get; set; }

    /// <summary>
    /// Confidence score (0-1)
    /// </summary>
    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    /// <summary>
    /// Start time of the speech segment
    /// </summary>
    [JsonPropertyName("start")]
    public double? Start { get; set; }

    /// <summary>
    /// End time of the speech segment
    /// </summary>
    [JsonPropertyName("end")]
    public double? End { get; set; }

    /// <summary>
    /// Detected speaker (if diarization is enabled)
    /// </summary>
    [JsonPropertyName("speaker")]
    public int? Speaker { get; set; }
}

/// <summary>
/// Audio chunk from TTS
/// </summary>
public class AudioMessage : ServerVoiceMessage
{
    [JsonPropertyName("type")]
    public override string Type => "audio";

    /// <summary>
    /// Base64-encoded audio data
    /// </summary>
    [JsonPropertyName("data")]
    public string Data { get; set; } = string.Empty;

    /// <summary>
    /// Audio format (e.g., "pcm_16000", "mp3")
    /// </summary>
    [JsonPropertyName("format")]
    public string Format { get; set; } = "pcm_16000";

    /// <summary>
    /// Sample rate in Hz
    /// </summary>
    [JsonPropertyName("sampleRate")]
    public int SampleRate { get; set; } = 16000;

    /// <summary>
    /// Whether this is the final audio chunk
    /// </summary>
    [JsonPropertyName("isFinal")]
    public bool IsFinal { get; set; }

    /// <summary>
    /// Sequence number for ordering
    /// </summary>
    [JsonPropertyName("sequence")]
    public int Sequence { get; set; }
}

/// <summary>
/// Session state change notification
/// </summary>
public class StateMessage : ServerVoiceMessage
{
    [JsonPropertyName("type")]
    public override string Type => "state";

    /// <summary>
    /// New session state
    /// </summary>
    [JsonPropertyName("state")]
    public VoiceSessionState State { get; set; }

    /// <summary>
    /// Reason for state change
    /// </summary>
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    /// <summary>
    /// Current turn ID (if applicable)
    /// </summary>
    [JsonPropertyName("turnId")]
    public string? TurnId { get; set; }
}

/// <summary>
/// Error notification
/// </summary>
public class ErrorMessage : ServerVoiceMessage
{
    [JsonPropertyName("type")]
    public override string Type => "error";

    /// <summary>
    /// Error code
    /// </summary>
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable error message
    /// </summary>
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Whether the error is recoverable
    /// </summary>
    [JsonPropertyName("recoverable")]
    public bool Recoverable { get; set; }

    /// <summary>
    /// Additional error details
    /// </summary>
    [JsonPropertyName("details")]
    public Dictionary<string, object>? Details { get; set; }
}

/// <summary>
/// Error codes for voice service errors
/// </summary>
public static class VoiceErrorCodes
{
    public const string ConnectionFailed = "CONNECTION_FAILED";
    public const string TranscriptionFailed = "TRANSCRIPTION_FAILED";
    public const string SynthesisFailed = "SYNTHESIS_FAILED";
    public const string AiProviderFailed = "AI_PROVIDER_FAILED";
    public const string SessionExpired = "SESSION_EXPIRED";
    public const string SessionNotFound = "SESSION_NOT_FOUND";
    public const string RateLimited = "RATE_LIMITED";
    public const string InvalidMessage = "INVALID_MESSAGE";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string ServiceUnavailable = "SERVICE_UNAVAILABLE";
}

/// <summary>
/// Metadata and response data
/// </summary>
public class MetadataMessage : ServerVoiceMessage
{
    [JsonPropertyName("type")]
    public override string Type => "metadata";

    /// <summary>
    /// Event name
    /// </summary>
    [JsonPropertyName("event")]
    public string Event { get; set; } = string.Empty;

    /// <summary>
    /// Event data
    /// </summary>
    [JsonPropertyName("data")]
    public Dictionary<string, object>? Data { get; set; }
}

/// <summary>
/// Metadata events
/// </summary>
public static class MetadataEvents
{
    public const string SessionStarted = "session_started";
    public const string TurnStarted = "turn_started";
    public const string TurnCompleted = "turn_completed";
    public const string TokenUsage = "token_usage";
    public const string AiResponseStart = "ai_response_start";
    public const string AiResponseChunk = "ai_response_chunk";
    public const string AiResponseEnd = "ai_response_end";

    // Agent-specific events
    public const string ToolCallStart = "tool_call_start";
    public const string ToolCallEnd = "tool_call_end";
    public const string ThinkingStep = "thinking_step";
    public const string ContextRetrieval = "context_retrieval";
    public const string AgentStatus = "agent_status";
    public const string GroundingSources = "grounding_sources";
}

/// <summary>
/// Pong response to client ping
/// </summary>
public class PongMessage : ServerVoiceMessage
{
    [JsonPropertyName("type")]
    public override string Type => "pong";
}

// ============================================================================
// Transcription Service Models
// ============================================================================

/// <summary>
/// Options for transcription
/// </summary>
public class TranscriptionOptions
{
    public string Language { get; set; } = "en";
    public bool InterimResults { get; set; } = true;
    public bool Punctuation { get; set; } = true;
    public int EndpointingMs { get; set; } = 1500;
    public bool SmartFormat { get; set; } = true;
    public bool Diarization { get; set; } = false;
    public int SampleRate { get; set; } = 16000;
    public string Encoding { get; set; } = "linear16";
    public int Channels { get; set; } = 1;
}

/// <summary>
/// Result from transcription service
/// </summary>
public class TranscriptionResult
{
    public string Text { get; set; } = string.Empty;
    public bool IsFinal { get; set; }
    public double Confidence { get; set; }
    public double? Start { get; set; }
    public double? End { get; set; }
    public int? Speaker { get; set; }
    public List<WordInfo>? Words { get; set; }
}

/// <summary>
/// Word-level transcription info
/// </summary>
public class WordInfo
{
    public string Word { get; set; } = string.Empty;
    public double Start { get; set; }
    public double End { get; set; }
    public double Confidence { get; set; }
    public int? Speaker { get; set; }
}

// ============================================================================
// Synthesis Service Models
// ============================================================================

/// <summary>
/// Options for speech synthesis
/// </summary>
public class SynthesisOptions
{
    public string VoiceId { get; set; } = "21m00Tcm4TlvDq8ikWAM";
    public string Model { get; set; } = "eleven_turbo_v2_5";
    public float Stability { get; set; } = 0.5f;
    public float SimilarityBoost { get; set; } = 0.75f;
    public float Style { get; set; } = 0.0f;
    public bool UseSpeakerBoost { get; set; } = true;
    public string OutputFormat { get; set; } = "pcm_16000";
    public int OptimizeStreamingLatency { get; set; } = 3;
}

/// <summary>
/// Request to synthesize speech
/// </summary>
public class SynthesisRequest
{
    public string Text { get; set; } = string.Empty;
    public SynthesisOptions Options { get; set; } = new();
}
