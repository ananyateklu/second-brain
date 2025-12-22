using System.Net.WebSockets;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Voice.Models;

namespace SecondBrain.Application.Services.Voice;

/// <summary>
/// Deepgram-based Speech-to-Text transcription service
/// </summary>
public class DeepgramTranscriptionService : IVoiceTranscriptionService
{
    private readonly DeepgramSettings _settings;
    private readonly ILogger<DeepgramTranscriptionService> _logger;
    private readonly HttpClient _httpClient;

    public DeepgramTranscriptionService(
        IOptions<VoiceSettings> voiceSettings,
        ILogger<DeepgramTranscriptionService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _settings = voiceSettings.Value.Deepgram;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("Deepgram");
    }

    public string ProviderName => "Deepgram";

    public bool IsAvailable => _settings.Enabled && !string.IsNullOrEmpty(_settings.ApiKey);

    public async IAsyncEnumerable<TranscriptionResult> StreamTranscriptionAsync(
        Stream audioStream,
        TranscriptionOptions options,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            throw new InvalidOperationException("Deepgram transcription service is not available");
        }

        using var webSocket = new ClientWebSocket();
        var wsUrl = BuildWebSocketUrl(options);

        webSocket.Options.SetRequestHeader("Authorization", $"Token {_settings.ApiKey}");

