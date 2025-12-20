using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Application.Services.Voice.Orchestration;

namespace SecondBrain.Application.Services.Voice.Synthesis;

/// <summary>
/// Orchestrates TTS synthesis sessions with lazy initialization and reconnection support
/// </summary>
public class TTSOrchestrator : ITTSOrchestrator
{
    private readonly IVoiceSynthesisServiceFactory _synthesisFactory;
    private readonly VoiceSettings _voiceSettings;
    private readonly ILogger<TTSOrchestrator> _logger;

    private SynthesisOptions? _options;
    private IVoiceEventEmitter? _eventEmitter;
    private string? _sessionId;
    private ISynthesisSession? _synthesisSession;
    private int _audioSequence;
    private bool _isInitialized;
    private bool _disposed;
    private readonly SemaphoreSlim _initLock = new(1, 1);

    public TTSOrchestrator(
        IVoiceSynthesisServiceFactory synthesisFactory,
        IOptions<VoiceSettings> voiceSettings,
        ILogger<TTSOrchestrator> logger)
    {
        _synthesisFactory = synthesisFactory;
        _voiceSettings = voiceSettings.Value;
        _logger = logger;
    }

    public bool IsConnected => _synthesisSession?.IsConnected ?? false;
    public bool IsInitialized => _isInitialized;

    public Task InitializeAsync(SynthesisOptions options, IVoiceEventEmitter eventEmitter, string sessionId)
    {
        _options = options;
        _eventEmitter = eventEmitter;
        _sessionId = sessionId;
        _isInitialized = true;
        return Task.CompletedTask;
    }

    public async Task EnsureConnectedAsync(CancellationToken cancellationToken = default)
    {
        // Check disposal first to avoid ObjectDisposedException on semaphore
        if (_disposed)
        {
            _logger.LogDebug("TTSOrchestrator already disposed, skipping EnsureConnectedAsync");
            return;
        }

        if (!_isInitialized || _options == null || _eventEmitter == null)
        {
            throw new InvalidOperationException("TTSOrchestrator not initialized. Call InitializeAsync first.");
        }

        // Quick check without lock
        if (_synthesisSession?.IsConnected == true)
            return;

        // Double-check disposal before accessing semaphore
        if (_disposed)
            return;

        await _initLock.WaitAsync(cancellationToken);
        try
        {
            // Double-check after acquiring lock
            if (_synthesisSession?.IsConnected == true)
                return;

            // If session exists but disconnected, dispose it
            if (_synthesisSession != null && !_synthesisSession.IsConnected)
            {
                _logger.LogInformation("TTS session disconnected (likely timeout), reconnecting for voice session {SessionId}",
                    _sessionId);
                await _synthesisSession.DisposeAsync();
                _synthesisSession = null;
            }

            await CreateSessionAsync(cancellationToken);
        }
        finally
        {
            _initLock.Release();
        }
    }

    private async Task CreateSessionAsync(CancellationToken cancellationToken)
    {
        if (_options == null || _eventEmitter == null)
            return;

        _logger.LogDebug("Creating TTS session for voice session {SessionId}", _sessionId);

        var synthesisService = _synthesisFactory.GetDefaultProvider();
        _synthesisSession = await synthesisService.CreateSessionAsync(
            _options,
            audioData =>
            {
                var currentSeq = _audioSequence++;
                _logger.LogDebug("Received TTS audio chunk {Sequence}: {ByteCount} bytes for session {SessionId}",
                    currentSeq, audioData.Length, _sessionId);

                // Fire and forget but log any errors
                Task.Run(async () =>
                {
                    try
                    {
                        await _eventEmitter.SendAudioAsync(
                            audioData,
                            _options.OutputFormat,
                            16000,
                            currentSeq,
                            CancellationToken.None);

                        _logger.LogDebug("Sent TTS audio chunk {Sequence} to frontend for session {SessionId}",
                            currentSeq, _sessionId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send audio chunk {Sequence} for session {SessionId}",
                            currentSeq, _sessionId);
                    }
                });
            },
            cancellationToken);

        _logger.LogDebug("TTS session created for voice session {SessionId}", _sessionId);
    }

    public async Task SendTextAsync(string text, bool tryTriggerGeneration = false, CancellationToken cancellationToken = default)
    {
        await EnsureConnectedAsync(cancellationToken);

        if (_synthesisSession?.IsConnected == true)
        {
            await _synthesisSession.SendTextAsync(text, tryTriggerGeneration, cancellationToken);
        }
    }

    public async Task SpeakImmediatelyAsync(string text, CancellationToken cancellationToken = default)
    {
        await EnsureConnectedAsync(cancellationToken);

        if (_synthesisSession?.IsConnected == true)
        {
            // Send text and flush to generate audio immediately, without closing the stream
            await _synthesisSession.SendTextAndFlushAsync(text + " ", cancellationToken);
        }
    }

    public async Task FlushAsync(CancellationToken cancellationToken = default)
    {
        if (_synthesisSession?.IsConnected == true)
        {
            _logger.LogDebug("Sending final EOS flush to TTS for session {SessionId}", _sessionId);
            await _synthesisSession.FlushAsync(cancellationToken);

            // Wait for audio to be generated and sent before transitioning state
            await Task.Delay(500, cancellationToken);
        }
    }

    public async Task CancelAsync()
    {
        if (_synthesisSession != null)
        {
            await _synthesisSession.CancelAsync();
        }
    }

    public async ValueTask DisposeAsync()
    {
        // Set disposed flag first to prevent new operations
        _disposed = true;

        if (_synthesisSession != null)
        {
            await _synthesisSession.DisposeAsync();
            _synthesisSession = null;
        }
        _initLock.Dispose();
    }
}
