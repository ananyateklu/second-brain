using System.Text.Json.Serialization;

namespace SecondBrain.Application.Services.Voice.Models;

/// <summary>
/// Represents an active voice conversation session
/// </summary>
public class VoiceSession
{
    /// <summary>
    /// Unique session identifier
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// User who owns this session
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Optional linked chat conversation ID for persistence
    /// </summary>
    public string? ConversationId { get; set; }

    /// <summary>
    /// Current state of the voice session
    /// </summary>
    public VoiceSessionState State { get; set; } = VoiceSessionState.Idle;

    /// <summary>
    /// AI provider being used (OpenAI, Anthropic, etc.)
    /// </summary>
    public string Provider { get; set; } = string.Empty;

    /// <summary>
    /// AI model being used
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// ElevenLabs voice ID for TTS
    /// </summary>
    public string VoiceId { get; set; } = string.Empty;

    /// <summary>
    /// When the session started
    /// </summary>
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the session ended (null if still active)
    /// </summary>
    public DateTime? EndedAt { get; set; }

    /// <summary>
    /// Last activity timestamp for idle detection
    /// </summary>
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Conversation turns in this session
    /// </summary>
    public List<VoiceTurn> Turns { get; set; } = new();

    /// <summary>
    /// Session configuration options
    /// </summary>
    public VoiceSessionOptions Options { get; set; } = new();

    /// <summary>
    /// Whether the session is currently active
    /// </summary>
    public bool IsActive => State != VoiceSessionState.Ended && EndedAt == null;

    /// <summary>
    /// Total duration of the session
    /// </summary>
    public TimeSpan Duration => (EndedAt ?? DateTime.UtcNow) - StartedAt;
}

/// <summary>
/// Possible states of a voice session
/// </summary>
public enum VoiceSessionState
{
    /// <summary>
    /// Ready to listen for user speech
    /// </summary>
    Idle,

    /// <summary>
    /// Recording user speech
    /// </summary>
    Listening,

    /// <summary>
    /// Transcribing speech and/or waiting for AI response
    /// </summary>
    Processing,

    /// <summary>
    /// AI response is being spoken
    /// </summary>
    Speaking,

    /// <summary>
    /// User interrupted the AI while speaking
    /// </summary>
    Interrupted,

    /// <summary>
    /// Session has ended
    /// </summary>
    Ended
}

/// <summary>
/// Represents a single turn in the voice conversation
/// </summary>
public class VoiceTurn
{
    /// <summary>
    /// Unique turn identifier
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Role of the speaker (user or assistant)
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Transcribed or generated text content
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// When this turn occurred
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Duration of the audio in seconds
    /// </summary>
    public double? DurationSeconds { get; set; }

    /// <summary>
    /// Transcription confidence score (0-1) for user turns
    /// </summary>
    public double? Confidence { get; set; }

    /// <summary>
    /// Token counts for AI responses
    /// </summary>
    public TokenUsage? TokenUsage { get; set; }
}

/// <summary>
/// Token usage for a voice turn
/// </summary>
public class TokenUsage
{
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
}

/// <summary>
/// Voice provider type - standard (STT+AI+TTS) vs unified (Grok Voice)
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum VoiceProviderType
{
    /// <summary>
    /// Standard voice pipeline: Deepgram STT -> AI Provider -> ElevenLabs/OpenAI TTS
    /// </summary>
    Standard,

    /// <summary>
    /// Grok Voice: Unified voice-to-voice model via xAI Realtime API
    /// </summary>
    GrokVoice
}

/// <summary>
/// Options for creating a voice session
/// </summary>
public class VoiceSessionOptions
{
    /// <summary>
    /// AI provider to use
    /// </summary>
    public string Provider { get; set; } = "OpenAI";

    /// <summary>
    /// AI model to use
    /// </summary>
    public string Model { get; set; } = "gpt-4o-mini";

    /// <summary>
    /// ElevenLabs voice ID
    /// </summary>
    public string VoiceId { get; set; } = "21m00Tcm4TlvDq8ikWAM";

    /// <summary>
    /// System prompt for the AI
    /// </summary>
    public string? SystemPrompt { get; set; }

    /// <summary>
    /// Enable RAG (retrieval-augmented generation)
    /// </summary>
    public bool EnableRag { get; set; } = false;

    /// <summary>
    /// Temperature for AI responses
    /// </summary>
    public float Temperature { get; set; } = 0.7f;