        try
        {
            await webSocket.ConnectAsync(new Uri(wsUrl), cancellationToken);
            _logger.LogInformation("Connected to Deepgram WebSocket for streaming transcription");

            // Start receiving results in background
            var receiveTask = ReceiveTranscriptionsAsync(webSocket, cancellationToken);

            // Send audio data
            var buffer = new byte[_settings.SampleRate * 2]; // 1 second of audio at 16-bit
            int bytesRead;

            while ((bytesRead = await audioStream.ReadAsync(buffer, 0, buffer.Length, cancellationToken)) > 0)
            {
                if (webSocket.State != WebSocketState.Open)
                    break;

                await webSocket.SendAsync(
                    new ArraySegment<byte>(buffer, 0, bytesRead),
                    WebSocketMessageType.Binary,
                    endOfMessage: true,
                    cancellationToken);
            }

            // Signal end of audio
            await webSocket.SendAsync(
                Array.Empty<byte>(),
                WebSocketMessageType.Binary,
                endOfMessage: true,
                cancellationToken);

            // Yield all received transcriptions
            await foreach (var result in receiveTask.WithCancellation(cancellationToken))
            {
                yield return result;
            }
        }
        finally
        {
            if (webSocket.State == WebSocketState.Open)
            {
                await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Done", CancellationToken.None);
            }
        }
    }

    public async Task<ITranscriptionSession> CreateSessionAsync(
        TranscriptionOptions options,
        Action<TranscriptionResult> onTranscript,
        CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            throw new InvalidOperationException("Deepgram transcription service is not available");
        }

        var session = new DeepgramTranscriptionSession(
            _settings,
            options,
            onTranscript,
            _logger);

        await session.ConnectAsync(cancellationToken);
        return session;
    }

    public async Task<TranscriptionResult> TranscribeAsync(
        byte[] audioData,
        TranscriptionOptions options,
        CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            throw new InvalidOperationException("Deepgram transcription service is not available");
        }

        var url = $"https://api.deepgram.com/v1/listen?model={_settings.Model}&language={options.Language}&punctuate={options.Punctuation.ToString().ToLower()}&smart_format={options.SmartFormat.ToString().ToLower()}";

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Add("Authorization", $"Token {_settings.ApiKey}");
        request.Content = new ByteArrayContent(audioData);
        request.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("audio/wav");

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var deepgramResponse = JsonSerializer.Deserialize<DeepgramBatchResponse>(json);

        var channel = deepgramResponse?.Results?.Channels?.FirstOrDefault();
        var alternative = channel?.Alternatives?.FirstOrDefault();

        return new TranscriptionResult
        {
            Text = alternative?.Transcript ?? string.Empty,
            IsFinal = true,
            Confidence = alternative?.Confidence ?? 0,
            Words = alternative?.Words?.Select(w => new WordInfo
            {
                Word = w.Word,
                Start = w.Start,
                End = w.End,
                Confidence = w.Confidence
            }).ToList()
        };
    }

    public async Task<(bool IsHealthy, string? Error)> CheckHealthAsync(
        CancellationToken cancellationToken = default)
    {
        if (!_settings.Enabled)
        {
            return (false, "Deepgram is not enabled");
        }

        if (string.IsNullOrEmpty(_settings.ApiKey))
        {
            return (false, "Deepgram API key is not configured");
        }

        try
        {
            // Test API key with a simple projects endpoint
            using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.deepgram.com/v1/projects");
            request.Headers.Add("Authorization", $"Token {_settings.ApiKey}");

            var response = await _httpClient.SendAsync(request, cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                return (true, null);
            }

            return (false, $"Deepgram API returned {response.StatusCode}");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Deepgram health check failed");
            return (false, ex.Message);
        }
    }

    private string BuildWebSocketUrl(TranscriptionOptions options)
    {
        var queryParams = new List<string>
        {
            $"model={_settings.Model}",
            $"language={options.Language}",
            $"punctuate={options.Punctuation.ToString().ToLower()}",
            $"interim_results={options.InterimResults.ToString().ToLower()}",
            $"endpointing={options.EndpointingMs}",
            $"smart_format={options.SmartFormat.ToString().ToLower()}",
            $"sample_rate={options.SampleRate}",
            $"encoding={options.Encoding}",
            $"channels={options.Channels}"
        };

        if (options.Diarization)
        {
            queryParams.Add("diarize=true");
        }

        return $"{_settings.BaseUrl}?{string.Join("&", queryParams)}";
    }

    private async IAsyncEnumerable<TranscriptionResult> ReceiveTranscriptionsAsync(
        ClientWebSocket webSocket,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];

        while (webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
        {
            var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);

            if (result.MessageType == WebSocketMessageType.Close)
                break;

            if (result.MessageType == WebSocketMessageType.Text)
            {
                var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                var transcription = ParseDeepgramResponse(json);

                if (transcription != null)
                {
                    yield return transcription;
                }
            }
        }
    }

    private TranscriptionResult? ParseDeepgramResponse(string json)
    {
        try
        {
            var response = JsonSerializer.Deserialize<DeepgramStreamResponse>(json);

            if (response?.Type == "Results")
            {
                var channel = response.Channel;
                var alternative = channel?.Alternatives?.FirstOrDefault();

                if (alternative != null && !string.IsNullOrEmpty(alternative.Transcript))
                {
                    return new TranscriptionResult
                    {
                        Text = alternative.Transcript,
                        IsFinal = response.IsFinal,
                        Confidence = alternative.Confidence,
                        Start = response.Start,
                        End = response.Start + response.Duration,
                        Speaker = channel?.Alternatives?.FirstOrDefault()?.Words?.FirstOrDefault()?.Speaker,
                        Words = alternative.Words?.Select(w => new WordInfo
                        {
                            Word = w.Word,
                            Start = w.Start,
                            End = w.End,
                            Confidence = w.Confidence,
                            Speaker = w.Speaker
                        }).ToList()
                    };
                }
            }

            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse Deepgram response: {Json}", json);
            return null;
        }
    }

    // Deepgram response models
    private class DeepgramStreamResponse
    {
        public string? Type { get; set; }
        public DeepgramChannel? Channel { get; set; }
        public bool IsFinal { get; set; }
        public double Start { get; set; }
        public double Duration { get; set; }
    }

    private class DeepgramBatchResponse
    {
        public DeepgramResults? Results { get; set; }
    }

    private class DeepgramResults
    {
        public List<DeepgramChannel>? Channels { get; set; }
    }

    private class DeepgramChannel
    {
        public List<DeepgramAlternative>? Alternatives { get; set; }
    }

    private class DeepgramAlternative
    {
        public string? Transcript { get; set; }
        public double Confidence { get; set; }
        public List<DeepgramWord>? Words { get; set; }
    }

    private class DeepgramWord
    {
        public string Word { get; set; } = string.Empty;
        public double Start { get; set; }
        public double End { get; set; }
        public double Confidence { get; set; }
        public int? Speaker { get; set; }
    }
}

/// <summary>
/// Real-time transcription session using Deepgram WebSocket
/// </summary>
internal class DeepgramTranscriptionSession : ITranscriptionSession
{
    private readonly DeepgramSettings _settings;
    private readonly TranscriptionOptions _options;
    private readonly Action<TranscriptionResult> _onTranscript;
    private readonly ILogger _logger;
    private readonly ClientWebSocket _webSocket;
    private readonly CancellationTokenSource _cts;
    private Task? _receiveTask;

    public string SessionId { get; } = Guid.NewGuid().ToString();
    public bool IsConnected => _webSocket.State == WebSocketState.Open;

    public DeepgramTranscriptionSession(
        DeepgramSettings settings,
        TranscriptionOptions options,
        Action<TranscriptionResult> onTranscript,
        ILogger logger)
    {
        _settings = settings;
        _options = options;
        _onTranscript = onTranscript;
        _logger = logger;
        _webSocket = new ClientWebSocket();
        _cts = new CancellationTokenSource();
    }

