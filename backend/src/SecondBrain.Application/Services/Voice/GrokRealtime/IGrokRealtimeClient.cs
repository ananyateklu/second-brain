namespace SecondBrain.Application.Services.Voice.GrokRealtime;

/// <summary>
/// Interface for the Grok Realtime WebSocket client (xAI Voice Agent API)
/// </summary>
public interface IGrokRealtimeClient : IAsyncDisposable
{
    /// <summary>
    /// Whether the client is currently connected
    /// </summary>
    bool IsConnected { get; }

    /// <summary>
    /// Current session ID (after connection)
    /// </summary>
    string? SessionId { get; }

    /// <summary>
    /// Connect to the Grok Realtime API
    /// </summary>
    /// <param name="config">Session configuration</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task ConnectAsync(GrokRealtimeSessionConfig config, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update the session configuration
    /// </summary>
    /// <param name="config">New session configuration</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SendSessionUpdateAsync(GrokRealtimeSessionConfig config, CancellationToken cancellationToken = default);

    /// <summary>
    /// Append audio data to the input buffer
    /// </summary>
    /// <param name="pcmAudio">Raw PCM audio data (16-bit, mono)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SendAudioAsync(byte[] pcmAudio, CancellationToken cancellationToken = default);

    /// <summary>
    /// Commit the input audio buffer (finalize user turn)
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task CommitAudioBufferAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Clear the input audio buffer
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task ClearAudioBufferAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a response (trigger model to generate)
    /// </summary>
    /// <param name="instructions">Optional per-response instructions</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task CreateResponseAsync(string? instructions = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancel the current response (interrupt)
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task CancelResponseAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Add a conversation item (e.g., text message)
    /// </summary>
    /// <param name="item">Conversation item to add</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SendConversationItemAsync(GrokConversationItem item, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send function call output back to xAI (for custom function tools)
    /// </summary>
    /// <param name="callId">The call ID from the function call event</param>
    /// <param name="output">The result of the function execution</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SendFunctionCallOutputAsync(string callId, string output, CancellationToken cancellationToken = default);

    /// <summary>
    /// Disconnect from the server
    /// </summary>
    Task DisconnectAsync();

    /// <summary>
    /// Receive events from the server as an async stream
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Async enumerable of server events</returns>
    IAsyncEnumerable<GrokRealtimeEvent> ReceiveEventsAsync(CancellationToken cancellationToken = default);
}
