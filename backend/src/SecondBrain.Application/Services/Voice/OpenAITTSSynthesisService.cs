using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Voice.Models;

namespace SecondBrain.Application.Services.Voice;

/// <summary>
/// OpenAI-based Text-to-Speech synthesis service
/// Uses the POST /v1/audio/speech endpoint with HTTP streaming
/// </summary>
public class OpenAITTSSynthesisService : IVoiceSynthesisService
{
    private readonly OpenAITTSSettings _settings;
    private readonly ILogger<OpenAITTSSynthesisService> _logger;
    private readonly HttpClient _httpClient;

    public OpenAITTSSynthesisService(
        IOptions<VoiceSettings> voiceSettings,
        ILogger<OpenAITTSSynthesisService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _settings = voiceSettings.Value.OpenAITTS;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("OpenAITTS");
    }

    public string ProviderName => "OpenAI";

    public bool IsAvailable => _settings.Enabled && !string.IsNullOrEmpty(_settings.ApiKey);

    public async IAsyncEnumerable<byte[]> StreamSynthesisAsync(
        string text,
        SynthesisOptions options,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            throw new InvalidOperationException("OpenAI TTS service is not available");
        }

        var requestBody = new
        {
            model = _settings.Model,
            voice = options.VoiceId ?? _settings.DefaultVoiceId,
            input = text,
            response_format = _settings.ResponseFormat,
            speed = _settings.Speed
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_settings.BaseUrl}/audio/speech");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
        request.Content = new StringContent(
            JsonSerializer.Serialize(requestBody),
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
            throw new InvalidOperationException("OpenAI TTS service is not available");
        }

        // OpenAI TTS doesn't have a native WebSocket streaming API
        // We implement a session that buffers text and synthesizes on flush
        var session = new OpenAITTSSynthesisSession(
            _settings,
            options,
            onAudio,
            _httpClient,
            _logger);

        await session.InitializeAsync(cancellationToken);
        return session;
    }

    public async Task<byte[]> SynthesizeAsync(
        string text,
        SynthesisOptions options,
        CancellationToken cancellationToken = default)
    {
        if (!IsAvailable)
        {
            throw new InvalidOperationException("OpenAI TTS service is not available");
        }

        var requestBody = new
        {
            model = _settings.Model,
            voice = options.VoiceId ?? _settings.DefaultVoiceId,
            input = text,
            response_format = _settings.ResponseFormat,
            speed = _settings.Speed
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_settings.BaseUrl}/audio/speech");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
        request.Content = new StringContent(
            JsonSerializer.Serialize(requestBody),
            Encoding.UTF8,
            "application/json");

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsByteArrayAsync(cancellationToken);
    }

    public Task<IReadOnlyList<VoiceInfo>> GetAvailableVoicesAsync(
        CancellationToken cancellationToken = default)
    {
        // OpenAI has a fixed set of voices - return them as static list
        var voices = new List<VoiceInfo>
        {
            new() { VoiceId = "alloy", Name = "Alloy", Description = "Balanced and versatile voice" },
            new() { VoiceId = "echo", Name = "Echo", Description = "Male voice with depth" },
            new() { VoiceId = "fable", Name = "Fable", Description = "Expressive British voice" },
            new() { VoiceId = "onyx", Name = "Onyx", Description = "Deep and authoritative voice" },
            new() { VoiceId = "nova", Name = "Nova", Description = "Warm and friendly female voice" },
            new() { VoiceId = "shimmer", Name = "Shimmer", Description = "Clear and optimistic female voice" }
        };

        return Task.FromResult<IReadOnlyList<VoiceInfo>>(voices);
    }

    public Task<VoiceInfo?> GetVoiceAsync(
        string voiceId,
        CancellationToken cancellationToken = default)
    {
        var voices = new Dictionary<string, VoiceInfo>(StringComparer.OrdinalIgnoreCase)
        {
            ["alloy"] = new() { VoiceId = "alloy", Name = "Alloy", Description = "Balanced and versatile voice" },
            ["echo"] = new() { VoiceId = "echo", Name = "Echo", Description = "Male voice with depth" },
            ["fable"] = new() { VoiceId = "fable", Name = "Fable", Description = "Expressive British voice" },
            ["onyx"] = new() { VoiceId = "onyx", Name = "Onyx", Description = "Deep and authoritative voice" },
            ["nova"] = new() { VoiceId = "nova", Name = "Nova", Description = "Warm and friendly female voice" },
            ["shimmer"] = new() { VoiceId = "shimmer", Name = "Shimmer", Description = "Clear and optimistic female voice" }
        };

        voices.TryGetValue(voiceId, out var voice);
        return Task.FromResult(voice);
    }

    public async Task<(bool IsHealthy, string? Error)> CheckHealthAsync(
        CancellationToken cancellationToken = default)
    {
        if (!_settings.Enabled)
        {
            return (false, "OpenAI TTS is not enabled");
        }

        if (string.IsNullOrEmpty(_settings.ApiKey))
        {
            return (false, "OpenAI API key is not configured");
        }

        try
        {
            // Make a minimal request to verify API key works
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{_settings.BaseUrl}/models");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

            var response = await _httpClient.SendAsync(request, cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                return (true, null);
            }

            return (false, $"OpenAI API returned {response.StatusCode}");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenAI TTS health check failed");
            return (false, ex.Message);
        }
    }
}

