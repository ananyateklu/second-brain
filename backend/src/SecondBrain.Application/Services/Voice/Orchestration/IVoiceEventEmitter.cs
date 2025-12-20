using System.Net.WebSockets;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.Voice.Models;

namespace SecondBrain.Application.Services.Voice.Orchestration;

/// <summary>
/// Interface for emitting voice events to WebSocket clients
/// </summary>
public interface IVoiceEventEmitter
{
    /// <summary>
    /// Initialize the emitter with a WebSocket connection
    /// </summary>
    void Initialize(WebSocket webSocket);

    /// <summary>
    /// Send a state change message
    /// </summary>
    Task SendStateAsync(VoiceSessionState state, string? reason = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send session started metadata
    /// </summary>
    Task SendSessionStartedAsync(VoiceSession session, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send a transcript message (from STT)
    /// </summary>
    Task SendTranscriptAsync(TranscriptionResult result, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send an audio chunk (from TTS)
    /// </summary>
    Task SendAudioAsync(byte[] audioData, string format, int sampleRate, int sequence, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send AI response start event
    /// </summary>
    Task SendAiResponseStartAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Send AI response chunk (streaming token)
    /// </summary>
    Task SendAiResponseChunkAsync(string token, string fullText, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send AI response end event
    /// </summary>
    Task SendAiResponseEndAsync(string content, int inputTokens, int outputTokens, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send agent status message
    /// </summary>
    Task SendAgentStatusAsync(string message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send thinking step event
    /// </summary>
    Task SendThinkingStepAsync(string content, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send context retrieval event (RAG results)
    /// </summary>
    Task SendContextRetrievalAsync(AgentStreamEvent evt, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send tool call start event
    /// </summary>
    Task SendToolCallStartAsync(string? toolId, string? toolName, string? arguments, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send tool call end event
    /// </summary>
    Task SendToolCallEndAsync(string? toolId, string? toolName, string? result, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send grounding sources event (web search results)
    /// </summary>
    Task SendGroundingSourcesAsync(AgentStreamEvent evt, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send an error message
    /// </summary>
    Task SendErrorAsync(string code, string message, bool recoverable, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send a pong response
    /// </summary>
    Task SendPongAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if the WebSocket is still connected
    /// </summary>
    bool IsConnected { get; }
}
