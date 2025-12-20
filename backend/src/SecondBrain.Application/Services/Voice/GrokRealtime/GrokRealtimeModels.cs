using System.Text.Json.Serialization;

namespace SecondBrain.Application.Services.Voice.GrokRealtime;

#region Session Configuration

/// <summary>
/// Configuration for a Grok Realtime session
/// </summary>
public class GrokRealtimeSessionConfig
{
    /// <summary>
    /// Voice to use for audio output (ara, rex, sal, eve, leo)
    /// </summary>
    [JsonPropertyName("voice")]
    public string Voice { get; set; } = "ara";

    /// <summary>
    /// Modalities to enable (text, audio)
    /// </summary>
    [JsonPropertyName("modalities")]
    public List<string> Modalities { get; set; } = new() { "text", "audio" };

    /// <summary>
    /// Input audio format (pcm16, g711_ulaw, g711_alaw)
    /// </summary>
    [JsonPropertyName("input_audio_format")]
    public string InputAudioFormat { get; set; } = "pcm16";

    /// <summary>
    /// Output audio format (pcm16, g711_ulaw, g711_alaw)
    /// </summary>
    [JsonPropertyName("output_audio_format")]
    public string OutputAudioFormat { get; set; } = "pcm16";

    /// <summary>
    /// System instructions for the model
    /// </summary>
    [JsonPropertyName("instructions")]
    public string? Instructions { get; set; }

    /// <summary>
    /// Turn detection configuration (server VAD)
    /// </summary>
    [JsonPropertyName("turn_detection")]
    public GrokTurnDetection? TurnDetection { get; set; }

    /// <summary>
    /// Tools available to the model
    /// </summary>
    [JsonPropertyName("tools")]
    public List<GrokRealtimeTool>? Tools { get; set; }

    /// <summary>
    /// Whether to enable input audio transcription
    /// </summary>
    [JsonPropertyName("input_audio_transcription")]
    public GrokInputAudioTranscription? InputAudioTranscription { get; set; }

    /// <summary>
    /// Temperature for response generation (0.6-1.2)
    /// </summary>
    [JsonPropertyName("temperature")]
    public float? Temperature { get; set; }

    /// <summary>
    /// Maximum tokens for response
    /// </summary>
    [JsonPropertyName("max_response_output_tokens")]
    public int? MaxResponseOutputTokens { get; set; }
}

/// <summary>
/// Turn detection configuration for server-side VAD
/// </summary>
public class GrokTurnDetection
{
    /// <summary>
    /// Type of turn detection (server_vad)
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = "server_vad";

    /// <summary>
    /// Activation threshold (0.0-1.0)
    /// </summary>
    [JsonPropertyName("threshold")]
    public float Threshold { get; set; } = 0.5f;

    /// <summary>
    /// Milliseconds of audio to include before speech starts
    /// </summary>
    [JsonPropertyName("prefix_padding_ms")]
    public int PrefixPaddingMs { get; set; } = 300;

    /// <summary>
    /// Milliseconds of silence before turn ends
    /// </summary>
    [JsonPropertyName("silence_duration_ms")]
    public int SilenceDurationMs { get; set; } = 500;

    /// <summary>
    /// Whether to automatically create a response after turn ends
    /// </summary>
    [JsonPropertyName("create_response")]
    public bool CreateResponse { get; set; } = true;

    /// <summary>
    /// Whether user speech can interrupt model output
    /// </summary>
    [JsonPropertyName("interrupt_response")]
    public bool InterruptResponse { get; set; } = true;
}

/// <summary>
/// Input audio transcription configuration
/// </summary>
public class GrokInputAudioTranscription
{
    /// <summary>
    /// Model to use for transcription
    /// </summary>
    [JsonPropertyName("model")]
    public string Model { get; set; } = "whisper-1";
}

#endregion

#region Tools

/// <summary>
/// Tool definition for Grok Realtime
/// </summary>
public class GrokRealtimeTool
{
    /// <summary>
    /// Tool type (function, web_search, x_search)
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = "function";

    /// <summary>
    /// Function name (for function type)
    /// </summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Function description
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Function parameters schema (JSON Schema)
    /// </summary>
    [JsonPropertyName("parameters")]
    public object? Parameters { get; set; }

    /// <summary>
    /// Create a web_search tool (built-in xAI tool - only type is needed)
    /// </summary>
    public static GrokRealtimeTool WebSearch() => new()
    {
        Type = "web_search"
        // Note: Built-in tools don't need name, description, or parameters
    };

