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
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;
using GrokToolStreamEvent = SecondBrain.Application.Services.AI.Models.GrokToolStreamEvent;
using GrokToolStreamEventType = SecondBrain.Application.Services.AI.Models.GrokToolStreamEventType;
using GrokToolCallInfo = SecondBrain.Application.Services.AI.Models.GrokToolCallInfo;
using GrokTokenUsage = SecondBrain.Application.Services.AI.Models.GrokTokenUsage;

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

    public Task<IAsyncEnumerable<string>> StreamCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(StreamCompletionInternalAsync(request, cancellationToken));
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

    public Task<IAsyncEnumerable<string>> StreamChatCompletionAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(StreamChatCompletionInternalAsync(messages, settings, cancellationToken));
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
    /// Stream chat completion with token usage callback.
    /// Grok uses OpenAI-compatible API which supports usage tracking.
    /// </summary>
    public Task<IAsyncEnumerable<string>> StreamChatCompletionWithUsageAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings,
        Action<StreamingTokenUsage>? onUsageAvailable,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(StreamChatCompletionWithUsageInternalAsync(messages, settings, onUsageAvailable, cancellationToken));
    }

    private async IAsyncEnumerable<string> StreamChatCompletionWithUsageInternalAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings,
        Action<StreamingTokenUsage>? onUsageAvailable,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        if (_client == null)
            yield break;

        var model = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Grok.StreamChatCompletionWithUsage", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.streaming", true);
        activity?.SetTag("ai.usage_tracking", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var chatMessages = messageList.Select(m => ConvertToGrokMessage(m)).ToList();

        var chatOptions = new ChatCompletionOptions
        {
            MaxOutputTokenCount = settings?.MaxTokens ?? _settings.MaxTokens,
            Temperature = settings?.Temperature ?? _settings.Temperature
        };

        // Enable streaming usage via reflection (StreamOptions is internal in OpenAI SDK 2.7.0)
        // This sets stream_options: { include_usage: true } so we get actual token counts
        // Grok/xAI uses OpenAI-compatible API, so same approach applies
        try
        {
            var streamOptionsProperty = typeof(ChatCompletionOptions).GetProperty("StreamOptions",
                BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
            if (streamOptionsProperty != null)
            {
                // Create InternalChatCompletionStreamOptions instance
                var streamOptionsType = streamOptionsProperty.PropertyType;
                var streamOptionsInstance = Activator.CreateInstance(streamOptionsType);
                if (streamOptionsInstance != null)
                {
                    // Set IncludeUsage property to true
                    var includeUsageProperty = streamOptionsType.GetProperty("IncludeUsage",
                        BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
                    includeUsageProperty?.SetValue(streamOptionsInstance, true);
                    streamOptionsProperty.SetValue(chatOptions, streamOptionsInstance);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug("Could not enable streaming usage via reflection: {Error}. Will use estimation.", ex.Message);
        }

        var tokenCount = 0;
        int? promptTokens = null;
        int? completionTokens = null;

        await foreach (var update in _client.CompleteChatStreamingAsync(
            chatMessages,
            chatOptions,
            cancellationToken))
        {
            // Capture usage information if available (Grok/xAI may send it in final chunk like OpenAI)
            if (update.Usage != null)
            {
                promptTokens = update.Usage.InputTokenCount;
                completionTokens = update.Usage.OutputTokenCount;
                activity?.SetTag("ai.tokens.input", promptTokens);
                activity?.SetTag("ai.tokens.output", completionTokens);
            }

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

        // Create usage info - use actual if available, otherwise estimate
        StreamingTokenUsage usage;
        if (promptTokens.HasValue && completionTokens.HasValue)
        {
            usage = StreamingTokenUsage.CreateActual(promptTokens.Value, completionTokens.Value, ProviderName, model);
        }
        else
        {
            // Fallback to estimation if provider didn't return usage
            var estimatedInput = messageList.Sum(m => TokenEstimator.EstimateTokenCount(m.Content)) + (messageList.Count * 10);
            usage = StreamingTokenUsage.CreateEstimated(estimatedInput, tokenCount, ProviderName, model);
        }

        // Invoke callback with usage info
        onUsageAvailable?.Invoke(usage);

        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetTag("ai.usage.is_actual", usage.IsActual);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true, usage.TotalTokens);
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

    #region Think Mode

    /// <summary>
    /// Generate completion with Think Mode (extended reasoning).
    /// Think Mode enables step-by-step reasoning for complex problems.
    /// </summary>
    public async Task<GrokThinkModeResponse> GenerateWithThinkModeAsync(
        IEnumerable<Models.ChatMessage> messages,
        GrokThinkModeOptions thinkOptions,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return new GrokThinkModeResponse
            {
                Success = false,
                Error = "Grok provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var model = settings?.Model ?? "grok-3"; // Think mode works best with grok-3
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Grok.GenerateWithThinkMode", ProviderName, model);
        activity?.SetTag("ai.think_mode", true);
        activity?.SetTag("ai.think_effort", thinkOptions.Effort);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var httpClient = CreateHttpClient();

            // Build request body for Think Mode (via HTTP since SDK may not support it)
            var requestBody = new
            {
                model = model,
                messages = messages.Select(m => new
                {
                    role = m.Role.ToLower(),
                    content = m.Content
                }).ToArray(),
                reasoning = new
                {
                    enabled = thinkOptions.Enabled,
                    effort = thinkOptions.Effort
                },
                max_tokens = settings?.MaxTokens ?? _settings.MaxTokens,
                temperature = settings?.Temperature ?? _settings.Temperature
            };

            var jsonContent = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            });

            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync("chat/completions", httpContent, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            stopwatch.Stop();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Grok Think Mode request failed. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                activity?.RecordException(new Exception($"HTTP {response.StatusCode}"));
                ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

                return new GrokThinkModeResponse
                {
                    Success = false,
                    Error = $"Grok API Error: {response.StatusCode}",
                    Provider = ProviderName,
                    Model = model
                };
            }

            var result = ParseThinkModeResponse(responseContent);
            result.Model = model;
            result.Provider = ProviderName;

            activity?.SetTag("ai.tokens.total", result.Usage?.TotalTokens ?? 0);
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true, result.Usage?.TotalTokens ?? 0);

            return result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating completion with Think Mode from Grok");
            return new GrokThinkModeResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName,
                Model = model
            };
        }
    }

    /// <summary>
    /// Stream completion with Think Mode (extended reasoning).
    /// Yields events including reasoning steps as they happen.
    /// </summary>
    public async IAsyncEnumerable<GrokToolStreamEvent> StreamWithThinkModeAsync(
        IEnumerable<Models.ChatMessage> messages,
        GrokThinkModeOptions thinkOptions,
        AIRequest? settings = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            yield return new GrokToolStreamEvent
            {
                Type = GrokToolStreamEventType.Error,
                Error = "Grok provider is not enabled or configured"
            };
            yield break;
        }

        var model = settings?.Model ?? "grok-3";
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Grok.StreamWithThinkMode", ProviderName, model);
        activity?.SetTag("ai.streaming", true);
        activity?.SetTag("ai.think_mode", true);
        activity?.SetTag("ai.think_effort", thinkOptions.Effort);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        HttpResponseMessage? response = null;
        Exception? initError = null;

        try
        {
            using var httpClient = CreateHttpClient();

            var requestBody = new
            {
                model = model,
                messages = messages.Select(m => new
                {
                    role = m.Role.ToLower(),
                    content = m.Content
                }).ToArray(),
                reasoning = new
                {
                    enabled = thinkOptions.Enabled,
                    effort = thinkOptions.Effort
                },
                max_tokens = settings?.MaxTokens ?? _settings.MaxTokens,
                temperature = settings?.Temperature ?? _settings.Temperature,
                stream = true
            };

            var jsonContent = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            });

            var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
            {
                Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
            };

            response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (Exception ex)
        {
            initError = ex;
        }

        if (initError != null)
        {
            _logger.LogError(initError, "Error starting Think Mode stream from Grok");
            yield return new GrokToolStreamEvent
            {
                Type = GrokToolStreamEventType.Error,
                Error = initError.Message
            };
            yield break;
        }

        if (response == null || !response.IsSuccessStatusCode)
        {
            yield return new GrokToolStreamEvent
            {
                Type = GrokToolStreamEventType.Error,
                Error = $"Grok API Error: {response?.StatusCode}"
            };
            yield break;
        }

        // Process SSE stream
        var tokenCount = 0;
        var stepCount = 0;

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        string? line;
        while ((line = await reader.ReadLineAsync(cancellationToken)) != null)
        {
            if (string.IsNullOrEmpty(line)) continue;
            if (!line.StartsWith("data: ")) continue;

            var data = line.Substring(6);
            if (data == "[DONE]") break;

            JsonDocument? doc = null;
            Exception? parseError = null;

            try
            {
                doc = JsonDocument.Parse(data);
            }
            catch (Exception ex)
            {
                parseError = ex;
            }

            if (parseError != null || doc == null) continue;

            using (doc)
            {
                var root = doc.RootElement;

                // Check for reasoning content
                if (root.TryGetProperty("reasoning", out var reasoningElement) &&
                    reasoningElement.TryGetProperty("content", out var reasoningContent))
                {
                    var reasoningText = reasoningContent.GetString();
                    if (!string.IsNullOrEmpty(reasoningText))
                    {
                        stepCount++;
                        yield return new GrokToolStreamEvent
                        {
                            Type = GrokToolStreamEventType.Reasoning,
                            Text = reasoningText,
                            ThinkingStep = new GrokThinkingStep
                            {
                                StepNumber = stepCount,
                                Thought = reasoningText
                            }
                        };
                    }
                }

                // Check for regular content
                if (root.TryGetProperty("choices", out var choices) &&
                    choices.GetArrayLength() > 0)
                {
                    var firstChoice = choices[0];
                    if (firstChoice.TryGetProperty("delta", out var delta) &&
                        delta.TryGetProperty("content", out var content))
                    {
                        var text = content.GetString();
                        if (!string.IsNullOrEmpty(text))
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

                            yield return new GrokToolStreamEvent
                            {
                                Type = GrokToolStreamEventType.Text,
                                Text = text
                            };
                        }
                    }
                }
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetTag("ai.think_steps", stepCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true);

        yield return new GrokToolStreamEvent
        {
            Type = GrokToolStreamEventType.Done,
            Usage = new GrokTokenUsage
            {
                CompletionTokens = tokenCount,
                ReasoningTokens = stepCount
            }
        };
    }

    /// <summary>
    /// Parse Think Mode response from JSON
    /// </summary>
    private static GrokThinkModeResponse ParseThinkModeResponse(string json)
    {
        var response = new GrokThinkModeResponse { Success = true };

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Extract content
            if (root.TryGetProperty("choices", out var choices) &&
                choices.GetArrayLength() > 0)
            {
                var firstChoice = choices[0];
                if (firstChoice.TryGetProperty("message", out var message) &&
                    message.TryGetProperty("content", out var content))
                {
                    response.Content = content.GetString() ?? string.Empty;
                }
            }

            // Extract reasoning if present
            if (root.TryGetProperty("reasoning", out var reasoning))
            {
                if (reasoning.TryGetProperty("content", out var reasoningContent))
                {
                    response.ReasoningContent = reasoningContent.GetString();
                }

                if (reasoning.TryGetProperty("time_ms", out var timeMs))
                {
                    response.ReasoningTimeMs = timeMs.GetInt32();
                }
            }

            // Extract usage
            if (root.TryGetProperty("usage", out var usage))
            {
                response.Usage = new GrokTokenUsage
                {
                    PromptTokens = usage.TryGetProperty("prompt_tokens", out var pt) ? pt.GetInt32() : 0,
                    CompletionTokens = usage.TryGetProperty("completion_tokens", out var ct) ? ct.GetInt32() : 0,
                    ReasoningTokens = usage.TryGetProperty("reasoning_tokens", out var rt) ? rt.GetInt32() : 0
                };
            }
        }
        catch (Exception)
        {
            response.Content = json;
        }

        return response;
    }

    #endregion

    #region Tool Support

    /// <summary>
    /// Creates a ChatClient for a specific model (useful when model differs from default)
    /// Since Grok uses OpenAI-compatible API, we create an OpenAI client with Grok's endpoint.
    /// </summary>
    public ChatClient? CreateChatClient(string model)
    {
        if (!IsEnabled || string.IsNullOrWhiteSpace(_settings.ApiKey))
            return null;

        try
        {
            var apiKeyCredential = new ApiKeyCredential(_settings.ApiKey);
            var openAIClientOptions = new OpenAIClientOptions
            {
                Endpoint = new Uri(_settings.BaseUrl)
            };

            var openAIClient = new OpenAIClient(apiKeyCredential, openAIClientOptions);
            return openAIClient.GetChatClient(model);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Grok ChatClient for model {Model}", model);
            return null;
        }
    }

    /// <summary>
    /// Stream chat completion with tool/function calling support.
    /// Yields events for text content, tool calls, and completion.
    /// </summary>
    public async IAsyncEnumerable<GrokToolStreamEvent> StreamWithToolsAsync(
        IEnumerable<OpenAIChatMessage> messages,
        IEnumerable<ChatTool> tools,
        string model,
        AIRequest? settings = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var client = CreateChatClient(model);
        if (client == null)
        {
            yield return new GrokToolStreamEvent
            {
                Type = GrokToolStreamEventType.Error,
                Error = "Grok provider is not enabled or configured"
            };
            yield break;
        }

        // Use a wrapper that handles errors internally
        await foreach (var evt in StreamWithToolsInternalAsync(client, messages, tools, model, settings, cancellationToken))
        {
            yield return evt;
        }
    }

    /// <summary>
    /// Internal streaming implementation that handles errors through events instead of exceptions
    /// </summary>
    private async IAsyncEnumerable<GrokToolStreamEvent> StreamWithToolsInternalAsync(
        ChatClient client,
        IEnumerable<OpenAIChatMessage> messages,
        IEnumerable<ChatTool> tools,
        string model,
        AIRequest? settings,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Grok.StreamWithTools", ProviderName, model);
        activity?.SetTag("ai.streaming", true);
        activity?.SetTag("ai.tools.count", tools.Count());

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var messageList = messages.ToList();
        var chatOptions = new ChatCompletionOptions
        {
            MaxOutputTokenCount = settings?.MaxTokens ?? _settings.MaxTokens
        };

        // Add tools to options
        foreach (var tool in tools)
        {
            chatOptions.Tools.Add(tool);
        }

        // Only set temperature if supported (Grok models generally support temperature)
        var temperature = settings?.Temperature ?? _settings.Temperature;
        if (temperature > 0)
        {
            chatOptions.Temperature = temperature;
        }

        // Track accumulated tool calls during streaming
        var accumulatedToolCalls = new Dictionary<int, GrokToolCallInfo>();
        var tokenCount = 0;

        // Use wrapper to avoid yield in catch
        var streamResult = await CreateGrokStreamSafelyAsync(client, messageList, chatOptions, cancellationToken);

        if (streamResult.ErrorMessage != null)
        {
            activity?.RecordException(new Exception(streamResult.ErrorMessage));
            yield return new GrokToolStreamEvent
            {
                Type = GrokToolStreamEventType.Error,
                Error = streamResult.ErrorMessage
            };
            yield break;
        }

        if (streamResult.Stream == null)
        {
            yield return new GrokToolStreamEvent
            {
                Type = GrokToolStreamEventType.Error,
                Error = "Failed to create stream"
            };
            yield break;
        }

        // Process the stream
        await foreach (var evt in ProcessGrokStreamSafelyAsync(
            streamResult.Stream,
            accumulatedToolCalls,
            stopwatch,
            model,
            activity,
            () =>
            {
                if (!firstTokenReceived)
                {
                    firstTokenReceived = true;
                    ApplicationTelemetry.AIStreamingFirstTokenDuration.Record(
                        stopwatch.ElapsedMilliseconds,
                        new("provider", ProviderName),
                        new("model", model));
                }
            },
            () => tokenCount++,
            cancellationToken))
        {
            yield return evt;
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true);

        // Yield done event
        yield return new GrokToolStreamEvent
        {
            Type = GrokToolStreamEventType.Done,
            Usage = new GrokTokenUsage
            {
                CompletionTokens = tokenCount
            }
        };
    }

    private record GrokStreamCreationResult(IAsyncEnumerable<StreamingChatCompletionUpdate>? Stream, string? ErrorMessage);

    private Task<GrokStreamCreationResult> CreateGrokStreamSafelyAsync(
        ChatClient client,
        List<OpenAIChatMessage> messages,
        ChatCompletionOptions options,
        CancellationToken cancellationToken)
    {
        try
        {
            var stream = client.CompleteChatStreamingAsync(messages, options, cancellationToken);
            return Task.FromResult(new GrokStreamCreationResult(stream, null));
        }
        catch (ClientResultException ex) when (ex.Message.Contains("temperature"))
        {
            _logger.LogWarning("Model does not support temperature");
            return Task.FromResult(new GrokStreamCreationResult(null, $"Model does not support temperature parameter: {ex.Message}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting streaming with tools from Grok");
            return Task.FromResult(new GrokStreamCreationResult(null, ex.Message));
        }
    }

    private async IAsyncEnumerable<GrokToolStreamEvent> ProcessGrokStreamSafelyAsync(
        IAsyncEnumerable<StreamingChatCompletionUpdate> stream,
        Dictionary<int, GrokToolCallInfo> accumulatedToolCalls,
        Stopwatch stopwatch,
        string model,
        Activity? activity,
        Action onFirstToken,
        Action onToken,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        IAsyncEnumerator<StreamingChatCompletionUpdate>? enumerator = null;

        // Try to get enumerator
        Exception? initError = null;
        try
        {
            enumerator = stream.GetAsyncEnumerator(cancellationToken);
        }
        catch (Exception ex)
        {
            initError = ex;
        }

        if (initError != null)
        {
            _logger.LogError(initError, "Error getting Grok stream enumerator");
            yield return new GrokToolStreamEvent
            {
                Type = GrokToolStreamEventType.Error,
                Error = initError.Message
            };
            yield break;
        }

        if (enumerator == null)
        {
            yield return new GrokToolStreamEvent
            {
                Type = GrokToolStreamEventType.Error,
                Error = "Failed to get stream enumerator"
            };
            yield break;
        }

        // Process updates
        bool continueProcessing = true;
        while (continueProcessing)
        {
            StreamingChatCompletionUpdate? update = null;
            bool hasNext = false;
            Exception? iterError = null;

            try
            {
                hasNext = await enumerator.MoveNextAsync();
                if (hasNext)
                {
                    update = enumerator.Current;
                }
            }
            catch (Exception ex)
            {
                iterError = ex;
            }

            if (iterError != null)
            {
                _logger.LogError(iterError, "Error during Grok streaming");
                stopwatch.Stop();
                activity?.RecordException(iterError);
                ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

                yield return new GrokToolStreamEvent
                {
                    Type = GrokToolStreamEventType.Error,
                    Error = iterError.Message
                };

                await enumerator.DisposeAsync();
                yield break;
            }

            if (!hasNext)
            {
                continueProcessing = false;
                continue;
            }

            if (update == null) continue;

            // Handle text content
            foreach (var contentPart in update.ContentUpdate)
            {
                onFirstToken();
                onToken();

                yield return new GrokToolStreamEvent
                {
                    Type = GrokToolStreamEventType.Text,
                    Text = contentPart.Text
                };
            }

            // Handle tool call updates (accumulate during streaming)
            foreach (var toolCallUpdate in update.ToolCallUpdates)
            {
                var index = toolCallUpdate.Index;

                if (!accumulatedToolCalls.TryGetValue(index, out var toolCallInfo))
                {
                    toolCallInfo = new GrokToolCallInfo
                    {
                        Id = toolCallUpdate.ToolCallId ?? "",
                        Name = toolCallUpdate.FunctionName ?? "",
                        Arguments = ""
                    };
                    accumulatedToolCalls[index] = toolCallInfo;
                }

                // Update ID if available
                if (!string.IsNullOrEmpty(toolCallUpdate.ToolCallId))
                {
                    toolCallInfo.Id = toolCallUpdate.ToolCallId;
                }

                // Update function name if available
                if (!string.IsNullOrEmpty(toolCallUpdate.FunctionName))
                {
                    toolCallInfo.Name = toolCallUpdate.FunctionName;
                }

                // Accumulate function arguments
                if (toolCallUpdate.FunctionArgumentsUpdate != null)
                {
                    toolCallInfo.Arguments += toolCallUpdate.FunctionArgumentsUpdate.ToString();
                }
            }

            // Check finish reason
            if (update.FinishReason == ChatFinishReason.ToolCalls && accumulatedToolCalls.Count > 0)
            {
                // Yield all accumulated tool calls
                yield return new GrokToolStreamEvent
                {
                    Type = GrokToolStreamEventType.ToolCalls,
                    ToolCalls = accumulatedToolCalls.Values.ToList()
                };
            }
        }

        await enumerator.DisposeAsync();
    }

    /// <summary>
    /// Convert internal ChatMessage to Grok format for tool calling (public accessor)
    /// </summary>
    public static OpenAIChatMessage ConvertToGrokMessagePublic(Models.ChatMessage message)
    {
        return ConvertToGrokMessage(message);
    }

    /// <summary>
    /// Create a tool result message for the next turn
    /// </summary>
    public static ToolChatMessage CreateToolResultMessage(string toolCallId, string result)
    {
        return new ToolChatMessage(toolCallId, result);
    }

    /// <summary>
    /// Create an assistant message with tool calls for context.
    /// Optionally includes text content that was generated before the tool calls.
    /// </summary>
    /// <param name="toolCalls">The tool calls to include</param>
    /// <param name="textContent">Optional text content generated before tool calls (preserves context)</param>
    public static AssistantChatMessage CreateAssistantToolCallMessage(
        IEnumerable<GrokToolCallInfo> toolCalls,
        string? textContent = null)
    {
        var chatToolCalls = toolCalls.Select(tc =>
            ChatToolCall.CreateFunctionToolCall(tc.Id, tc.Name, BinaryData.FromString(tc.Arguments))
        ).ToList();

        // Include text content if provided - this ensures the model remembers what it said before tool execution
        if (!string.IsNullOrEmpty(textContent))
        {
            return new AssistantChatMessage(chatToolCalls) { Content = { ChatMessageContentPart.CreateTextPart(textContent) } };
        }

        return new AssistantChatMessage(chatToolCalls);
    }

    #endregion

    private static async IAsyncEnumerable<string> EmptyAsyncEnumerable()
    {
        await Task.CompletedTask;
        yield break;
    }
}
