using SecondBrain.Application.Services.Voice.GrokRealtime;

namespace SecondBrain.Application.Configuration;

/// <summary>
/// Configuration for Voice Agent services (STT and TTS)
/// </summary>
public class VoiceSettings
{
    public const string SectionName = "Voice";

    /// <summary>
    /// Default TTS provider to use if not specified in session (ElevenLabs, OpenAI)
    /// </summary>
    public string DefaultTTSProvider { get; set; } = "ElevenLabs";

    /// <summary>
    /// Default STT provider to use if not specified in session (Deepgram)
    /// </summary>
    public string DefaultSTTProvider { get; set; } = "Deepgram";

    /// <summary>
    /// Deepgram configuration for Speech-to-Text
    /// </summary>
    public DeepgramSettings Deepgram { get; set; } = new();

    /// <summary>
    /// ElevenLabs configuration for Text-to-Speech
    /// </summary>
    public ElevenLabsSettings ElevenLabs { get; set; } = new();

    /// <summary>
    /// OpenAI Text-to-Speech configuration
    /// </summary>
    public OpenAITTSSettings OpenAITTS { get; set; } = new();

    /// <summary>
    /// General voice feature configuration
    /// </summary>
    public VoiceFeaturesConfig Features { get; set; } = new();

    /// <summary>
    /// Grok Voice (xAI Realtime API) configuration for unified speech-to-speech
    /// </summary>
    public GrokVoiceSettings GrokVoice { get; set; } = new();
}

/// <summary>
/// Grok Voice (xAI Realtime API) configuration
/// </summary>
public class GrokVoiceSettings
{
    /// <summary>
    /// Enable Grok Voice feature
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// xAI Realtime WebSocket endpoint
    /// </summary>
    public string WebSocketUrl { get; set; } = "wss://api.x.ai/v1/realtime";

    /// <summary>
    /// Endpoint for obtaining ephemeral tokens (for client-side auth)
    /// </summary>
    public string EphemeralTokenUrl { get; set; } = "https://api.x.ai/v1/realtime/client_secrets";

    /// <summary>
    /// Default Grok voice (ara, rex, sal, eve, leo)
    /// </summary>
    public string DefaultVoice { get; set; } = "ara";

    /// <summary>
    /// Enable built-in web search tool by default
    /// </summary>
    public bool EnableWebSearch { get; set; } = true;

    /// <summary>
    /// Enable built-in X (Twitter) search tool by default
    /// </summary>
    public bool EnableXSearch { get; set; } = true;

    /// <summary>
    /// Available Grok voices
    /// </summary>
    public List<GrokVoiceInfo> AvailableVoices { get; set; } = new()
    {
        new GrokVoiceInfo { VoiceId = "ara", Name = "Ara", Description = "Warm and conversational", Category = "Grok" },
        new GrokVoiceInfo { VoiceId = "rex", Name = "Rex", Description = "Professional and clear", Category = "Grok" },
        new GrokVoiceInfo { VoiceId = "sal", Name = "Sal", Description = "Friendly and energetic", Category = "Grok" },
        new GrokVoiceInfo { VoiceId = "eve", Name = "Eve", Description = "Calm and measured", Category = "Grok" },
        new GrokVoiceInfo { VoiceId = "leo", Name = "Leo", Description = "Bold and confident", Category = "Grok" }
    };

    /// <summary>
    /// Server VAD (Voice Activity Detection) configuration
    /// </summary>
    public GrokVADSettings VAD { get; set; } = new();
}

/// <summary>
/// Grok Voice Activity Detection settings
/// </summary>
public class GrokVADSettings
{
    /// <summary>
    /// VAD activation threshold (0.0-1.0)
    /// </summary>
    public float Threshold { get; set; } = 0.5f;

    /// <summary>
    /// Milliseconds of silence before ending user's turn
    /// </summary>
    public int SilenceDurationMs { get; set; } = 500;

    /// <summary>
    /// Milliseconds of audio to include before speech detection
    /// </summary>
    public int PrefixPaddingMs { get; set; } = 300;
}

/// <summary>
/// Deepgram Speech-to-Text configuration
/// </summary>
public class DeepgramSettings
{
    /// <summary>
    /// Enable Deepgram STT service
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Deepgram API key
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// Deepgram WebSocket base URL
    /// </summary>
    public string BaseUrl { get; set; } = "wss://api.deepgram.com/v1/listen";

    /// <summary>
    /// STT model to use (nova-3 recommended for best accuracy)
    /// </summary>
    public string Model { get; set; } = "nova-3";

    /// <summary>
    /// Language code for transcription
    /// </summary>
    public string Language { get; set; } = "en";

    /// <summary>
    /// Enable automatic punctuation
    /// </summary>
    public bool PunctuationEnabled { get; set; } = true;

    /// <summary>
    /// Enable interim (partial) transcription results for real-time feedback
    /// </summary>
    public bool InterimResults { get; set; } = true;

    /// <summary>
    /// Enable speaker diarization (identify different speakers)
    /// </summary>
    public bool Diarization { get; set; } = false;

    /// <summary>
    /// Audio sample rate in Hz
    /// </summary>
    public int SampleRate { get; set; } = 16000;

    /// <summary>
    /// Audio encoding format
    /// </summary>
    public string Encoding { get; set; } = "linear16";

    /// <summary>
    /// Number of audio channels
    /// </summary>
    public int Channels { get; set; } = 1;

    /// <summary>
    /// Endpointing timeout in milliseconds (silence detection for turn-taking).
    /// Higher values = more patient (waits longer before assuming user is done speaking).
    /// Recommended: 2000-3000ms for natural conversation, 1000-1500ms for quick responses.
    /// </summary>
    public int EndpointingMs { get; set; } = 2500;

