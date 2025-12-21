using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Application.Services.Voice.Orchestration;

namespace SecondBrain.Application.Services.Voice.Transcription;

/// <summary>
/// Interface for orchestrating transcription sessions
/// </summary>
public interface ITranscriptionOrchestrator : IAsyncDisposable
{
    /// <summary>
    /// Initialize the transcription orchestrator
    /// </summary>
    /// <param name="session">The voice session</param>
    /// <param name="eventEmitter">Event emitter for sending transcripts</param>
    /// <param name="onFinalTranscript">Callback for final transcriptions</param>
    void Initialize(
        VoiceSession session,
        IVoiceEventEmitter eventEmitter,
        Func<TranscriptionResult, Task> onFinalTranscript);

    /// <summary>
    /// Send audio data for transcription
    /// </summary>
    /// <param name="audioData">Raw audio bytes</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SendAudioAsync(byte[] audioData, CancellationToken cancellationToken = default);

    /// <summary>
    /// Signal end of audio stream
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task EndAudioAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Whether the transcription session is connected
    /// </summary>
    bool IsConnected { get; }
}
