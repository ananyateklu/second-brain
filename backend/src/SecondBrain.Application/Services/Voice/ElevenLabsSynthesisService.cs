using System.Net.WebSockets;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Voice.Models;

namespace SecondBrain.Application.Services.Voice;

/// <summary>
/// ElevenLabs-based Text-to-Speech synthesis service
/// </summary>
public class ElevenLabsSynthesisService : IVoiceSynthesisService
{
    private readonly ElevenLabsSettings _settings;
    private readonly ILogger<ElevenLabsSynthesisService> _logger;
    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _jsonOptions;

    public ElevenLabsSynthesisService(
        IOptions<VoiceSettings> voiceSettings,
        ILogger<ElevenLabsSynthesisService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _settings = voiceSettings.Value.ElevenLabs;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("ElevenLabs");
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    public string ProviderName => "ElevenLabs";

    public bool IsAvailable => _settings.Enabled && !string.IsNullOrEmpty(_settings.ApiKey);

    public async IAsyncEnumerable<byte[]> StreamSynthesisAsync(
        string text,
        SynthesisOptions options,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            throw new InvalidOperationException("ElevenLabs synthesis service is not available");
        }

        var url = $"{_settings.RestBaseUrl}/text-to-speech/{options.VoiceId}/stream?output_format={options.OutputFormat}&optimize_streaming_latency={options.OptimizeStreamingLatency}";

        var requestBody = new
        {
            text = text,
            model_id = options.Model,
            voice_settings = new
            {
                stability = options.Stability,
                similarity_boost = options.SimilarityBoost,
                style = options.Style,
                use_speaker_boost = options.UseSpeakerBoost
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Add("xi-api-key", _settings.ApiKey);
        request.Content = new StringContent(
            JsonSerializer.Serialize(requestBody, _jsonOptions),
            Encoding.UTF8,
            "application/json");

        var response = await _httpClient.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);

        var buffer = new byte[4096];
        int bytesRead;

        while ((bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, cancellationToken)) > 0)
        {
            var chunk = new byte[bytesRead];
            Buffer.BlockCopy(buffer, 0, chunk, 0, bytesRead);
            yield return chunk;
        }
    }

    public async Task<ISynthesisSession> CreateSessionAsync(
        SynthesisOptions options,
        Action<byte[]> onAudio,
        CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            throw new InvalidOperationException("ElevenLabs synthesis service is not available");
        }

        var session = new ElevenLabsSynthesisSession(
            _settings,
            options,
            onAudio,
            _logger);

        await session.ConnectAsync(cancellationToken);
        return session;
    }

    public async Task<byte[]> SynthesizeAsync(
        string text,
        SynthesisOptions options,
        CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            throw new InvalidOperationException("ElevenLabs synthesis service is not available");
        }

        var url = $"{_settings.RestBaseUrl}/text-to-speech/{options.VoiceId}?output_format={options.OutputFormat}";

        var requestBody = new
        {
            text = text,
            model_id = options.Model,
            voice_settings = new
            {
                stability = options.Stability,
                similarity_boost = options.SimilarityBoost,
                style = options.Style,
                use_speaker_boost = options.UseSpeakerBoost
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Add("xi-api-key", _settings.ApiKey);
        request.Content = new StringContent(
            JsonSerializer.Serialize(requestBody, _jsonOptions),
            Encoding.UTF8,
            "application/json");

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsByteArrayAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<VoiceInfo>> GetAvailableVoicesAsync(
        CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            return Array.Empty<VoiceInfo>();
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{_settings.RestBaseUrl}/voices");
            request.Headers.Add("xi-api-key", _settings.ApiKey);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var voicesResponse = JsonSerializer.Deserialize<ElevenLabsVoicesResponse>(json, _jsonOptions);

            return voicesResponse?.Voices?.Select(v => new VoiceInfo
            {
                VoiceId = v.VoiceId ?? string.Empty,
                Name = v.Name ?? string.Empty,
                Description = v.Description,
                PreviewUrl = v.PreviewUrl,
                Category = v.Category,
                Labels = v.Labels
            }).ToList() ?? new List<VoiceInfo>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch ElevenLabs voices");
            return Array.Empty<VoiceInfo>();
        }
    }

    public async Task<VoiceInfo?> GetVoiceAsync(
        string voiceId,
        CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            return null;
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{_settings.RestBaseUrl}/voices/{voiceId}");
            request.Headers.Add("xi-api-key", _settings.ApiKey);

            var response = await _httpClient.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var voice = JsonSerializer.Deserialize<ElevenLabsVoice>(json, _jsonOptions);

            if (voice == null)
            {
                return null;
            }

            return new VoiceInfo
            {
                VoiceId = voice.VoiceId ?? string.Empty,
                Name = voice.Name ?? string.Empty,
                Description = voice.Description,
                PreviewUrl = voice.PreviewUrl,
                Category = voice.Category,
                Labels = voice.Labels
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch ElevenLabs voice {VoiceId}", voiceId);
            return null;
        }
    }

    public async Task<(bool IsHealthy, string? Error)> CheckHealthAsync(
        CancellationToken cancellationToken = default)
    {
        if (!_settings.Enabled)
        {
            return (false, "ElevenLabs is not enabled");
        }

        if (string.IsNullOrEmpty(_settings.ApiKey))
        {
            return (false, "ElevenLabs API key is not configured");
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{_settings.RestBaseUrl}/user");
            request.Headers.Add("xi-api-key", _settings.ApiKey);

            var response = await _httpClient.SendAsync(request, cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                return (true, null);
            }

            return (false, $"ElevenLabs API returned {response.StatusCode}");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ElevenLabs health check failed");
            return (false, ex.Message);
        }
    }

    // ElevenLabs API response models
    private class ElevenLabsVoicesResponse
    {
        public List<ElevenLabsVoice>? Voices { get; set; }
    }

    private class ElevenLabsVoice
    {
        [JsonPropertyName("voice_id")]
        public string? VoiceId { get; set; }

        public string? Name { get; set; }
        public string? Description { get; set; }

        [JsonPropertyName("preview_url")]
        public string? PreviewUrl { get; set; }

        public string? Category { get; set; }
        public Dictionary<string, string>? Labels { get; set; }
    }
}

