using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Voice.GrokRealtime;
using SecondBrain.Application.Services.Voice.Models;
using SecondBrain.Application.Services.Voice.ResponseProcessors;
using SecondBrain.Application.Services.Voice.Synthesis;
using SecondBrain.Application.Services.Voice.Transcription;

namespace SecondBrain.Application.Services.Voice.Orchestration;

/// <summary>
/// Orchestrates voice WebSocket sessions, routing messages to appropriate handlers
/// </summary>
public class VoiceOrchestrator : IVoiceOrchestrator
{
    private readonly IVoiceSessionManager _sessionManager;
    private readonly IVoiceResponseProcessorFactory _responseProcessorFactory;
    private readonly ITranscriptionOrchestrator _transcriptionOrchestrator;
    private readonly IVoiceEventEmitter _eventEmitter;
    private readonly ITTSOrchestrator _ttsOrchestrator;
    private readonly IGrokVoiceHandler _grokVoiceHandler;
    private readonly VoiceSettings _voiceSettings;
    private readonly ILogger<VoiceOrchestrator> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public VoiceOrchestrator(
        IVoiceSessionManager sessionManager,
        IVoiceResponseProcessorFactory responseProcessorFactory,
        ITranscriptionOrchestrator transcriptionOrchestrator,
        IVoiceEventEmitter eventEmitter,
        ITTSOrchestrator ttsOrchestrator,
        IGrokVoiceHandler grokVoiceHandler,
        IOptions<VoiceSettings> voiceSettings,
        ILogger<VoiceOrchestrator> logger)
    {
        _sessionManager = sessionManager;
        _responseProcessorFactory = responseProcessorFactory;
        _transcriptionOrchestrator = transcriptionOrchestrator;
        _eventEmitter = eventEmitter;
        _ttsOrchestrator = ttsOrchestrator;
        _grokVoiceHandler = grokVoiceHandler;
        _voiceSettings = voiceSettings.Value;
        _logger = logger;
    }

    public async Task RunAsync(WebSocket webSocket, VoiceSession session, CancellationToken cancellationToken)
    {
        // Initialize event emitter with WebSocket
        _eventEmitter.Initialize(webSocket);

        // Send initial state
        await _eventEmitter.SendStateAsync(session.State, "Connected", cancellationToken);

        // Send session started metadata
        await _eventEmitter.SendSessionStartedAsync(session, cancellationToken);

        // Route to appropriate handler based on voice provider type
        if (session.Options.IsGrokVoice)
        {
            _logger.LogInformation("Starting Grok Voice session {SessionId}", session.Id);
            await RunGrokVoicePathAsync(webSocket, session, cancellationToken);
        }
        else
        {
            _logger.LogInformation("Starting standard voice session {SessionId}", session.Id);
            await RunStandardVoicePathAsync(webSocket, session, cancellationToken);
        }
    }

    /// <summary>
    /// Runs the Grok Voice path using xAI's unified voice-to-voice API
    /// </summary>
    private async Task RunGrokVoicePathAsync(WebSocket webSocket, VoiceSession session, CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];

        try
        {
            // Initialize Grok Voice handler
            await _grokVoiceHandler.InitializeAsync(session, _eventEmitter, cancellationToken);

            // Start the event loop in the background to process incoming events from xAI
            var eventLoopTask = _grokVoiceHandler.RunEventLoopAsync(cancellationToken);

            // Update state to idle (ready to receive audio)
            await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Idle);
            await _eventEmitter.SendStateAsync(VoiceSessionState.Idle, "Ready to listen", cancellationToken);

            // Main WebSocket receive loop
            while (webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                var result = await webSocket.ReceiveAsync(
                    new ArraySegment<byte>(buffer),
                    cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    await ProcessGrokClientMessageAsync(session, json, cancellationToken);
                }
                else if (result.MessageType == WebSocketMessageType.Binary)
                {
                    // Forward audio directly to Grok Voice
                    var audioData = new byte[result.Count];
                    Buffer.BlockCopy(buffer, 0, audioData, 0, result.Count);

                    _logger.LogDebug("Forwarding binary audio to Grok Voice: {ByteCount} bytes for session {SessionId}",
                        result.Count, session.Id);

                    await _grokVoiceHandler.ProcessAudioAsync(audioData, cancellationToken);
                }

                await _sessionManager.TouchSessionAsync(session.Id);
            }

