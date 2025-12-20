using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Application.Services.Voice.Orchestration;

namespace SecondBrain.Application.Services.Voice.Transcription;

/// <summary>
/// Orchestrates transcription sessions and handles audio routing
/// </summary>
public class TranscriptionOrchestrator : ITranscriptionOrchestrator
{
    private readonly IVoiceTranscriptionServiceFactory _transcriptionFactory;
    private readonly VoiceSettings _voiceSettings;
    private readonly ILogger<TranscriptionOrchestrator> _logger;

    private VoiceSession? _session;
    private IVoiceEventEmitter? _eventEmitter;
    private Func<TranscriptionResult, Task>? _onFinalTranscript;
    private ITranscriptionSession? _transcriptionSession;
    private bool _disposed;
    private readonly SemaphoreSlim _initLock = new(1, 1);

    public TranscriptionOrchestrator(
        IVoiceTranscriptionServiceFactory transcriptionFactory,
        IOptions<VoiceSettings> voiceSettings,
        ILogger<TranscriptionOrchestrator> logger)
    {
        _transcriptionFactory = transcriptionFactory;
        _voiceSettings = voiceSettings.Value;
        _logger = logger;
    }

    public bool IsConnected => _transcriptionSession?.IsConnected ?? false;

    public void Initialize(
        VoiceSession session,
        IVoiceEventEmitter eventEmitter,
        Func<TranscriptionResult, Task> onFinalTranscript)
    {
        _session = session;
        _eventEmitter = eventEmitter;
        _onFinalTranscript = onFinalTranscript;
    }

    public async Task SendAudioAsync(byte[] audioData, CancellationToken cancellationToken = default)
    {
        // Check disposal first to avoid ObjectDisposedException
        if (_disposed)
        {
            _logger.LogDebug("TranscriptionOrchestrator already disposed, dropping audio");
            return;
        }

        if (_session == null || _eventEmitter == null)
        {
            _logger.LogWarning("TranscriptionOrchestrator not initialized");
            return;
        }

        // Initialize transcription session if needed
        if (_transcriptionSession == null || !_transcriptionSession.IsConnected)
        {
            await InitializeSessionAsync(cancellationToken);
        }

        if (_transcriptionSession != null && _transcriptionSession.IsConnected)
        {
            await _transcriptionSession.SendAudioAsync(audioData, cancellationToken);
        }
        else
        {
            _logger.LogWarning("Transcription session not connected, dropping audio for session {SessionId}",
                _session.Id);
        }
    }

    public async Task EndAudioAsync(CancellationToken cancellationToken = default)
    {
        if (_transcriptionSession != null)
        {
            await _transcriptionSession.EndAudioAsync(cancellationToken);
        }
    }

    private async Task InitializeSessionAsync(CancellationToken cancellationToken)
    {
        if (_session == null || _eventEmitter == null || _onFinalTranscript == null)
            return;

        // Check disposal before accessing semaphore
        if (_disposed)
            return;

        await _initLock.WaitAsync(cancellationToken);
        try
        {
            // Double-check after acquiring lock
            if (_transcriptionSession != null && _transcriptionSession.IsConnected)
                return;

            _logger.LogInformation("Initializing transcription session for voice session {SessionId}", _session.Id);

            var options = new TranscriptionOptions
            {
                Language = _session.Options.Language,
                InterimResults = true,
                Punctuation = true,
                EndpointingMs = _voiceSettings.Features.SilenceTimeoutMs
            };

            var transcriptionService = _transcriptionFactory.GetDefaultProvider();
            _transcriptionSession = await transcriptionService.CreateSessionAsync(
                options,
                result =>
                {
                    // Send transcript to client
                    _ = _eventEmitter.SendTranscriptAsync(result, CancellationToken.None);

                    // When we get a final transcription, invoke the callback
                    if (result.IsFinal && !string.IsNullOrWhiteSpace(result.Text))
                    {
                        _ = _onFinalTranscript(result);
                    }
                },
                cancellationToken);

            // Update session state to listening
            await _eventEmitter.SendStateAsync(VoiceSessionState.Listening, cancellationToken: cancellationToken);

            _logger.LogInformation("Transcription session initialized for voice session {SessionId}", _session.Id);
        }
        finally
        {
            _initLock.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        // Set disposed flag first to prevent new operations
        _disposed = true;

        if (_transcriptionSession != null)
        {
            await _transcriptionSession.DisposeAsync();
            _transcriptionSession = null;
        }
        _initLock.Dispose();
    }
}
