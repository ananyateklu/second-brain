using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Application.Services.Voice.Orchestration;

namespace SecondBrain.Application.Services.Voice.Synthesis;

/// <summary>
/// Interface for orchestrating TTS (Text-to-Speech) synthesis
/// </summary>
public interface ITTSOrchestrator : IAsyncDisposable
{
    /// <summary>
    /// Initialize the TTS orchestrator with session options
    /// </summary>
    /// <param name="options">Synthesis options</param>
    /// <param name="eventEmitter">Event emitter for sending audio</param>
    /// <param name="sessionId">Session ID for logging</param>
    Task InitializeAsync(SynthesisOptions options, IVoiceEventEmitter eventEmitter, string sessionId);

    /// <summary>
    /// Ensure the TTS session is connected, reconnecting if necessary
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task EnsureConnectedAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Send text to be synthesized
    /// </summary>
    /// <param name="text">Text to synthesize</param>
    /// <param name="tryTriggerGeneration">Whether to trigger immediate generation</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SendTextAsync(string text, bool tryTriggerGeneration = false, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send text and immediately flush for speech
    /// </summary>
    /// <param name="text">Text to synthesize</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SpeakImmediatelyAsync(string text, CancellationToken cancellationToken = default);

    /// <summary>
    /// Flush any remaining text and complete the current speech
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task FlushAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancel current synthesis (for interruption)
    /// </summary>
    Task CancelAsync();

    /// <summary>
    /// Whether the TTS session is currently connected
    /// </summary>
    bool IsConnected { get; }

    /// <summary>
    /// Whether the TTS session has been initialized
    /// </summary>
    bool IsInitialized { get; }
}