    /// <summary>
    /// Maximum tokens for AI responses
    /// </summary>
    public int MaxTokens { get; set; } = 1024;

    /// <summary>
    /// Language for speech recognition
    /// </summary>
    public string Language { get; set; } = "en";

    /// <summary>
    /// Enable agent mode with tool execution
    /// </summary>
    public bool AgentEnabled { get; set; } = false;

    /// <summary>
    /// Enabled capability IDs (e.g., ["notes", "web"])
    /// </summary>
    public List<string> Capabilities { get; set; } = new();

    /// <summary>
    /// Enable automatic RAG context retrieval for agent mode
    /// </summary>
    public bool EnableAgentRag { get; set; } = true;

    /// <summary>
    /// Voice provider type - standard (STT+AI+TTS) or GrokVoice (unified)
    /// </summary>
    public VoiceProviderType VoiceProviderType { get; set; } = VoiceProviderType.Standard;

    /// <summary>
    /// Grok voice ID (ara, rex, sal, eve, leo) - only used when VoiceProviderType is GrokVoice
    /// </summary>
    public string GrokVoice { get; set; } = "ara";

    /// <summary>
    /// Enable Grok's built-in web search tool - only for GrokVoice
    /// </summary>
    public bool EnableGrokWebSearch { get; set; } = true;

    /// <summary>
    /// Enable Grok's built-in X (Twitter) search tool - only for GrokVoice
    /// </summary>
    public bool EnableGrokXSearch { get; set; } = true;

    /// <summary>
    /// Helper to check if this is a Grok Voice session
    /// </summary>
    public bool IsGrokVoice => VoiceProviderType == VoiceProviderType.GrokVoice ||
        Provider.Equals("grok", StringComparison.OrdinalIgnoreCase) ||
        Provider.Equals("grokvoice", StringComparison.OrdinalIgnoreCase) ||
        Provider.Equals("xai", StringComparison.OrdinalIgnoreCase);
}

/// <summary>
/// Result of creating a voice session
/// </summary>
public class CreateVoiceSessionResult
{
    public string SessionId { get; set; } = string.Empty;
    public string WebSocketUrl { get; set; } = string.Empty;
    public VoiceSessionState State { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Information about an available TTS voice
/// </summary>
public class VoiceInfo
{
    /// <summary>
    /// Voice ID
    /// </summary>
    public string VoiceId { get; set; } = string.Empty;

    /// <summary>
    /// Display name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Voice description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Preview audio URL
    /// </summary>
    public string? PreviewUrl { get; set; }

    /// <summary>
    /// Voice category (premade, cloned, etc.)
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Voice labels/tags
    /// </summary>
    public Dictionary<string, string>? Labels { get; set; }
}

/// <summary>
/// Voice service health status
/// </summary>
public class VoiceServiceStatus
{
    /// <summary>
    /// Whether voice agent feature is enabled
    /// </summary>
    public bool VoiceAgentEnabled { get; set; }

    /// <summary>
    /// Default TTS provider name
    /// </summary>
    public string DefaultTTSProvider { get; set; } = string.Empty;

    /// <summary>
    /// Default STT provider name
    /// </summary>
    public string DefaultSTTProvider { get; set; } = string.Empty;

    /// <summary>
    /// Health status of all TTS providers
    /// </summary>
    public Dictionary<string, ProviderHealth> TTSProviders { get; set; } = new();

    /// <summary>
    /// Health status of all STT providers
    /// </summary>
    public Dictionary<string, ProviderHealth> STTProviders { get; set; } = new();

    // Backward compatibility properties
    public bool DeepgramAvailable { get; set; }
    public bool ElevenLabsAvailable { get; set; }
    public string? DeepgramError { get; set; }
    public string? ElevenLabsError { get; set; }

    /// <summary>
    /// Whether Grok Voice (xAI Realtime) is available
    /// </summary>
    public bool GrokVoiceAvailable { get; set; }

    /// <summary>
    /// Error message if Grok Voice is unavailable
    /// </summary>
    public string? GrokVoiceError { get; set; }
}

/// <summary>
/// Health status of a single voice provider
/// </summary>
public class ProviderHealth
{
    /// <summary>
    /// Whether the provider is currently available and responding
    /// </summary>
    public bool Available { get; set; }

    /// <summary>
    /// Whether the provider is enabled in configuration
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Error message if provider is unavailable
    /// </summary>
    public string? Error { get; set; }
}