    /// <summary>
    /// Create an x_search tool for searching X/Twitter (built-in xAI tool - only type is needed)
    /// </summary>
    public static GrokRealtimeTool XSearch() => new()
    {
        Type = "x_search"
        // Note: Built-in tools don't need name, description, or parameters
    };

    /// <summary>
    /// Create a custom function tool
    /// </summary>
    public static GrokRealtimeTool CustomFunction(string name, string description, object parameters) => new()
    {
        Type = "function",
        Name = name,
        Description = description,
        Parameters = parameters
    };
}

#endregion

#region Client Messages (Client → Server)

/// <summary>
/// Base class for client messages
/// </summary>
public abstract class GrokClientMessage
{
    [JsonPropertyName("type")]
    public abstract string Type { get; }

    [JsonPropertyName("event_id")]
    public string? EventId { get; set; }
}

/// <summary>
/// Update session configuration
/// </summary>
public class GrokSessionUpdateMessage : GrokClientMessage
{
    public override string Type => "session.update";

    [JsonPropertyName("session")]
    public GrokRealtimeSessionConfig Session { get; set; } = new();
}

/// <summary>
/// Append audio to the input buffer
/// </summary>
public class GrokInputAudioBufferAppendMessage : GrokClientMessage
{
    public override string Type => "input_audio_buffer.append";

    /// <summary>
    /// Base64-encoded audio data
    /// </summary>
    [JsonPropertyName("audio")]
    public string Audio { get; set; } = string.Empty;
}

/// <summary>
/// Commit the input audio buffer (finalize user turn)
/// </summary>
public class GrokInputAudioBufferCommitMessage : GrokClientMessage
{
    public override string Type => "input_audio_buffer.commit";
}

/// <summary>
/// Clear the input audio buffer
/// </summary>
public class GrokInputAudioBufferClearMessage : GrokClientMessage
{
    public override string Type => "input_audio_buffer.clear";
}

/// <summary>
/// Create a response
/// </summary>
public class GrokResponseCreateMessage : GrokClientMessage
{
    public override string Type => "response.create";

    [JsonPropertyName("response")]
    public GrokResponseConfig? Response { get; set; }
}

/// <summary>
/// Response configuration
/// </summary>
public class GrokResponseConfig
{
    [JsonPropertyName("modalities")]
    public List<string>? Modalities { get; set; }

    [JsonPropertyName("instructions")]
    public string? Instructions { get; set; }
}

/// <summary>
/// Cancel the current response
/// </summary>
public class GrokResponseCancelMessage : GrokClientMessage
{
    public override string Type => "response.cancel";
}

/// <summary>
/// Add a conversation item
/// </summary>
public class GrokConversationItemCreateMessage : GrokClientMessage
{
    public override string Type => "conversation.item.create";

    [JsonPropertyName("item")]
    public GrokConversationItem Item { get; set; } = new();
}

/// <summary>
/// Truncate conversation item (for interruption)
/// </summary>
public class GrokConversationItemTruncateMessage : GrokClientMessage
{
    public override string Type => "conversation.item.truncate";

    [JsonPropertyName("item_id")]
    public string ItemId { get; set; } = string.Empty;

    [JsonPropertyName("content_index")]
    public int ContentIndex { get; set; }

    [JsonPropertyName("audio_end_ms")]
    public int AudioEndMs { get; set; }
}

/// <summary>
/// Send function call output back to xAI (for custom function tools)
/// </summary>
public class GrokFunctionCallOutputMessage : GrokClientMessage
{
    public override string Type => "conversation.item.create";

    [JsonPropertyName("item")]
    public GrokFunctionCallOutputItem Item { get; set; } = new();
}

/// <summary>
/// Function call output item to send tool execution results back to xAI
/// </summary>
public class GrokFunctionCallOutputItem
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "function_call_output";

    [JsonPropertyName("call_id")]
    public string CallId { get; set; } = string.Empty;

    [JsonPropertyName("output")]
    public string Output { get; set; } = string.Empty;
}

/// <summary>
/// Conversation item
/// </summary>
public class GrokConversationItem
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = "message";

    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";

    [JsonPropertyName("content")]
    public List<GrokConversationContent>? Content { get; set; }
}

/// <summary>
/// Conversation content
/// </summary>
public class GrokConversationContent
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "input_text";

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("audio")]
    public string? Audio { get; set; }

    [JsonPropertyName("transcript")]
    public string? Transcript { get; set; }
}

#endregion

#region Server Events (Server → Client)