    public async Task ConnectAsync(CancellationToken cancellationToken)
    {
        var wsUrl = BuildWebSocketUrl();
        _webSocket.Options.SetRequestHeader("Authorization", $"Token {_settings.ApiKey}");

        await _webSocket.ConnectAsync(new Uri(wsUrl), cancellationToken);
        _logger.LogInformation("Deepgram transcription session {SessionId} connected", SessionId);

        // Start receiving in background
        _receiveTask = ReceiveLoopAsync(_cts.Token);
    }

    public async Task SendAudioAsync(byte[] audioChunk, CancellationToken cancellationToken = default)
    {
        if (!IsConnected)
        {
            throw new InvalidOperationException("Session is not connected");
        }

        await _webSocket.SendAsync(
            new ArraySegment<byte>(audioChunk),
            WebSocketMessageType.Binary,
            endOfMessage: true,
            cancellationToken);
    }

    public async Task EndAudioAsync(CancellationToken cancellationToken = default)
    {
        if (IsConnected)
        {
            // Send empty message to signal end of audio
            await _webSocket.SendAsync(
                Array.Empty<byte>(),
                WebSocketMessageType.Binary,
                endOfMessage: true,
                cancellationToken);
        }
    }

    public async Task CloseAsync()
    {
        _cts.Cancel();

        if (_webSocket.State == WebSocketState.Open)
        {
            try
            {
                await _webSocket.CloseAsync(
                    WebSocketCloseStatus.NormalClosure,
                    "Session closed",
                    CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error closing Deepgram WebSocket");
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

        _logger.LogInformation("Deepgram transcription session {SessionId} closed", SessionId);
    }

    public async ValueTask DisposeAsync()
    {
        await CloseAsync();
        _webSocket.Dispose();
        _cts.Dispose();
    }

    private string BuildWebSocketUrl()
    {
        var queryParams = new List<string>
        {
            $"model={_settings.Model}",
            $"language={_options.Language}",
            $"punctuate={_options.Punctuation.ToString().ToLower()}",
            $"interim_results={_options.InterimResults.ToString().ToLower()}",
            $"endpointing={_options.EndpointingMs}",
            $"smart_format={_options.SmartFormat.ToString().ToLower()}",
            $"sample_rate={_options.SampleRate}",
            $"encoding={_options.Encoding}",
            $"channels={_options.Channels}"
        };

        if (_options.Diarization)
        {
            queryParams.Add("diarize=true");
        }

        return $"{_settings.BaseUrl}?{string.Join("&", queryParams)}";
    }

    private async Task ReceiveLoopAsync(CancellationToken cancellationToken)
    {
        var buffer = new byte[8192];

        try
        {
            while (_webSocket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
            {
                var result = await _webSocket.ReceiveAsync(
                    new ArraySegment<byte>(buffer),
                    cancellationToken);

                if (result.MessageType == WebSocketMessageType.Close)
                    break;

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    var transcription = ParseResponse(json);

                    if (transcription != null)
                    {
                        _onTranscript(transcription);
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
            _logger.LogWarning(ex, "WebSocket error in transcription session {SessionId}", SessionId);
        }
    }

    private TranscriptionResult? ParseResponse(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("type", out var typeElement) &&
                typeElement.GetString() == "Results")
            {
                // Use TryGetProperty for safe access to nested properties
                if (!root.TryGetProperty("channel", out var channel))
                    return null;

                if (!channel.TryGetProperty("alternatives", out var alternatives))
                    return null;

                if (alternatives.GetArrayLength() > 0)
                {
                    var alternative = alternatives[0];

                    if (!alternative.TryGetProperty("transcript", out var transcriptElement))
                        return null;

                    var transcript = transcriptElement.GetString();

                    if (!string.IsNullOrEmpty(transcript))
                    {
                        // Get optional timing properties with proper null handling
                        double? startTime = root.TryGetProperty("start", out var start) ? start.GetDouble() : null;
                        double? endTime = startTime.HasValue && root.TryGetProperty("duration", out var duration)
                            ? startTime.Value + duration.GetDouble()
                            : null;

                        return new TranscriptionResult
                        {
                            Text = transcript,
                            IsFinal = root.TryGetProperty("is_final", out var isFinal) && isFinal.GetBoolean(),
                            Confidence = alternative.TryGetProperty("confidence", out var confidence) ? confidence.GetDouble() : 0.0,
                            Start = startTime,
                            End = endTime
                        };
                    }
                }
            }

            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse Deepgram response");
            return null;
        }
    }
}