            // Wait for event loop to complete
            await eventLoopTask;
        }
        finally
        {
            await _grokVoiceHandler.DisposeAsync();
        }
    }

    /// <summary>
    /// Runs the standard voice path using Deepgram STT + AI + ElevenLabs TTS
    /// </summary>
    private async Task RunStandardVoicePathAsync(WebSocket webSocket, VoiceSession session, CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];

        // Initialize TTS with default options (will be fully configured on first use)
        var synthOptions = new SynthesisOptions
        {
            VoiceId = session.VoiceId,
            Model = _voiceSettings.ElevenLabs.Model,
            Stability = _voiceSettings.ElevenLabs.Stability,
            SimilarityBoost = _voiceSettings.ElevenLabs.SimilarityBoost,
            OutputFormat = _voiceSettings.ElevenLabs.OutputFormat
        };
        await _ttsOrchestrator.InitializeAsync(synthOptions, _eventEmitter, session.Id);

        // Initialize transcription orchestrator with callback for handling final transcriptions
        _transcriptionOrchestrator.Initialize(
            session,
            _eventEmitter,
            async (result) =>
            {
                if (result.IsFinal && !string.IsNullOrWhiteSpace(result.Text))
                {
                    await ProcessUserInputAsync(session, result.Text, cancellationToken);
                }
            });

        try
        {
            // Update state to idle (ready to receive audio)
            await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Idle);
            await _eventEmitter.SendStateAsync(VoiceSessionState.Idle, "Ready to listen", cancellationToken);

            while (webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                var result = await webSocket.ReceiveAsync(
                    new ArraySegment<byte>(buffer),
                    cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    await ProcessClientMessageAsync(session, json, cancellationToken);
                }
                else if (result.MessageType == WebSocketMessageType.Binary)
                {
                    // Direct audio data (for efficiency)
                    var audioData = new byte[result.Count];
                    Buffer.BlockCopy(buffer, 0, audioData, 0, result.Count);

                    _logger.LogDebug("Received binary audio data: {ByteCount} bytes for session {SessionId}",
                        result.Count, session.Id);

                    await _transcriptionOrchestrator.SendAudioAsync(audioData, cancellationToken);
                }

                await _sessionManager.TouchSessionAsync(session.Id);
            }
        }
        finally
        {
            // Cleanup
            await _transcriptionOrchestrator.DisposeAsync();
            await _ttsOrchestrator.DisposeAsync();
        }
    }

    private async Task ProcessClientMessageAsync(
        VoiceSession session,
        string json,
        CancellationToken cancellationToken)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var type = doc.RootElement.GetProperty("type").GetString();

            switch (type)
            {
                case "audio":
                    await HandleAudioMessageAsync(doc.RootElement, cancellationToken);
                    break;

                case "control":
                    await HandleControlMessageAsync(session, doc.RootElement, cancellationToken);
                    break;

                case "config":
                    // Handle configuration updates if needed
                    break;

                default:
                    await _eventEmitter.SendErrorAsync(
                        VoiceErrorCodes.InvalidMessage,
                        $"Unknown message type: {type}",
                        recoverable: true,
                        cancellationToken);
                    break;
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Invalid JSON in voice message");
            await _eventEmitter.SendErrorAsync(
                VoiceErrorCodes.InvalidMessage,
                "Invalid JSON format",
                recoverable: true,
                cancellationToken);
        }
    }

    private async Task HandleAudioMessageAsync(
        JsonElement element,
        CancellationToken cancellationToken)
    {
        var data = element.GetProperty("payload").GetProperty("data").GetString();
        if (string.IsNullOrEmpty(data))
            return;

        var audioBytes = Convert.FromBase64String(data);
        await _transcriptionOrchestrator.SendAudioAsync(audioBytes, cancellationToken);
    }

    private async Task HandleControlMessageAsync(
        VoiceSession session,
        JsonElement element,
        CancellationToken cancellationToken)
    {
        var action = element.GetProperty("payload").GetProperty("action").GetString();

        switch (action)
        {
            case ControlActions.Start:
                await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Idle);
                await _eventEmitter.SendStateAsync(VoiceSessionState.Idle, "Ready to listen", cancellationToken);
                break;

            case ControlActions.Stop:
                await _transcriptionOrchestrator.EndAudioAsync(cancellationToken);
                break;

            case ControlActions.Interrupt:
                await _ttsOrchestrator.CancelAsync();
                await _sessionManager.UpdateSessionStateAsync(
                    session.Id, VoiceSessionState.Interrupted, "User interrupted");
                await _eventEmitter.SendStateAsync(VoiceSessionState.Interrupted, "User interrupted", cancellationToken);
                break;

            case ControlActions.Ping:
                await _eventEmitter.SendPongAsync(cancellationToken);
                break;
        }
    }

    /// <summary>
    /// Processes client messages for Grok Voice sessions
    /// </summary>
    private async Task ProcessGrokClientMessageAsync(
        VoiceSession session,
        string json,
        CancellationToken cancellationToken)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var type = doc.RootElement.GetProperty("type").GetString();

            switch (type)
            {
                case "audio":
                    // Handle base64-encoded audio (alternative to binary)
                    await HandleGrokAudioMessageAsync(doc.RootElement, cancellationToken);
                    break;

                case "control":
                    await HandleGrokControlMessageAsync(session, doc.RootElement, cancellationToken);
                    break;

                case "config":
                    // Configuration updates are handled at session creation
                    _logger.LogDebug("Config message received for Grok Voice session {SessionId}", session.Id);
                    break;

                default:
                    await _eventEmitter.SendErrorAsync(
                        VoiceErrorCodes.InvalidMessage,
                        $"Unknown message type: {type}",
                        recoverable: true,
                        cancellationToken);
                    break;
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Invalid JSON in Grok Voice message");
            await _eventEmitter.SendErrorAsync(
                VoiceErrorCodes.InvalidMessage,
                "Invalid JSON format",
                recoverable: true,
                cancellationToken);
        }
    }

    private async Task HandleGrokAudioMessageAsync(
        JsonElement element,
        CancellationToken cancellationToken)
    {
        var data = element.GetProperty("payload").GetProperty("data").GetString();
        if (string.IsNullOrEmpty(data))
            return;

        var audioBytes = Convert.FromBase64String(data);
        await _grokVoiceHandler.ProcessAudioAsync(audioBytes, cancellationToken);
    }

    private async Task HandleGrokControlMessageAsync(
        VoiceSession session,
        JsonElement element,
        CancellationToken cancellationToken)
    {
        var action = element.GetProperty("payload").GetProperty("action").GetString();

        switch (action)
        {
            case ControlActions.Start:
                await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Idle);
                await _eventEmitter.SendStateAsync(VoiceSessionState.Idle, "Ready to listen", cancellationToken);
                break;

            case ControlActions.Stop:
                // For Grok Voice, stop means disconnect
                await _grokVoiceHandler.DisconnectAsync();
                break;

            case ControlActions.Interrupt:
                // Send interrupt to Grok Voice to cancel current response
                await _grokVoiceHandler.InterruptAsync(cancellationToken);
                await _sessionManager.UpdateSessionStateAsync(
                    session.Id, VoiceSessionState.Interrupted, "User interrupted");
                await _eventEmitter.SendStateAsync(VoiceSessionState.Interrupted, "User interrupted", cancellationToken);
                break;

            case ControlActions.Ping:
                await _eventEmitter.SendPongAsync(cancellationToken);
                break;
        }
    }

    private async Task ProcessUserInputAsync(
        VoiceSession session,
        string userText,
        CancellationToken cancellationToken)
    {
        // Add user turn
        await _sessionManager.AddTurnAsync(session.Id, new VoiceTurn
        {
            Role = "user",
            Content = userText
        });

        // Update state to processing
        await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Processing);
        await _eventEmitter.SendStateAsync(VoiceSessionState.Processing, cancellationToken: cancellationToken);

        // Get the appropriate processor based on session configuration
        var processor = _responseProcessorFactory.GetProcessor(session);

        _logger.LogInformation(
            "Processing voice input with {ProcessorType} for session {SessionId}",
            processor.ProcessorType, session.Id);

        try
        {
            await processor.ProcessAsync(session, userText, _eventEmitter, _ttsOrchestrator, cancellationToken);

            // Return to idle state after processing
            await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Idle);
            await _eventEmitter.SendStateAsync(VoiceSessionState.Idle, "Response complete", cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing voice input for session {SessionId}", session.Id);

            await _eventEmitter.SendErrorAsync(
                VoiceErrorCodes.AiProviderFailed,
                "Failed to get AI response",
                recoverable: true,
                cancellationToken);

            await _sessionManager.UpdateSessionStateAsync(session.Id, VoiceSessionState.Idle);
            await _eventEmitter.SendStateAsync(VoiceSessionState.Idle, "Error recovery", cancellationToken);
        }
    }
}