/// <summary>
/// Synthesis session for OpenAI TTS (buffer-based since OpenAI doesn't support WebSocket streaming)
/// </summary>
internal class OpenAITTSSynthesisSession : ISynthesisSession
{
    private readonly OpenAITTSSettings _settings;
    private readonly SynthesisOptions _options;
    private readonly Action<byte[]> _onAudio;
    private readonly HttpClient _httpClient;
    private readonly ILogger _logger;
    private readonly StringBuilder _textBuffer;
    private bool _isInitialized;
    private bool _isClosed;

    public string SessionId { get; } = Guid.NewGuid().ToString();
    public bool IsConnected => _isInitialized && !_isClosed;

    public OpenAITTSSynthesisSession(
        OpenAITTSSettings settings,
        SynthesisOptions options,
        Action<byte[]> onAudio,
        HttpClient httpClient,
        ILogger logger)
    {
        _settings = settings;
        _options = options;
        _onAudio = onAudio;
        _httpClient = httpClient;
        _logger = logger;
        _textBuffer = new StringBuilder();
    }

    public Task InitializeAsync(CancellationToken cancellationToken)
    {
        _isInitialized = true;
        _logger.LogInformation("OpenAI TTS session {SessionId} initialized", SessionId);
        return Task.CompletedTask;
    }

    public Task SendTextAsync(string text, CancellationToken cancellationToken = default)
    {
        return SendTextAsync(text, tryTriggerGeneration: false, cancellationToken);
    }

    public Task SendTextAsync(string text, bool tryTriggerGeneration, CancellationToken cancellationToken = default)
    {
        if (_isClosed)
        {
            throw new InvalidOperationException("Session is closed");
        }

        _textBuffer.Append(text);

        // For OpenAI TTS, we synthesize on sentence boundaries or when triggered
        if (tryTriggerGeneration && _textBuffer.Length > 0)
        {
            return SynthesizeBufferedTextAsync(cancellationToken);
        }

        return Task.CompletedTask;
    }

    public async Task SendTextAndFlushAsync(string text, CancellationToken cancellationToken = default)
    {
        if (_isClosed)
        {
            throw new InvalidOperationException("Session is closed");
        }

        _textBuffer.Append(text);
        await SynthesizeBufferedTextAsync(cancellationToken);
    }

    public async Task FlushAsync(CancellationToken cancellationToken = default)
    {
        if (_textBuffer.Length > 0)
        {
            await SynthesizeBufferedTextAsync(cancellationToken);
        }
    }

    public Task FlushWithoutClosingAsync(CancellationToken cancellationToken = default)
    {
        return FlushAsync(cancellationToken);
    }

    public Task ReinitializeAsync(CancellationToken cancellationToken = default)
    {
        _textBuffer.Clear();
        return Task.CompletedTask;
    }

    public Task CancelAsync()
    {
        _isClosed = true;
        return Task.CompletedTask;
    }

    public Task CloseAsync()
    {
        _isClosed = true;
        _logger.LogInformation("OpenAI TTS session {SessionId} closed", SessionId);
        return Task.CompletedTask;
    }

    public ValueTask DisposeAsync()
    {
        _isClosed = true;
        return ValueTask.CompletedTask;
    }

    private async Task SynthesizeBufferedTextAsync(CancellationToken cancellationToken)
    {
        var text = _textBuffer.ToString();
        _textBuffer.Clear();

        if (string.IsNullOrWhiteSpace(text))
        {
            return;
        }

        _logger.LogDebug("Synthesizing {CharCount} characters via OpenAI TTS for session {SessionId}",
            text.Length, SessionId);

        try
        {
            var requestBody = new
            {
                model = _settings.Model,
                voice = _options.VoiceId ?? _settings.DefaultVoiceId,
                input = text,
                response_format = _settings.ResponseFormat,
                speed = _settings.Speed
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, $"{_settings.BaseUrl}/audio/speech");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
            request.Content = new StringContent(
                JsonSerializer.Serialize(requestBody),
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
            var sequence = 0;

            while ((bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, cancellationToken)) > 0)
            {
                var chunk = new byte[bytesRead];
                Buffer.BlockCopy(buffer, 0, chunk, 0, bytesRead);
                _onAudio(chunk);
                sequence++;
            }

            _logger.LogDebug("Sent {ChunkCount} audio chunks for session {SessionId}", sequence, SessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error synthesizing text via OpenAI TTS for session {SessionId}", SessionId);
            throw;
        }
    }
}