/// <summary>
/// Real-time synthesis session using ElevenLabs WebSocket
/// </summary>
internal class ElevenLabsSynthesisSession : ISynthesisSession
{
    private readonly ElevenLabsSettings _settings;
    private readonly SynthesisOptions _options;
    private readonly Action<byte[]> _onAudio;
    private readonly ILogger _logger;
    private readonly ClientWebSocket _webSocket;
    private readonly CancellationTokenSource _cts;
    private Task? _receiveTask;
    private int _audioSequence;

    public string SessionId { get; } = Guid.NewGuid().ToString();
    public bool IsConnected => _webSocket.State == WebSocketState.Open;

    public ElevenLabsSynthesisSession(
        ElevenLabsSettings settings,
        SynthesisOptions options,
        Action<byte[]> onAudio,
        ILogger logger)
    {
        _settings = settings;
        _options = options;
        _onAudio = onAudio;
        _logger = logger;
        _webSocket = new ClientWebSocket();
        _cts = new CancellationTokenSource();
    }

    public async Task ConnectAsync(CancellationToken cancellationToken)
    {
        var wsUrl = $"{_settings.BaseUrl}/{_options.VoiceId}/stream-input?model_id={_options.Model}&output_format={_options.OutputFormat}&optimize_streaming_latency={_options.OptimizeStreamingLatency}";

        _webSocket.Options.SetRequestHeader("xi-api-key", _settings.ApiKey!);

        await _webSocket.ConnectAsync(new Uri(wsUrl), cancellationToken);
        _logger.LogInformation("ElevenLabs synthesis session {SessionId} connected", SessionId);

        // Send initial configuration
        var bosMessage = new
        {
            text = " ",
            voice_settings = new
            {
                stability = _options.Stability,
                similarity_boost = _options.SimilarityBoost,
                style = _options.Style,
                use_speaker_boost = _options.UseSpeakerBoost
            },
            xi_api_key = _settings.ApiKey
        };

        var bosJson = JsonSerializer.Serialize(bosMessage);
        await _webSocket.SendAsync(
            Encoding.UTF8.GetBytes(bosJson),
            WebSocketMessageType.Text,
            endOfMessage: true,
            cancellationToken);

        // Start receiving audio in background
        _receiveTask = ReceiveLoopAsync(_cts.Token);
    }

    public async Task SendTextAsync(string text, CancellationToken cancellationToken = default)
    {
        await SendTextAsync(text, tryTriggerGeneration: true, cancellationToken);
    }

    public async Task SendTextAsync(string text, bool tryTriggerGeneration, CancellationToken cancellationToken = default)
    {
        if (!IsConnected)
        {
            throw new InvalidOperationException("Session is not connected");
        }

        var message = new
        {
            text = text,
            try_trigger_generation = tryTriggerGeneration
        };

        var json = JsonSerializer.Serialize(message);
        await _webSocket.SendAsync(
            Encoding.UTF8.GetBytes(json),
            WebSocketMessageType.Text,
            endOfMessage: true,
            cancellationToken);

        _logger.LogDebug("Sent text chunk to ElevenLabs for session {SessionId}: {CharCount} chars, trigger={Trigger}",
            SessionId, text.Length, tryTriggerGeneration);
    }

