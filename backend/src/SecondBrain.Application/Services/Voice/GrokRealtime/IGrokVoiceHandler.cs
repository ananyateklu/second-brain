using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Application.Services.Voice.Orchestration;

namespace SecondBrain.Application.Services.Voice.GrokRealtime;

/// <summary>
/// Interface for handling Grok Voice (xAI Realtime) sessions.
/// Unlike standard voice processors, this handles audio-to-audio directly.
/// </summary>
public interface IGrokVoiceHandler : IAsyncDisposable
{
    /// <summary>
    /// Whether the handler is currently connected to xAI Realtime
    /// </summary>
    bool IsConnected { get; }

    /// <summary>
    /// Initialize the Grok Voice session
    /// </summary>
    /// <param name="session">Voice session configuration</param>
    /// <param name="eventEmitter">Event emitter for sending events to frontend</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InitializeAsync(
        VoiceSession session,
        IVoiceEventEmitter eventEmitter,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Process incoming audio from the frontend
    /// </summary>
    /// <param name="audioData">Raw PCM audio data</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task ProcessAudioAsync(byte[] audioData, CancellationToken cancellationToken = default);

    /// <summary>
    /// Handle an interrupt (user started speaking while AI was responding)
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InterruptAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Start the event processing loop (call after Initialize)
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task RunEventLoopAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Disconnect from xAI Realtime
    /// </summary>
    Task DisconnectAsync();
}