    /// <summary>
    /// Enable smart formatting (numbers, dates, etc.)
    /// </summary>
    public bool SmartFormat { get; set; } = true;

    /// <summary>
    /// Enable filler word removal (um, uh, etc.)
    /// </summary>
    public bool FillerWords { get; set; } = false;

    /// <summary>
    /// Enable profanity filter
    /// </summary>
    public bool ProfanityFilter { get; set; } = false;
}

/// <summary>
/// ElevenLabs Text-to-Speech configuration
/// </summary>
public class ElevenLabsSettings
{
    /// <summary>
    /// Enable ElevenLabs TTS service
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// ElevenLabs API key
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// ElevenLabs WebSocket base URL for streaming TTS
    /// </summary>
    public string BaseUrl { get; set; } = "wss://api.elevenlabs.io/v1/text-to-speech";

    /// <summary>
    /// ElevenLabs REST API base URL
    /// </summary>
    public string RestBaseUrl { get; set; } = "https://api.elevenlabs.io/v1";

    /// <summary>
    /// Default voice ID (Rachel by default)
    /// </summary>
    public string DefaultVoiceId { get; set; } = "21m00Tcm4TlvDq8ikWAM";

    /// <summary>
    /// TTS model to use (eleven_turbo_v2_5 for low latency)
    /// </summary>
    public string Model { get; set; } = "eleven_turbo_v2_5";

    /// <summary>
    /// Voice stability (0.0-1.0). Lower = more expressive, higher = more consistent
    /// </summary>
    public float Stability { get; set; } = 0.5f;

    /// <summary>
    /// Similarity boost (0.0-1.0). Higher = more similar to original voice
    /// </summary>
    public float SimilarityBoost { get; set; } = 0.75f;

    /// <summary>
    /// Style exaggeration (0.0-1.0). Only for v2 models
    /// </summary>
    public float Style { get; set; } = 0.0f;

    /// <summary>
    /// Enable speaker boost for clearer speech
    /// </summary>
    public bool UseSpeakerBoost { get; set; } = true;

    /// <summary>
    /// Output audio format (pcm_16000 for low latency, mp3_44100_128 for quality)
    /// </summary>
    public string OutputFormat { get; set; } = "pcm_16000";

    /// <summary>
    /// Optimize streaming latency (0-4, higher = lower latency but less quality)
    /// </summary>
    public int OptimizeStreamingLatency { get; set; } = 3;

    /// <summary>
    /// Timeout in seconds for API calls
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}

/// <summary>
/// General voice feature configuration
/// </summary>
public class VoiceFeaturesConfig
{
    /// <summary>
    /// Enable the voice agent feature
    /// </summary>
    public bool EnableVoiceAgent { get; set; } = true;

    /// <summary>
    /// Allow users to interrupt AI while it's speaking
    /// </summary>
    public bool EnableInterruption { get; set; } = true;

    /// <summary>
    /// Silence timeout in milliseconds before ending user's turn.
    /// This should match or be slightly higher than Deepgram.EndpointingMs.
    /// Higher values = agent waits longer for user to continue speaking.
    /// </summary>
    public int SilenceTimeoutMs { get; set; } = 2500;

    /// <summary>
    /// Maximum conversation duration in minutes
    /// </summary>
    public int MaxConversationMinutes { get; set; } = 30;

    /// <summary>
    /// Maximum concurrent voice sessions per user
    /// </summary>
    public int MaxConcurrentSessionsPerUser { get; set; } = 1;

    /// <summary>
    /// Session idle timeout in minutes before auto-disconnect
    /// </summary>
    public int SessionIdleTimeoutMinutes { get; set; } = 30;

    /// <summary>
    /// Interval in minutes between cleanup runs for expired sessions
    /// </summary>
    public int CleanupIntervalMinutes { get; set; } = 5;

    /// <summary>
    /// Enable voice activity detection on the server side
    /// </summary>
    public bool EnableServerVAD { get; set; } = true;

    /// <summary>
    /// Buffer size for audio chunks in bytes
    /// </summary>
    public int AudioBufferSize { get; set; } = 4096;

    /// <summary>
    /// Enable agent mode for voice sessions (tools, RAG, etc.)
    /// </summary>
    public bool EnableAgentMode { get; set; } = true;

    /// <summary>
    /// Default capabilities for voice agent sessions
    /// </summary>
    public List<string> DefaultCapabilities { get; set; } = new() { "notes", "web" };

    /// <summary>
    /// Enable automatic RAG context retrieval for voice sessions
    /// </summary>
    public bool EnableAutoRag { get; set; } = true;
}

/// <summary>
/// OpenAI Text-to-Speech configuration
/// </summary>
public class OpenAITTSSettings
{
    /// <summary>
    /// Enable OpenAI TTS service
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// OpenAI API key (can use existing AIProviders OpenAI key if not set)
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// OpenAI API base URL
    /// </summary>
    public string BaseUrl { get; set; } = "https://api.openai.com/v1";

    /// <summary>
    /// Default voice ID (alloy, echo, fable, onyx, nova, shimmer)
    /// </summary>
    public string DefaultVoiceId { get; set; } = "nova";

    /// <summary>
    /// TTS model (tts-1 for faster, tts-1-hd for higher quality)
    /// </summary>
    public string Model { get; set; } = "tts-1";

    /// <summary>
    /// Output format (mp3, opus, aac, flac, wav, pcm)
    /// </summary>
    public string ResponseFormat { get; set; } = "pcm";

    /// <summary>
    /// Speech speed (0.25 to 4.0, default 1.0)
    /// </summary>
    public double Speed { get; set; } = 1.0;

    /// <summary>
    /// Timeout in seconds for API calls
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}