/// <summary>
/// Types of server events
/// </summary>
public enum GrokRealtimeEventType
{
    Unknown,
    Error,
    SessionCreated,
    SessionUpdated,
    InputAudioBufferCommitted,
    InputAudioBufferCleared,
    InputAudioBufferSpeechStarted,
    InputAudioBufferSpeechStopped,
    ConversationCreated,
    ConversationItemCreated,
    ConversationItemInputAudioTranscriptionCompleted,
    ConversationItemInputAudioTranscriptionFailed,
    ConversationItemTruncated,
    ConversationItemDeleted,
    ResponseCreated,
    ResponseDone,
    ResponseOutputItemAdded,
    ResponseOutputItemDone,
    ResponseContentPartAdded,
    ResponseContentPartDone,
    ResponseTextDelta,
    ResponseTextDone,
    ResponseAudioDelta,
    ResponseAudioDone,
    ResponseAudioTranscriptDelta,
    ResponseAudioTranscriptDone,
    ResponseFunctionCallArgumentsDelta,
    ResponseFunctionCallArgumentsDone,
    RateLimitsUpdated
}

/// <summary>
/// Base class for server events
/// </summary>
public class GrokRealtimeEvent
{
    [JsonPropertyName("type")]
    public string TypeString { get; set; } = string.Empty;

    [JsonPropertyName("event_id")]
    public string? EventId { get; set; }

    [JsonIgnore]
    public GrokRealtimeEventType EventType { get; set; } = GrokRealtimeEventType.Unknown;
}

/// <summary>
/// Error event
/// </summary>
public class GrokErrorEvent : GrokRealtimeEvent
{
    [JsonPropertyName("error")]
    public GrokError? Error { get; set; }
}

/// <summary>
/// Error details
/// </summary>
public class GrokError
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("param")]
    public string? Param { get; set; }
}

/// <summary>
/// Session created event
/// </summary>
public class GrokSessionCreatedEvent : GrokRealtimeEvent
{
    [JsonPropertyName("session")]
    public GrokSessionInfo? Session { get; set; }
}

/// <summary>
/// Session info
/// </summary>
public class GrokSessionInfo
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("model")]
    public string? Model { get; set; }

    [JsonPropertyName("voice")]
    public string? Voice { get; set; }

    [JsonPropertyName("modalities")]
    public List<string>? Modalities { get; set; }
}

/// <summary>
/// Speech started event
/// </summary>
public class GrokSpeechStartedEvent : GrokRealtimeEvent
{
    [JsonPropertyName("audio_start_ms")]
    public int AudioStartMs { get; set; }

    [JsonPropertyName("item_id")]
    public string? ItemId { get; set; }
}

/// <summary>
/// Speech stopped event
/// </summary>
public class GrokSpeechStoppedEvent : GrokRealtimeEvent
{
    [JsonPropertyName("audio_end_ms")]
    public int AudioEndMs { get; set; }

    [JsonPropertyName("item_id")]
    public string? ItemId { get; set; }
}

/// <summary>
/// Transcription completed event
/// </summary>
public class GrokTranscriptionCompletedEvent : GrokRealtimeEvent
{
    [JsonPropertyName("item_id")]
    public string? ItemId { get; set; }

    [JsonPropertyName("content_index")]
    public int ContentIndex { get; set; }

    [JsonPropertyName("transcript")]
    public string? Transcript { get; set; }
}

/// <summary>
/// Response created event
/// </summary>
public class GrokResponseCreatedEvent : GrokRealtimeEvent
{
    [JsonPropertyName("response")]
    public GrokResponseInfo? Response { get; set; }
}

/// <summary>
/// Response info
/// </summary>
public class GrokResponseInfo
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("output")]
    public List<GrokResponseOutput>? Output { get; set; }
}

/// <summary>
/// Response output item
/// </summary>
public class GrokResponseOutput
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("content")]
    public List<GrokResponseContent>? Content { get; set; }
}

/// <summary>
/// Response content
/// </summary>
public class GrokResponseContent
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("transcript")]
    public string? Transcript { get; set; }
}

/// <summary>
/// Response done event
/// </summary>
public class GrokResponseDoneEvent : GrokRealtimeEvent
{
    [JsonPropertyName("response")]
    public GrokResponseDoneInfo? Response { get; set; }
}

/// <summary>
/// Response done info with usage
/// </summary>
public class GrokResponseDoneInfo
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("usage")]
    public GrokUsageInfo? Usage { get; set; }
}

/// <summary>
/// Usage information
/// </summary>
public class GrokUsageInfo
{
    [JsonPropertyName("total_tokens")]
    public int TotalTokens { get; set; }

    [JsonPropertyName("input_tokens")]
    public int InputTokens { get; set; }

    [JsonPropertyName("output_tokens")]
    public int OutputTokens { get; set; }

    [JsonPropertyName("input_token_details")]
    public GrokTokenDetails? InputTokenDetails { get; set; }

