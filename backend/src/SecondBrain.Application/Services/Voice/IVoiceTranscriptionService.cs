using SecondBrain.Application.Services.Voice.Models;

namespace SecondBrain.Application.Services.Voice;

/// <summary>
/// Service for Speech-to-Text (STT) transcription
/// </summary>
public interface IVoiceTranscriptionService
{
    /// <summary>
    /// Provider identifier (e.g., "Deepgram", "Google", "Whisper", "Azure")
    /// </summary>
    string ProviderName { get; }

    /// <summary>
    /// Whether the transcription service is available and configured
    /// </summary>
    bool IsAvailable { get; }

    /// <summary>
    /// Stream transcription results from an audio stream in real-time
    /// </summary>
    /// <param name="audioStream">The audio data stream</param>
    /// <param name="options">Transcription options</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Async enumerable of transcription results</returns>
    IAsyncEnumerable<TranscriptionResult> StreamTranscriptionAsync(
        Stream audioStream,
        TranscriptionOptions options,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a real-time transcription session that accepts audio chunks
    /// </summary>
    /// <param name="options">Transcription options</param>
    /// <param name="onTranscript">Callback for transcription results</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A transcription session that can receive audio chunks</returns>
    Task<ITranscriptionSession> CreateSessionAsync(
        TranscriptionOptions options,
        Action<TranscriptionResult> onTranscript,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Transcribe a complete audio file/buffer (non-streaming)
    /// </summary>
    /// <param name="audioData">The audio data</param>
    /// <param name="options">Transcription options</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The complete transcription result</returns>
    Task<TranscriptionResult> TranscribeAsync(
        byte[] audioData,
        TranscriptionOptions options,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if the service is healthy and can accept requests
    /// </summary>
    Task<(bool IsHealthy, string? Error)> CheckHealthAsync(
        CancellationToken cancellationToken = default);
}

/// <summary>
/// A real-time transcription session that can receive audio chunks
/// </summary>
public interface ITranscriptionSession : IAsyncDisposable
{
    /// <summary>
    /// Session identifier
    /// </summary>
    string SessionId { get; }

    /// <summary>
    /// Whether the session is connected and active
    /// </summary>
    bool IsConnected { get; }

    /// <summary>
    /// Send an audio chunk for transcription
    /// </summary>
    /// <param name="audioChunk">Audio data (raw PCM or encoded based on options)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SendAudioAsync(byte[] audioChunk, CancellationToken cancellationToken = default);

    /// <summary>
    /// Signal end of audio stream (e.g., user stopped speaking)
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task EndAudioAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Close the transcription session
    /// </summary>
    Task CloseAsync();
}