    public async Task SendTextAndFlushAsync(string text, CancellationToken cancellationToken = default)
    {
        if (!IsConnected)
        {
            throw new InvalidOperationException("Session is not connected");
        }

        // Send text WITH flush=true in the same message
        // This forces immediate generation without closing the stream
        var message = new
        {
            text = text,
            try_trigger_generation = true,
            flush = true
        };

        var json = JsonSerializer.Serialize(message);
        await _webSocket.SendAsync(
            Encoding.UTF8.GetBytes(json),
            WebSocketMessageType.Text,
            endOfMessage: true,
            cancellationToken);

        _logger.LogDebug("Sent text with flush to ElevenLabs for session {SessionId}: {CharCount} chars",
            SessionId, text.Length);
    }

    public async Task FlushAsync(CancellationToken cancellationToken = default)
    {
        if (!IsConnected)
        {
            return;
        }

        // Send end-of-sequence message (empty text closes the generation stream)
        var eosMessage = new { text = "" };
        var json = JsonSerializer.Serialize(eosMessage);

        await _webSocket.SendAsync(
            Encoding.UTF8.GetBytes(json),
            WebSocketMessageType.Text,
            endOfMessage: true,
            cancellationToken);

        _logger.LogDebug("Sent EOS to ElevenLabs for session {SessionId}", SessionId);
    }

    public async Task FlushWithoutClosingAsync(CancellationToken cancellationToken = default)
    {
        if (!IsConnected)
        {
            return;
        }

        // Send flush=true to force generation without closing the stream
        // This allows more text to be sent afterward (unlike EOS which closes the stream)
        var flushMessage = new
        {
            text = " ",
            flush = true
        };
        var json = JsonSerializer.Serialize(flushMessage);

        await _webSocket.SendAsync(
            Encoding.UTF8.GetBytes(json),
            WebSocketMessageType.Text,
            endOfMessage: true,
            cancellationToken);

        _logger.LogDebug("Sent flush (without closing) to ElevenLabs for session {SessionId}", SessionId);
    }

    public async Task ReinitializeAsync(CancellationToken cancellationToken = default)
    {
        if (!IsConnected)
        {
            return;
        }

        // Send a new beginning-of-stream message to allow more text after a flush
        var bosMessage = new
        {
            text = " ",
            voice_settings = new
            {
                stability = _options.Stability,
                similarity_boost = _options.SimilarityBoost,
                style = _options.Style,
                use_speaker_boost = _options.UseSpeakerBoost
            }
        };

        var bosJson = JsonSerializer.Serialize(bosMessage);
        await _webSocket.SendAsync(
            Encoding.UTF8.GetBytes(bosJson),
            WebSocketMessageType.Text,
            endOfMessage: true,
            cancellationToken);

        _logger.LogDebug("Reinitialized synthesis session {SessionId} for new generation", SessionId);
    }

    public async Task CancelAsync()
    {
        _cts.Cancel();

        // Try to close gracefully
        if (_webSocket.State == WebSocketState.Open)
        {
            try
            {
                await _webSocket.CloseAsync(
                    WebSocketCloseStatus.NormalClosure,
                    "Cancelled",
                    CancellationToken.None);
            }
            catch
            {
                // Ignore errors during cancel
            }
        }
    }

