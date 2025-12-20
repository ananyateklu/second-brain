using System.Net.WebSockets;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;

namespace SecondBrain.Application.Services.Voice.GrokRealtime;

/// <summary>
/// WebSocket client for xAI Grok Realtime API (Voice Agent)
/// </summary>
public class GrokRealtimeClient : IGrokRealtimeClient
{
    private readonly ILogger<GrokRealtimeClient> _logger;
    private readonly VoiceSettings _voiceSettings;
    private readonly AIProvidersSettings _aiSettings;
    private readonly JsonSerializerOptions _jsonOptions;

    private ClientWebSocket? _webSocket;
    private CancellationTokenSource? _receiveCts;
    private Task? _receiveTask;
    private Channel<GrokRealtimeEvent>? _eventChannel;
    private bool _disposed;

    public bool IsConnected => _webSocket?.State == WebSocketState.Open;
    public string? SessionId { get; private set; }

    public GrokRealtimeClient(
        ILogger<GrokRealtimeClient> logger,
        IOptions<VoiceSettings> voiceSettings,
        IOptions<AIProvidersSettings> aiSettings)
    {
        _logger = logger;
        _voiceSettings = voiceSettings.Value;
        _aiSettings = aiSettings.Value;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };
    }

    public async Task ConnectAsync(GrokRealtimeSessionConfig config, CancellationToken cancellationToken = default)
    {
        if (_disposed) throw new ObjectDisposedException(nameof(GrokRealtimeClient));
        if (IsConnected) throw new InvalidOperationException("Already connected");

        var apiKey = _aiSettings.XAI?.ApiKey;
        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException("xAI API key is not configured");
        }

        var wsUrl = _voiceSettings.GrokVoice?.WebSocketUrl ?? "wss://api.x.ai/v1/realtime";

        _logger.LogInformation("Connecting to Grok Realtime API at {Url}", wsUrl);

        _webSocket = new ClientWebSocket();
        _webSocket.Options.SetRequestHeader("Authorization", $"Bearer {apiKey}");
        _webSocket.Options.SetRequestHeader("OpenAI-Beta", "realtime=v1");

        try
        {
            await _webSocket.ConnectAsync(new Uri(wsUrl), cancellationToken);
            _logger.LogInformation("Connected to Grok Realtime API");

            // Create event channel for receiving events
            _eventChannel = Channel.CreateUnbounded<GrokRealtimeEvent>(new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = true
            });

            // Start receiving task
            _receiveCts = new CancellationTokenSource();
            _receiveTask = ReceiveLoopAsync(_receiveCts.Token);

            // Send initial session configuration
            await SendSessionUpdateAsync(config, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to Grok Realtime API");
            _webSocket?.Dispose();
            _webSocket = null;
            throw;
        }
    }

    public async Task SendSessionUpdateAsync(GrokRealtimeSessionConfig config, CancellationToken cancellationToken = default)
    {
        var message = new GrokSessionUpdateMessage
        {
            Session = config
        };
        await SendMessageAsync(message, cancellationToken);
        _logger.LogDebug("Sent session.update with voice={Voice}", config.Voice);
    }

    public async Task SendAudioAsync(byte[] pcmAudio, CancellationToken cancellationToken = default)
    {
        var base64Audio = Convert.ToBase64String(pcmAudio);
        var message = new GrokInputAudioBufferAppendMessage
        {
            Audio = base64Audio
        };
        await SendMessageAsync(message, cancellationToken);
    }

    public async Task CommitAudioBufferAsync(CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new GrokInputAudioBufferCommitMessage(), cancellationToken);
        _logger.LogDebug("Committed audio buffer");
    }

    public async Task ClearAudioBufferAsync(CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new GrokInputAudioBufferClearMessage(), cancellationToken);
        _logger.LogDebug("Cleared audio buffer");
    }

    public async Task CreateResponseAsync(string? instructions = null, CancellationToken cancellationToken = default)
    {
        var message = new GrokResponseCreateMessage();
        if (!string.IsNullOrEmpty(instructions))
        {
            message.Response = new GrokResponseConfig { Instructions = instructions };
        }
        await SendMessageAsync(message, cancellationToken);
        _logger.LogDebug("Created response");
    }

    public async Task CancelResponseAsync(CancellationToken cancellationToken = default)
    {
        await SendMessageAsync(new GrokResponseCancelMessage(), cancellationToken);
        _logger.LogDebug("Cancelled response");
    }

    public async Task SendConversationItemAsync(GrokConversationItem item, CancellationToken cancellationToken = default)
    {
        var message = new GrokConversationItemCreateMessage { Item = item };
        await SendMessageAsync(message, cancellationToken);
        _logger.LogDebug("Sent conversation item");
    }

    public async Task SendFunctionCallOutputAsync(string callId, string output, CancellationToken cancellationToken = default)
    {
        var message = new GrokFunctionCallOutputMessage
        {
            Item = new GrokFunctionCallOutputItem
            {
                CallId = callId,
                Output = output
            }
        };
        await SendMessageAsync(message, cancellationToken);
        _logger.LogDebug("Sent function call output for call {CallId}", callId);
    }

    public async Task DisconnectAsync()
    {
        if (_webSocket == null) return;

        _logger.LogInformation("Disconnecting from Grok Realtime API");

        try
        {
            // Cancel receive loop
            _receiveCts?.Cancel();

            // Close WebSocket gracefully
            if (_webSocket.State == WebSocketState.Open)
            {
                await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client disconnecting", CancellationToken.None);
            }

            // Wait for receive task to complete
            if (_receiveTask != null)
            {
                try
                {
                    await _receiveTask.WaitAsync(TimeSpan.FromSeconds(2));
                }
                catch (TimeoutException)
                {
                    _logger.LogWarning("Receive task did not complete in time");
                }
                catch (OperationCanceledException)
                {
                    // Expected
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error during disconnect");
        }
        finally
        {
            _eventChannel?.Writer.TryComplete();
            _webSocket?.Dispose();
            _webSocket = null;
            _receiveCts?.Dispose();
            _receiveCts = null;
            SessionId = null;
        }
    }

    public async IAsyncEnumerable<GrokRealtimeEvent> ReceiveEventsAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (_eventChannel == null)
        {
            throw new InvalidOperationException("Not connected");
        }

        await foreach (var evt in _eventChannel.Reader.ReadAllAsync(cancellationToken))
        {
            yield return evt;
        }
    }

    private async Task SendMessageAsync(GrokClientMessage message, CancellationToken cancellationToken)
    {
        if (!IsConnected)
        {
            throw new InvalidOperationException("Not connected to Grok Realtime API");
        }

        var json = JsonSerializer.Serialize(message, message.GetType(), _jsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);

        await _webSocket!.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            true,
            cancellationToken);
    }

    private async Task ReceiveLoopAsync(CancellationToken cancellationToken)
    {
        var buffer = new byte[64 * 1024]; // 64KB buffer
        var messageBuffer = new List<byte>();

        try
        {
            while (!cancellationToken.IsCancellationRequested && IsConnected)
            {
                WebSocketReceiveResult result;
                try
                {
                    result = await _webSocket!.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (WebSocketException ex) when (ex.WebSocketErrorCode == WebSocketError.ConnectionClosedPrematurely)
                {
                    _logger.LogWarning("WebSocket connection closed prematurely");
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    _logger.LogInformation("Received close message from server");
                    break;
                }

                // Accumulate message fragments
                messageBuffer.AddRange(buffer.Take(result.Count));

                if (result.EndOfMessage)
                {
                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var json = Encoding.UTF8.GetString(messageBuffer.ToArray());
                        await ProcessMessageAsync(json);
                    }
                    messageBuffer.Clear();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in receive loop");
        }
        finally
        {
            _eventChannel?.Writer.TryComplete();
        }
    }

    private async Task ProcessMessageAsync(string json)
    {
        try
        {
            // First, parse to get the type
            using var doc = JsonDocument.Parse(json);
            var typeString = doc.RootElement.GetProperty("type").GetString() ?? "";

            var evt = ParseEvent(typeString, json);
            if (evt != null && _eventChannel != null)
            {
                // Handle session created to capture session ID
                if (evt is GrokSessionCreatedEvent sessionCreated)
                {
                    SessionId = sessionCreated.Session?.Id;
                    _logger.LogInformation("Grok Realtime session created: {SessionId}", SessionId);
                }

                await _eventChannel.Writer.WriteAsync(evt);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process message: {Message}", json.Length > 200 ? json[..200] + "..." : json);
        }
    }

    private GrokRealtimeEvent? ParseEvent(string typeString, string json)
    {
        var eventType = ParseEventType(typeString);

        GrokRealtimeEvent? evt = eventType switch
        {
            GrokRealtimeEventType.Error => JsonSerializer.Deserialize<GrokErrorEvent>(json, _jsonOptions),
            GrokRealtimeEventType.SessionCreated => JsonSerializer.Deserialize<GrokSessionCreatedEvent>(json, _jsonOptions),
            GrokRealtimeEventType.SessionUpdated => JsonSerializer.Deserialize<GrokRealtimeEvent>(json, _jsonOptions),
            GrokRealtimeEventType.InputAudioBufferSpeechStarted => JsonSerializer.Deserialize<GrokSpeechStartedEvent>(json, _jsonOptions),
            GrokRealtimeEventType.InputAudioBufferSpeechStopped => JsonSerializer.Deserialize<GrokSpeechStoppedEvent>(json, _jsonOptions),
            GrokRealtimeEventType.ConversationItemInputAudioTranscriptionCompleted => JsonSerializer.Deserialize<GrokTranscriptionCompletedEvent>(json, _jsonOptions),
            GrokRealtimeEventType.ResponseCreated => JsonSerializer.Deserialize<GrokResponseCreatedEvent>(json, _jsonOptions),
            GrokRealtimeEventType.ResponseDone => JsonSerializer.Deserialize<GrokResponseDoneEvent>(json, _jsonOptions),
            GrokRealtimeEventType.ResponseAudioDelta => JsonSerializer.Deserialize<GrokAudioDeltaEvent>(json, _jsonOptions),
            GrokRealtimeEventType.ResponseAudioDone => JsonSerializer.Deserialize<GrokAudioDoneEvent>(json, _jsonOptions),
            GrokRealtimeEventType.ResponseTextDelta => JsonSerializer.Deserialize<GrokTextDeltaEvent>(json, _jsonOptions),
            GrokRealtimeEventType.ResponseAudioTranscriptDelta => JsonSerializer.Deserialize<GrokAudioTranscriptDeltaEvent>(json, _jsonOptions),
            GrokRealtimeEventType.ResponseFunctionCallArgumentsDelta => JsonSerializer.Deserialize<GrokFunctionCallArgumentsDeltaEvent>(json, _jsonOptions),
            GrokRealtimeEventType.ResponseFunctionCallArgumentsDone => JsonSerializer.Deserialize<GrokFunctionCallArgumentsDoneEvent>(json, _jsonOptions),
            GrokRealtimeEventType.RateLimitsUpdated => JsonSerializer.Deserialize<GrokRateLimitsEvent>(json, _jsonOptions),
            _ => JsonSerializer.Deserialize<GrokRealtimeEvent>(json, _jsonOptions)
        };

        if (evt != null)
        {
            evt.EventType = eventType;
            evt.TypeString = typeString;
        }

        return evt;
    }

    private static GrokRealtimeEventType ParseEventType(string typeString) => typeString switch
    {
        "error" => GrokRealtimeEventType.Error,
        "session.created" => GrokRealtimeEventType.SessionCreated,
        "session.updated" => GrokRealtimeEventType.SessionUpdated,
        "input_audio_buffer.committed" => GrokRealtimeEventType.InputAudioBufferCommitted,
        "input_audio_buffer.cleared" => GrokRealtimeEventType.InputAudioBufferCleared,
        "input_audio_buffer.speech_started" => GrokRealtimeEventType.InputAudioBufferSpeechStarted,
        "input_audio_buffer.speech_stopped" => GrokRealtimeEventType.InputAudioBufferSpeechStopped,
        "conversation.created" => GrokRealtimeEventType.ConversationCreated,
        "conversation.item.created" => GrokRealtimeEventType.ConversationItemCreated,
        "conversation.item.input_audio_transcription.completed" => GrokRealtimeEventType.ConversationItemInputAudioTranscriptionCompleted,
        "conversation.item.input_audio_transcription.failed" => GrokRealtimeEventType.ConversationItemInputAudioTranscriptionFailed,
        "conversation.item.truncated" => GrokRealtimeEventType.ConversationItemTruncated,
        "conversation.item.deleted" => GrokRealtimeEventType.ConversationItemDeleted,
        "response.created" => GrokRealtimeEventType.ResponseCreated,
        "response.done" => GrokRealtimeEventType.ResponseDone,
        "response.output_item.added" => GrokRealtimeEventType.ResponseOutputItemAdded,
        "response.output_item.done" => GrokRealtimeEventType.ResponseOutputItemDone,
        "response.content_part.added" => GrokRealtimeEventType.ResponseContentPartAdded,
        "response.content_part.done" => GrokRealtimeEventType.ResponseContentPartDone,
        "response.text.delta" => GrokRealtimeEventType.ResponseTextDelta,
        "response.text.done" => GrokRealtimeEventType.ResponseTextDone,
        "response.audio.delta" => GrokRealtimeEventType.ResponseAudioDelta,
        "response.audio.done" => GrokRealtimeEventType.ResponseAudioDone,
        "response.audio_transcript.delta" => GrokRealtimeEventType.ResponseAudioTranscriptDelta,
        "response.audio_transcript.done" => GrokRealtimeEventType.ResponseAudioTranscriptDone,
        "response.function_call_arguments.delta" => GrokRealtimeEventType.ResponseFunctionCallArgumentsDelta,
        "response.function_call_arguments.done" => GrokRealtimeEventType.ResponseFunctionCallArgumentsDone,
        "rate_limits.updated" => GrokRealtimeEventType.RateLimitsUpdated,
        _ => GrokRealtimeEventType.Unknown
    };

    public async ValueTask DisposeAsync()
    {
        if (_disposed) return;
        _disposed = true;

        await DisconnectAsync();
        GC.SuppressFinalize(this);
    }
}
