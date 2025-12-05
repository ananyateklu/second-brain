using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Telemetry;
using System.ClientModel;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text.Json;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;

namespace SecondBrain.Application.Services.AI.Providers;

public class GrokProvider : IAIProvider
{
    public const string HttpClientName = "Grok";

    private readonly XAISettings _settings;
    private readonly ILogger<GrokProvider> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ChatClient? _client;

    public string ProviderName => "Grok";
    public bool IsEnabled => _settings.Enabled;

    public GrokProvider(
        IOptions<AIProvidersSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<GrokProvider> logger)
    {
        _settings = settings.Value.XAI;
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        if (_settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            try
            {
                // Grok uses OpenAI-compatible API, so we use the OpenAI SDK with custom endpoint
                var apiKeyCredential = new ApiKeyCredential(_settings.ApiKey);
                var openAIClientOptions = new OpenAIClientOptions
                {
                    Endpoint = new Uri(_settings.BaseUrl)
                };

                var openAIClient = new OpenAIClient(apiKeyCredential, openAIClientOptions);
                _client = openAIClient.GetChatClient(_settings.DefaultModel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize xAI Grok client");
            }
        }
    }

    private HttpClient CreateHttpClient()
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);
        if (!string.IsNullOrWhiteSpace(_settings.ApiKey) &&
            !client.DefaultRequestHeaders.Contains("Authorization"))
        {
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {_settings.ApiKey}");
        }
        return client;
    }

    public async Task<AIResponse> GenerateCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Grok provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var model = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Grok.GenerateCompletion", ProviderName, model);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var messages = new List<OpenAIChatMessage>
            {
                new UserChatMessage(request.Prompt)
            };

            var chatOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = request.MaxTokens ?? _settings.MaxTokens,
                Temperature = request.Temperature ?? _settings.Temperature
            };

            var response = await _client.CompleteChatAsync(
                messages,
                chatOptions,
                cancellationToken);

            stopwatch.Stop();
            var tokensUsed = response.Value.Usage.TotalTokenCount;

            activity?.SetTag("ai.tokens.total", tokensUsed);
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true, tokensUsed);

            return new AIResponse
            {
                Success = true,
                Content = response.Value.Content[0].Text,
                Model = _settings.DefaultModel,
                TokensUsed = tokensUsed,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating completion from Grok");
            return new AIResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    public async Task<AIResponse> GenerateChatCompletionAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Grok provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var model = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Grok.GenerateChatCompletion", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var chatMessages = messageList.Select(m => ConvertToGrokMessage(m)).ToList();

            var chatOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = settings?.MaxTokens ?? _settings.MaxTokens,
                Temperature = settings?.Temperature ?? _settings.Temperature
            };

            var response = await _client.CompleteChatAsync(
                chatMessages,
                chatOptions,
                cancellationToken);

            stopwatch.Stop();
            var tokensUsed = response.Value.Usage.TotalTokenCount;

            activity?.SetTag("ai.tokens.total", tokensUsed);
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true, tokensUsed);

            return new AIResponse
            {
                Success = true,
                Content = response.Value.Content[0].Text,
                Model = _settings.DefaultModel,
                TokensUsed = tokensUsed,
                Provider = ProviderName
            };
        }
        catch (ClientResultException ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating chat completion from Grok. Status: {Status}", ex.Status);
            return new AIResponse
            {
                Success = false,
                Error = $"Grok API Error ({ex.Status}): {ex.Message}",
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating chat completion from Grok");
            return new AIResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    public async Task<IAsyncEnumerable<string>> StreamCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return EmptyAsyncEnumerable();
        }

        return StreamCompletionInternalAsync(request, cancellationToken);
    }

    private async IAsyncEnumerable<string> StreamCompletionInternalAsync(
        AIRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if (_client == null)
            yield break;

        var model = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Grok.StreamCompletion", ProviderName, model);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var messages = new List<OpenAIChatMessage>
        {
            new UserChatMessage(request.Prompt)
        };

        var chatOptions = new ChatCompletionOptions
        {
            MaxOutputTokenCount = request.MaxTokens ?? _settings.MaxTokens,
            Temperature = request.Temperature ?? _settings.Temperature
        };

        var tokenCount = 0;
        await foreach (var update in _client.CompleteChatStreamingAsync(
            messages,
            chatOptions,
            cancellationToken))
        {
            foreach (var contentPart in update.ContentUpdate)
            {
                if (!firstTokenReceived)
                {
                    firstTokenReceived = true;
                    ApplicationTelemetry.AIStreamingFirstTokenDuration.Record(
                        stopwatch.ElapsedMilliseconds,
                        new("provider", ProviderName),
                        new("model", model));
                }
                tokenCount++;
                yield return contentPart.Text;
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true);
    }

    public async Task<IAsyncEnumerable<string>> StreamChatCompletionAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return EmptyAsyncEnumerable();
        }

        return StreamChatCompletionInternalAsync(messages, settings, cancellationToken);
    }

    private async IAsyncEnumerable<string> StreamChatCompletionInternalAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if (_client == null)
            yield break;

        var model = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Grok.StreamChatCompletion", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var chatMessages = messageList.Select(m => ConvertToGrokMessage(m)).ToList();

        var chatOptions = new ChatCompletionOptions
        {
            MaxOutputTokenCount = settings?.MaxTokens ?? _settings.MaxTokens,
            Temperature = settings?.Temperature ?? _settings.Temperature
        };

        var tokenCount = 0;
        await foreach (var update in _client.CompleteChatStreamingAsync(
            chatMessages,
            chatOptions,
            cancellationToken))
        {
            foreach (var contentPart in update.ContentUpdate)
            {
                if (!firstTokenReceived)
                {
                    firstTokenReceived = true;
                    ApplicationTelemetry.AIStreamingFirstTokenDuration.Record(
                        stopwatch.ElapsedMilliseconds,
                        new("provider", ProviderName),
                        new("model", model));
                }
                tokenCount++;
                yield return contentPart.Text;
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true);
    }

    /// <summary>
    /// Convert a ChatMessage to Grok/xAI format (OpenAI-compatible), handling multimodal content
    /// </summary>
    private static OpenAIChatMessage ConvertToGrokMessage(Models.ChatMessage message)
    {
        var role = message.Role.ToLower();

        // System and assistant messages don't support images
        if (role == "system")
            return new SystemChatMessage(message.Content);

        if (role == "assistant")
            return new AssistantChatMessage(message.Content);

        // User message - check for images
        if (message.Images == null || message.Images.Count == 0)
            return new UserChatMessage(message.Content);

        // Build multimodal content parts (same as OpenAI)
        var contentParts = new List<ChatMessageContentPart>();

        // Add text content first (if any)
        if (!string.IsNullOrEmpty(message.Content))
        {
            contentParts.Add(ChatMessageContentPart.CreateTextPart(message.Content));
        }

        // Add image content
        foreach (var image in message.Images)
        {
            // Grok uses OpenAI-compatible format: data URL
            var dataUrl = $"data:{image.MediaType};base64,{image.Base64Data}";
            contentParts.Add(ChatMessageContentPart.CreateImagePart(new Uri(dataUrl)));
        }

        return new UserChatMessage(contentParts);
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
            return false;

        try
        {
            var testMessage = new List<OpenAIChatMessage>
            {
                new UserChatMessage("Hello")
            };

            var chatOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 5
            };

            var response = await _client.CompleteChatAsync(
                testMessage,
                chatOptions,
                cancellationToken);

            return response?.Value != null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Grok availability check failed");
            return false;
        }
    }

    private async Task<IEnumerable<string>> FetchAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var httpClient = CreateHttpClient();
            var response = await httpClient.GetAsync($"{_settings.BaseUrl}/models", cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                var jsonDoc = JsonDocument.Parse(content);

                if (jsonDoc.RootElement.TryGetProperty("data", out var dataElement))
                {
                    return dataElement.EnumerateArray()
                        .Where(model => model.TryGetProperty("id", out _))
                        .Select(model => model.GetProperty("id").GetString() ?? string.Empty)
                        .Where(id => !string.IsNullOrEmpty(id))
                        .OrderByDescending(id => id)
                        .ToList();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch available models from xAI Grok API");
        }

        // Fallback to known models if API call fails
        return new[]
        {
            "grok-2",
            "grok-2-1212",
            "grok-2-vision-1212",
            "grok-beta"
        };
    }

    public async Task<AIProviderHealth> GetHealthStatusAsync(
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var health = new AIProviderHealth
        {
            Provider = ProviderName,
            CheckedAt = DateTime.UtcNow
        };

        if (!IsEnabled)
        {
            health.IsHealthy = false;
            health.Status = "Disabled";
            health.ErrorMessage = "Provider is disabled in configuration";
            return health;
        }

        if (_client == null)
        {
            health.IsHealthy = false;
            health.Status = "Not Configured";
            health.ErrorMessage = "API key not configured";
            return health;
        }

        try
        {
            var isAvailable = await IsAvailableAsync(cancellationToken);
            var availableModels = await FetchAvailableModelsAsync(cancellationToken);
            stopwatch.Stop();

            health.IsHealthy = isAvailable;
            health.Status = isAvailable ? "Healthy" : "Unavailable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.Version = "v1";
            health.AvailableModels = availableModels;

            if (!isAvailable)
            {
                health.ErrorMessage = "Failed to connect to xAI Grok API";
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Error";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Grok health check failed");
        }

        return health;
    }

    private static async IAsyncEnumerable<string> EmptyAsyncEnumerable()
    {
        await Task.CompletedTask;
        yield break;
    }
}