    [JsonPropertyName("output_token_details")]
    public GrokTokenDetails? OutputTokenDetails { get; set; }
}

/// <summary>
/// Token details
/// </summary>
public class GrokTokenDetails
{
    [JsonPropertyName("cached_tokens")]
    public int CachedTokens { get; set; }

    [JsonPropertyName("text_tokens")]
    public int TextTokens { get; set; }

    [JsonPropertyName("audio_tokens")]
    public int AudioTokens { get; set; }
}

/// <summary>
/// Audio delta event
/// </summary>
public class GrokAudioDeltaEvent : GrokRealtimeEvent
{
    [JsonPropertyName("response_id")]
    public string? ResponseId { get; set; }

    [JsonPropertyName("item_id")]
    public string? ItemId { get; set; }

    [JsonPropertyName("output_index")]
    public int OutputIndex { get; set; }

    [JsonPropertyName("content_index")]
    public int ContentIndex { get; set; }

    /// <summary>
    /// Base64-encoded audio delta
    /// </summary>
    [JsonPropertyName("delta")]
    public string? Delta { get; set; }
}

/// <summary>
/// Audio done event
/// </summary>
public class GrokAudioDoneEvent : GrokRealtimeEvent
{
    [JsonPropertyName("response_id")]
    public string? ResponseId { get; set; }

    [JsonPropertyName("item_id")]
    public string? ItemId { get; set; }

    [JsonPropertyName("output_index")]
    public int OutputIndex { get; set; }

    [JsonPropertyName("content_index")]
    public int ContentIndex { get; set; }
}

/// <summary>
/// Text delta event
/// </summary>
public class GrokTextDeltaEvent : GrokRealtimeEvent
{
    [JsonPropertyName("response_id")]
    public string? ResponseId { get; set; }

    [JsonPropertyName("item_id")]
    public string? ItemId { get; set; }

    [JsonPropertyName("output_index")]
    public int OutputIndex { get; set; }

    [JsonPropertyName("content_index")]
    public int ContentIndex { get; set; }

    [JsonPropertyName("delta")]
    public string? Delta { get; set; }
}

/// <summary>
/// Audio transcript delta event
/// </summary>
public class GrokAudioTranscriptDeltaEvent : GrokRealtimeEvent
{
    [JsonPropertyName("response_id")]
    public string? ResponseId { get; set; }

    [JsonPropertyName("item_id")]
    public string? ItemId { get; set; }

    [JsonPropertyName("output_index")]
    public int OutputIndex { get; set; }

    [JsonPropertyName("content_index")]
    public int ContentIndex { get; set; }

    [JsonPropertyName("delta")]
    public string? Delta { get; set; }
}

/// <summary>
/// Function call arguments delta event
/// </summary>
public class GrokFunctionCallArgumentsDeltaEvent : GrokRealtimeEvent
{
    [JsonPropertyName("response_id")]
    public string? ResponseId { get; set; }

    [JsonPropertyName("item_id")]
    public string? ItemId { get; set; }

    [JsonPropertyName("output_index")]
    public int OutputIndex { get; set; }

    [JsonPropertyName("call_id")]
    public string? CallId { get; set; }

    [JsonPropertyName("delta")]
    public string? Delta { get; set; }
}

/// <summary>
/// Function call arguments done event
/// </summary>
public class GrokFunctionCallArgumentsDoneEvent : GrokRealtimeEvent
{
    [JsonPropertyName("response_id")]
    public string? ResponseId { get; set; }

    [JsonPropertyName("item_id")]
    public string? ItemId { get; set; }

    [JsonPropertyName("output_index")]
    public int OutputIndex { get; set; }

    [JsonPropertyName("call_id")]
    public string? CallId { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("arguments")]
    public string? Arguments { get; set; }
}

/// <summary>
/// Rate limits event
/// </summary>
public class GrokRateLimitsEvent : GrokRealtimeEvent
{
    [JsonPropertyName("rate_limits")]
    public List<GrokRateLimit>? RateLimits { get; set; }
}

/// <summary>
/// Rate limit info
/// </summary>
public class GrokRateLimit
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("limit")]
    public int Limit { get; set; }

    [JsonPropertyName("remaining")]
    public int Remaining { get; set; }

    [JsonPropertyName("reset_seconds")]
    public float ResetSeconds { get; set; }
}

#endregion

#region Voice Info

/// <summary>
/// Information about a Grok voice
/// </summary>
public class GrokVoiceInfo
{
    /// <summary>
    /// Voice ID (ara, rex, sal, eve, leo)
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
    /// Voice category
    /// </summary>
    public string Category { get; set; } = "Grok";
}

#endregion
