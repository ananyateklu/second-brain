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
using System.Text.Json;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;
using OpenAIToolStreamEvent = SecondBrain.Application.Services.AI.Models.OpenAIToolStreamEvent;
using OpenAIToolStreamEventType = SecondBrain.Application.Services.AI.Models.OpenAIToolStreamEventType;
using OpenAIToolCallInfo = SecondBrain.Application.Services.AI.Models.OpenAIToolCallInfo;
using OpenAITokenUsage = SecondBrain.Application.Services.AI.Models.OpenAITokenUsage;

namespace SecondBrain.Application.Services.AI.Providers;

public class OpenAIProvider : IAIProvider
{
    public const string HttpClientName = "OpenAI";

    private readonly OpenAISettings _settings;
    private readonly ILogger<OpenAIProvider> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ChatClient? _client;

    public string ProviderName => "OpenAI";
    public bool IsEnabled => _settings.Enabled;

    public OpenAIProvider(
        IOptions<AIProvidersSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<OpenAIProvider> logger)
    {
        _settings = settings.Value.OpenAI;
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        if (_settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            try
            {
                _client = new ChatClient(
                    _settings.DefaultModel,
                    _settings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize OpenAI client");
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
                Error = "OpenAI provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var model = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("OpenAI.GenerateCompletion", ProviderName, model);
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
                MaxOutputTokenCount = request.MaxTokens ?? _settings.MaxTokens
            };

            // Only set temperature if it's supported by the model
            // Some models (like o1-preview, o1-mini) don't support custom temperature
            var temperature = request.Temperature ?? _settings.Temperature;
            if (temperature > 0)
            {
                chatOptions.Temperature = temperature;
            }

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
        catch (ClientResultException ex) when (ex.Message.Contains("temperature"))
        {
            // Retry without temperature for models that don't support it
            _logger.LogWarning("Model does not support temperature parameter, retrying without it");
            try
            {
                var messages = new List<OpenAIChatMessage>
                {
                    new UserChatMessage(request.Prompt)
                };

                var chatOptions = new ChatCompletionOptions
                {
                    MaxOutputTokenCount = request.MaxTokens ?? _settings.MaxTokens
                };

                var response = await _client.CompleteChatAsync(
                    messages,
                    chatOptions,
                    cancellationToken);

                stopwatch.Stop();
                var tokensUsed = response.Value.Usage.TotalTokenCount;

                activity?.SetTag("ai.tokens.total", tokensUsed);
                activity?.SetTag("ai.retry", true);
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
            catch (Exception retryEx)
            {
                stopwatch.Stop();
                activity?.RecordException(retryEx);
                ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

                _logger.LogError(retryEx, "Error generating completion from OpenAI after retry");
                return new AIResponse
                {
                    Success = false,
                    Error = retryEx.Message,
                    Provider = ProviderName
                };
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating completion from OpenAI");
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
                Error = "OpenAI provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var model = settings?.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("OpenAI.GenerateChatCompletion", ProviderName, model);
        var messageList = messages.ToList();
        activity?.SetTag("ai.messages.count", messageList.Count);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var chatMessages = messageList.Select(m => ConvertToOpenAIMessage(m)).ToList();

            var chatOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = settings?.MaxTokens ?? _settings.MaxTokens
            };

            // Only set temperature if it's supported by the model
            // Some models (like o1-preview, o1-mini) don't support custom temperature
            var temperature = settings?.Temperature ?? _settings.Temperature;
            if (temperature > 0)
            {
                chatOptions.Temperature = temperature;
            }

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
        catch (ClientResultException ex) when (ex.Message.Contains("temperature"))
        {
            // Retry without temperature for models that don't support it
            _logger.LogWarning("Model does not support temperature parameter, retrying without it");
            try
            {
                var chatMessages = messageList.Select(m => m.Role.ToLower() switch
                {
                    "system" => (OpenAIChatMessage)new SystemChatMessage(m.Content),
                    "assistant" => new AssistantChatMessage(m.Content),
                    _ => new UserChatMessage(m.Content)
                }).ToList();

                var chatOptions = new ChatCompletionOptions
                {
                    MaxOutputTokenCount = settings?.MaxTokens ?? _settings.MaxTokens
                };

                var response = await _client.CompleteChatAsync(
                    chatMessages,
                    chatOptions,
                    cancellationToken);

                stopwatch.Stop();
                var tokensUsed = response.Value.Usage.TotalTokenCount;

                activity?.SetTag("ai.tokens.total", tokensUsed);
                activity?.SetTag("ai.retry", true);
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
            catch (Exception retryEx)
            {
                stopwatch.Stop();
                activity?.RecordException(retryEx);
                ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

                _logger.LogError(retryEx, "Error generating chat completion from OpenAI after retry");
                return new AIResponse
                {
                    Success = false,
                    Error = retryEx.Message,
                    Provider = ProviderName
                };
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating chat completion from OpenAI");
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
        using var activity = ApplicationTelemetry.StartAIProviderActivity("OpenAI.StreamCompletion", ProviderName, model);
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
            MaxOutputTokenCount = request.MaxTokens ?? _settings.MaxTokens
        };

        // Only set temperature if it's supported by the model
        var temperature = request.Temperature ?? _settings.Temperature;
        if (temperature > 0)
        {
            chatOptions.Temperature = temperature;
        }

        var stream = _client.CompleteChatStreamingAsync(
            messages,
            chatOptions,
            cancellationToken);

        var tokenCount = 0;
        await foreach (var update in stream)
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
        using var activity = ApplicationTelemetry.StartAIProviderActivity("OpenAI.StreamChatCompletion", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var chatMessages = messageList.Select(m => ConvertToOpenAIMessage(m)).ToList();

        var chatOptions = new ChatCompletionOptions
        {
            MaxOutputTokenCount = settings?.MaxTokens ?? _settings.MaxTokens
        };

        // Don't set temperature for streaming - some models don't support it
        // If needed, models will use their default temperature

        var stream = _client.CompleteChatStreamingAsync(
            chatMessages,
            chatOptions,
            cancellationToken);

        var tokenCount = 0;
        await foreach (var update in stream)
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
    /// OpenAI supports include_usage in streaming since the newer API versions.
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
        using var activity = ApplicationTelemetry.StartAIProviderActivity("OpenAI.StreamChatCompletionWithUsage", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.streaming", true);
        activity?.SetTag("ai.usage_tracking", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var chatMessages = messageList.Select(m => ConvertToOpenAIMessage(m)).ToList();

        var chatOptions = new ChatCompletionOptions
        {
            MaxOutputTokenCount = settings?.MaxTokens ?? _settings.MaxTokens,
            IncludeLogProbabilities = false
        };

        // Enable streaming usage via reflection (StreamOptions is internal in OpenAI SDK 2.7.0)
        // This sets stream_options: { include_usage: true } so we get actual token counts
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

        var stream = _client.CompleteChatStreamingAsync(
            chatMessages,
            chatOptions,
            cancellationToken);

        var outputTokenCount = 0;
        int? promptTokens = null;
        int? completionTokens = null;

        await foreach (var update in stream)
        {
            // Capture usage information if available (OpenAI sends it in final chunk)
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
                outputTokenCount++;
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
            usage = StreamingTokenUsage.CreateEstimated(estimatedInput, outputTokenCount, ProviderName, model);
        }

        // Invoke callback with usage info
        onUsageAvailable?.Invoke(usage);

        activity?.SetTag("ai.tokens.output", outputTokenCount);
        activity?.SetTag("ai.usage.is_actual", usage.IsActual);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true, usage.TotalTokens);
    }

    /// <summary>
    /// Convert a ChatMessage to OpenAI format, handling multimodal content
    /// </summary>
    private static OpenAIChatMessage ConvertToOpenAIMessage(Models.ChatMessage message)
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

        // Build multimodal content parts
        var contentParts = new List<ChatMessageContentPart>();

        // Add text content first (if any)
        if (!string.IsNullOrEmpty(message.Content))
        {
            contentParts.Add(ChatMessageContentPart.CreateTextPart(message.Content));
        }

        // Add image content
        foreach (var image in message.Images)
        {
            // OpenAI expects images as data URLs: data:{mediaType};base64,{base64Data}
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
            _logger.LogWarning(ex, "OpenAI availability check failed");
            return false;
        }
    }

    private async Task<IEnumerable<string>> FetchAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var httpClient = CreateHttpClient();
            var response = await httpClient.GetAsync("https://api.openai.com/v1/models", cancellationToken);
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
            _logger.LogWarning(ex, "Failed to fetch available models from OpenAI API");
        }

        // Fallback to known models if API call fails
        return new[]
        {
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-4",
            "gpt-3.5-turbo",
            "gpt-4-turbo-preview"
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
                health.ErrorMessage = "Failed to connect to OpenAI API";
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Error";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = ex.Message;
            _logger.LogError(ex, "OpenAI health check failed");
        }

        return health;
    }

    #region Tool Support

    /// <summary>
    /// Creates a ChatClient for a specific model (useful when model differs from default)
    /// </summary>
    public ChatClient? CreateChatClient(string model)
    {
        if (!IsEnabled || string.IsNullOrWhiteSpace(_settings.ApiKey))
            return null;

        try
        {
            return new ChatClient(model, _settings.ApiKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create ChatClient for model {Model}", model);
            return null;
        }
    }

    /// <summary>
    /// Stream chat completion with tool/function calling support.
    /// Yields events for text content, tool calls, and completion.
    /// </summary>
    public async IAsyncEnumerable<OpenAIToolStreamEvent> StreamWithToolsAsync(
        IEnumerable<OpenAIChatMessage> messages,
        IEnumerable<ChatTool> tools,
        string model,
        AIRequest? settings = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var client = CreateChatClient(model);
        if (client == null)
        {
            yield return new OpenAIToolStreamEvent
            {
                Type = OpenAIToolStreamEventType.Error,
                Error = "OpenAI provider is not enabled or configured"
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
    private async IAsyncEnumerable<OpenAIToolStreamEvent> StreamWithToolsInternalAsync(
        ChatClient client,
        IEnumerable<OpenAIChatMessage> messages,
        IEnumerable<ChatTool> tools,
        string model,
        AIRequest? settings,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        using var activity = ApplicationTelemetry.StartAIProviderActivity("OpenAI.StreamWithTools", ProviderName, model);
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

        // Only set temperature if supported
        var temperature = settings?.Temperature ?? _settings.Temperature;
        if (temperature > 0 && !IsReasoningModel(model))
        {
            chatOptions.Temperature = temperature;
        }

        // Track accumulated tool calls during streaming
        var accumulatedToolCalls = new Dictionary<int, OpenAIToolCallInfo>();
        var tokenCount = 0;

        // Use wrapper to avoid yield in catch
        var streamResult = await CreateStreamSafelyAsync(client, messageList, chatOptions, cancellationToken);

        if (streamResult.ErrorMessage != null)
        {
            activity?.RecordException(new Exception(streamResult.ErrorMessage));
            yield return new OpenAIToolStreamEvent
            {
                Type = OpenAIToolStreamEventType.Error,
                Error = streamResult.ErrorMessage
            };
            yield break;
        }

        if (streamResult.Stream == null)
        {
            yield return new OpenAIToolStreamEvent
            {
                Type = OpenAIToolStreamEventType.Error,
                Error = "Failed to create stream"
            };
            yield break;
        }

        // Process the stream
        await foreach (var evt in ProcessStreamSafelyAsync(
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
        yield return new OpenAIToolStreamEvent
        {
            Type = OpenAIToolStreamEventType.Done,
            Usage = new OpenAITokenUsage
            {
                CompletionTokens = tokenCount
            }
        };
    }

    private record StreamCreationResult(IAsyncEnumerable<StreamingChatCompletionUpdate>? Stream, string? ErrorMessage);

    private Task<StreamCreationResult> CreateStreamSafelyAsync(
        ChatClient client,
        List<OpenAIChatMessage> messages,
        ChatCompletionOptions options,
        CancellationToken cancellationToken)
    {
        try
        {
            var stream = client.CompleteChatStreamingAsync(messages, options, cancellationToken);
            return Task.FromResult(new StreamCreationResult(stream, null));
        }
        catch (ClientResultException ex) when (ex.Message.Contains("temperature"))
        {
            _logger.LogWarning("Model does not support temperature");
            return Task.FromResult(new StreamCreationResult(null, $"Model does not support temperature parameter: {ex.Message}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting streaming with tools from OpenAI");
            return Task.FromResult(new StreamCreationResult(null, ex.Message));
        }
    }

    private async IAsyncEnumerable<OpenAIToolStreamEvent> ProcessStreamSafelyAsync(
        IAsyncEnumerable<StreamingChatCompletionUpdate> stream,
        Dictionary<int, OpenAIToolCallInfo> accumulatedToolCalls,
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
            _logger.LogError(initError, "Error getting stream enumerator");
            yield return new OpenAIToolStreamEvent
            {
                Type = OpenAIToolStreamEventType.Error,
                Error = initError.Message
            };
            yield break;
        }

        if (enumerator == null)
        {
            yield return new OpenAIToolStreamEvent
            {
                Type = OpenAIToolStreamEventType.Error,
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
                _logger.LogError(iterError, "Error during streaming");
                stopwatch.Stop();
                activity?.RecordException(iterError);
                ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

                yield return new OpenAIToolStreamEvent
                {
                    Type = OpenAIToolStreamEventType.Error,
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

                yield return new OpenAIToolStreamEvent
                {
                    Type = OpenAIToolStreamEventType.Text,
                    Text = contentPart.Text
                };
            }

            // Handle tool call updates (accumulate during streaming)
            foreach (var toolCallUpdate in update.ToolCallUpdates)
            {
                var index = toolCallUpdate.Index;

                if (!accumulatedToolCalls.TryGetValue(index, out var toolCallInfo))
                {
                    toolCallInfo = new OpenAIToolCallInfo
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
                yield return new OpenAIToolStreamEvent
                {
                    Type = OpenAIToolStreamEventType.ToolCalls,
                    ToolCalls = accumulatedToolCalls.Values.ToList()
                };
            }
        }

        await enumerator.DisposeAsync();
    }

    /// <summary>
    /// Checks if the model is a reasoning model (o1, o3) that has special requirements
    /// </summary>
    private static bool IsReasoningModel(string model)
    {
        return model.StartsWith("o1", StringComparison.OrdinalIgnoreCase) ||
               model.StartsWith("o3", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Convert internal ChatMessage to OpenAI format for tool calling
    /// </summary>
    public static OpenAIChatMessage ConvertToOpenAIMessagePublic(Models.ChatMessage message)
    {
        return ConvertToOpenAIMessage(message);
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
        IEnumerable<OpenAIToolCallInfo> toolCalls,
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