    public async Task CloseAsync()
    {
        _cts.Cancel();

        if (_webSocket.State == WebSocketState.Open)
        {
            try
            {
                // Send flush before closing
                await FlushAsync(CancellationToken.None);

                await _webSocket.CloseAsync(
                    WebSocketCloseStatus.NormalClosure,
                    "Session closed",
                    CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error closing ElevenLabs WebSocket");
            }
        }

        if (_receiveTask != null)
        {
            try
            {
                await _receiveTask;
            }
            catch (OperationCanceledException)
            {
                // Expected
            }
        }

        _logger.LogInformation("ElevenLabs synthesis session {SessionId} closed", SessionId);
    }

    public async ValueTask DisposeAsync()
    {
        await CloseAsync();
        _webSocket.Dispose();
        _cts.Dispose();
    }

    private async Task ReceiveLoopAsync(CancellationToken cancellationToken)
    {
        var buffer = new byte[8192]; // Receive buffer
        var messageBuffer = new List<byte>(); // Accumulate fragmented messages
        WebSocketMessageType currentMessageType = WebSocketMessageType.Text;

        try
        {
            while (_webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                var result = await _webSocket.ReceiveAsync(
                    new ArraySegment<byte>(buffer),
                    cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    _logger.LogDebug("ElevenLabs WebSocket closed for session {SessionId}", SessionId);
                    break;
                }

                // Track message type for the first fragment
                if (messageBuffer.Count == 0)
                {
                    currentMessageType = result.MessageType;
                }

                // Accumulate message data
                for (int i = 0; i < result.Count; i++)
                {
                    messageBuffer.Add(buffer[i]);
                }

                // Process complete message when EndOfMessage is true
                if (result.EndOfMessage)
                {
                    var messageData = messageBuffer.ToArray();
                    messageBuffer.Clear();

                    if (currentMessageType == WebSocketMessageType.Binary)
                    {
                        // ElevenLabs sends raw binary audio data for PCM formats
                        _audioSequence++;
                        _logger.LogDebug("Received binary audio chunk {Sequence}: {ByteCount} bytes for session {SessionId}",
                            _audioSequence, messageData.Length, SessionId);
                        _onAudio(messageData);
                    }
                    else if (currentMessageType == WebSocketMessageType.Text)
                    {
                        var text = Encoding.UTF8.GetString(messageData);
                        ProcessMessage(text);
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected when session is closed
        }
        catch (WebSocketException ex)
        {
            _logger.LogWarning(ex, "WebSocket error in synthesis session {SessionId}", SessionId);
        }
    }

    private void ProcessMessage(string text)
    {
        // Skip empty messages
        if (string.IsNullOrWhiteSpace(text))
        {
            return;
        }

        // Check if this looks like JSON (starts with { or [)
        var trimmed = text.TrimStart();
        if (trimmed.Length == 0 || (trimmed[0] != '{' && trimmed[0] != '['))
        {
            // Not JSON - might be raw data or alignment info in different format
            _logger.LogDebug("Received non-JSON text message ({Length} chars) for session {SessionId}", text.Length, SessionId);
            return;
        }

        try
        {
            using var doc = JsonDocument.Parse(text);
            var root = doc.RootElement;

            // Check for audio data (base64 encoded - used when NOT using PCM formats)
            if (root.TryGetProperty("audio", out var audioElement))
            {
                var audioBase64 = audioElement.GetString();
                if (!string.IsNullOrEmpty(audioBase64))
                {
                    var audioData = Convert.FromBase64String(audioBase64);
                    _audioSequence++;
                    _logger.LogDebug("Received base64 audio chunk {Sequence}: {ByteCount} bytes for session {SessionId}",
                        _audioSequence, audioData.Length, SessionId);
                    _onAudio(audioData);
                }
            }

            // Check for alignment data (optional, for advanced features)
            // Note: isFinal can be null in some ElevenLabs responses, so check ValueKind before GetBoolean()
            if (root.TryGetProperty("isFinal", out var isFinal) &&
                isFinal.ValueKind == JsonValueKind.True)
            {
                _logger.LogDebug("Received final audio marker for session {SessionId}", SessionId);
            }

            // Check for normalizedAlignment (word-level timing)
            if (root.TryGetProperty("normalizedAlignment", out _))
            {
                _logger.LogDebug("Received alignment data for session {SessionId}", SessionId);
            }

            // Check for errors
            if (root.TryGetProperty("error", out var error))
            {
                var errorMessage = error.ValueKind == JsonValueKind.String
                    ? error.GetString()
                    : error.GetRawText();
                _logger.LogWarning("ElevenLabs error for session {SessionId}: {Error}", SessionId, errorMessage);
            }

            // Check for message property (status messages)
            if (root.TryGetProperty("message", out var message))
            {
                _logger.LogDebug("ElevenLabs message for session {SessionId}: {Message}", SessionId, message.GetString());
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse ElevenLabs JSON response for session {SessionId}. First 100 chars: {Preview}",
                SessionId, text.Length > 100 ? text[..100] : text);
        }
        catch (FormatException ex)
        {
            _logger.LogWarning(ex, "Failed to decode base64 audio for session {SessionId}", SessionId);
        }
        catch (Exception ex)
        {
            // Catch any other unexpected exceptions to prevent killing the receive loop
            _logger.LogWarning(ex, "Unexpected error processing ElevenLabs message for session {SessionId}. First 100 chars: {Preview}",
                SessionId, text.Length > 100 ? text[..100] : text);
        }
    }
}
