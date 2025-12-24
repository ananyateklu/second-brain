using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OllamaSharp;
using OllamaSharp.Models;
using OllamaSharp.Models.Chat;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Telemetry;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net.Sockets;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.Providers;

public class OllamaProvider : IAIProvider
{
    private readonly OllamaSettings _settings;
    private readonly ILogger<OllamaProvider> _logger;
    private readonly OllamaApiClient? _defaultClient;
    private readonly ConcurrentDictionary<string, OllamaApiClient> _clientCache = new();

    public string ProviderName => "Ollama";
    public bool IsEnabled => _settings.Enabled;

    public OllamaProvider(
        IOptions<AIProvidersSettings> settings,
        ILogger<OllamaProvider> logger)
    {
        _settings = settings.Value.Ollama;
        _logger = logger;

        if (_settings.Enabled)
        {
            try
            {
                _defaultClient = new OllamaApiClient(new Uri(_settings.BaseUrl))
                {
                    SelectedModel = _settings.DefaultModel
                };
                // Cache the default client
                _clientCache[_settings.BaseUrl] = _defaultClient;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Ollama client");
            }
        }
    }

    /// <summary>
    /// Gets or creates an Ollama client for the specified base URL.
    /// Returns the default client if no override URL is specified.
    /// </summary>
    private OllamaApiClient? GetClientForUrl(string? overrideUrl)
    {
        // If no override, use default client
        if (string.IsNullOrWhiteSpace(overrideUrl))
        {
            return _defaultClient;
        }

        // Normalize URL
        var normalizedUrl = overrideUrl.TrimEnd('/');

        // Try to get from cache, or create new client
        return _clientCache.GetOrAdd(normalizedUrl, url =>
        {
            _logger.LogInformation("Creating new Ollama client for remote URL: {Url}", url);
            return new OllamaApiClient(new Uri(url))
            {
                SelectedModel = _settings.DefaultModel
            };
        });
    }

    /// <summary>
    /// Gets the effective base URL for error messages
    /// </summary>
    private string GetEffectiveBaseUrl(string? overrideUrl)
    {
        return string.IsNullOrWhiteSpace(overrideUrl) ? _settings.BaseUrl : overrideUrl.TrimEnd('/');
    }

    public async Task<AIResponse> GenerateCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(request.OllamaBaseUrl);
        var effectiveUrl = GetEffectiveBaseUrl(request.OllamaBaseUrl);

        if (!IsEnabled || client == null)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Ollama provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var model = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Ollama.GenerateCompletion", ProviderName, model);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);
        activity?.SetTag("ollama.url", effectiveUrl);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var generateRequest = new GenerateRequest
            {
                Model = model,
                Prompt = request.Prompt,
                Stream = false,
                Options = new RequestOptions
                {
                    Temperature = request.Temperature ?? _settings.Temperature,
                    NumPredict = request.MaxTokens
                }
            };

            // Consume the async enumerable to get the final response
            GenerateResponseStream? response = null;
            await foreach (var stream in client.GenerateAsync(generateRequest, cancellationToken))
            {
                response = stream;
            }

            if (response == null)
            {
                throw new InvalidOperationException("No response from Ollama");
            }

            stopwatch.Stop();
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true);

            return new AIResponse
            {
                Success = true,
                Content = response.Response ?? string.Empty,
                Model = model,
                TokensUsed = 0, // Token counting not available in current OllamaSharp version
                Provider = ProviderName
            };
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogWarning(ex, "Ollama completion failed - service unreachable (connection refused)");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (HttpRequestException ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogWarning(ex, "Ollama completion failed - service unreachable");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (SocketException ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogWarning(ex, "Ollama completion failed - socket connection refused");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating completion from Ollama");
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
        var client = GetClientForUrl(settings?.OllamaBaseUrl);
        var effectiveUrl = GetEffectiveBaseUrl(settings?.OllamaBaseUrl);

        if (!IsEnabled || client == null)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Ollama provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var model = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Ollama.GenerateChatCompletion", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ollama.url", effectiveUrl);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var chatMessages = messageList.Select(m => ConvertToOllamaMessage(m)).ToList();

            var chatRequest = new ChatRequest
            {
                Model = model,
                Messages = chatMessages,
                Stream = false,
                Options = new RequestOptions
                {
                    Temperature = settings?.Temperature ?? _settings.Temperature,
                    NumPredict = settings?.MaxTokens
                }
            };

            // Consume the async enumerable to get the final response
            ChatResponseStream? response = null;
            await foreach (var stream in client.ChatAsync(chatRequest, cancellationToken))
            {
                response = stream;
            }

            if (response == null)
            {
                throw new InvalidOperationException("No response from Ollama");
            }

            stopwatch.Stop();
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true);

            return new AIResponse
            {
                Success = true,
                Content = response.Message?.Content ?? string.Empty,
                Model = model,
                TokensUsed = 0, // Token counting not available in current OllamaSharp version
                Provider = ProviderName
            };
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogWarning(ex, "Ollama chat completion failed - service unreachable (connection refused)");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (HttpRequestException ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogWarning(ex, "Ollama chat completion failed - service unreachable");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (SocketException ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogWarning(ex, "Ollama chat completion failed - socket connection refused");
            return new AIResponse
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating chat completion from Ollama");
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
        var client = GetClientForUrl(request.OllamaBaseUrl);

        if (!IsEnabled || client == null || !_settings.StreamingEnabled)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(WrapStreamWithErrorHandling(
            StreamCompletionInternalAsync(request, client, cancellationToken),
            "Ollama streaming"));
    }

    private async IAsyncEnumerable<string> StreamCompletionInternalAsync(
        AIRequest request,
        OllamaApiClient client,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var model = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Ollama.StreamCompletion", ProviderName, model);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var generateRequest = new GenerateRequest
        {
            Model = model,
            Prompt = request.Prompt,
            Stream = true,
            Options = new RequestOptions
            {
                Temperature = request.Temperature ?? _settings.Temperature,
                NumPredict = request.MaxTokens
            }
        };

        IAsyncEnumerable<GenerateResponseStream?>? stream = null;
        try
        {
            stream = client.GenerateAsync(generateRequest, cancellationToken);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama streaming failed - service unreachable (connection refused)");
            yield break;
        }
        catch (HttpRequestException ex)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama streaming failed - service unreachable");
            yield break;
        }
        catch (SocketException ex)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama streaming failed - socket connection refused");
            yield break;
        }
        catch (Exception ex)
        {
            activity?.RecordException(ex);
            _logger.LogError(ex, "Ollama streaming failed with unexpected error");
            yield break;
        }

        if (stream == null)
            yield break;

        var tokenCount = 0;
        await foreach (var chunk in stream)
        {
            if (!string.IsNullOrEmpty(chunk?.Response))
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
                yield return chunk.Response;
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
        var client = GetClientForUrl(settings?.OllamaBaseUrl);

        if (!IsEnabled || client == null || !_settings.StreamingEnabled)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(WrapStreamWithErrorHandling(
            StreamChatCompletionInternalAsync(messages, settings, client, cancellationToken),
            "Ollama chat streaming"));
    }

    private async IAsyncEnumerable<string> StreamChatCompletionInternalAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings,
        OllamaApiClient client,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var model = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Ollama.StreamChatCompletion", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var chatMessages = messageList.Select(m => ConvertToOllamaMessage(m)).ToList();

        var chatRequest = new ChatRequest
        {
            Model = model,
            Messages = chatMessages,
            Stream = true,
            Options = new RequestOptions
            {
                Temperature = settings?.Temperature ?? _settings.Temperature,
                NumPredict = settings?.MaxTokens
            }
        };

        IAsyncEnumerable<ChatResponseStream?>? stream = null;
        try
        {
            stream = client.ChatAsync(chatRequest, cancellationToken);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama chat streaming failed - service unreachable (connection refused)");
            yield break;
        }
        catch (HttpRequestException ex)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama chat streaming failed - service unreachable");
            yield break;
        }
        catch (SocketException ex)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama chat streaming failed - socket connection refused");
            yield break;
        }
        catch (Exception ex)
        {
            activity?.RecordException(ex);
            _logger.LogError(ex, "Ollama chat streaming failed with unexpected error");
            yield break;
        }

        if (stream == null)
            yield break;

        var tokenCount = 0;
        await foreach (var chunk in stream)
        {
            if (!string.IsNullOrEmpty(chunk?.Message?.Content))
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
                yield return chunk.Message.Content;
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true);
    }

    /// <summary>
    /// Stream chat completion with token usage callback.
    /// Ollama provides eval_count and prompt_eval_count in responses.
    /// </summary>
    public Task<IAsyncEnumerable<string>> StreamChatCompletionWithUsageAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings,
        Action<StreamingTokenUsage>? onUsageAvailable,
        CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(settings?.OllamaBaseUrl);

        if (!IsEnabled || client == null || !_settings.StreamingEnabled)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(WrapStreamWithErrorHandling(
            StreamChatCompletionWithUsageInternalAsync(messages, settings, client, onUsageAvailable, cancellationToken),
            "Ollama chat streaming with usage"));
    }

    private async IAsyncEnumerable<string> StreamChatCompletionWithUsageInternalAsync(
        IEnumerable<Models.ChatMessage> messages,
        AIRequest? settings,
        OllamaApiClient client,
        Action<StreamingTokenUsage>? onUsageAvailable,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var model = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Ollama.StreamChatCompletionWithUsage", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.streaming", true);
        activity?.SetTag("ai.usage_tracking", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var chatMessages = messageList.Select(m => ConvertToOllamaMessage(m)).ToList();

        var chatRequest = new ChatRequest
        {
            Model = model,
            Messages = chatMessages,
            Stream = true,
            Options = new RequestOptions
            {
                Temperature = settings?.Temperature ?? _settings.Temperature,
                NumPredict = settings?.MaxTokens
            }
        };

        IAsyncEnumerable<ChatResponseStream?>? stream = null;
        try
        {
            stream = client.ChatAsync(chatRequest, cancellationToken);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama chat streaming failed - service unreachable (connection refused)");
            yield break;
        }
        catch (HttpRequestException ex)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama chat streaming failed - service unreachable");
            yield break;
        }
        catch (SocketException ex)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama chat streaming failed - socket connection refused");
            yield break;
        }
        catch (Exception ex)
        {
            activity?.RecordException(ex);
            _logger.LogError(ex, "Ollama chat streaming failed with unexpected error");
            yield break;
        }

        if (stream == null)
            yield break;

        var tokenCount = 0;

        // Token usage tracking from OllamaSharp's ChatDoneResponseStream
        int? promptEvalCount = null;
        int? evalCount = null;
        long? totalDuration = null;
        long? loadDuration = null;
        long? promptEvalDuration = null;
        long? evalDuration = null;

        await foreach (var chunk in stream)
        {
            // Check if this is the final chunk with token metrics (ChatDoneResponseStream)
            if (chunk is ChatDoneResponseStream doneStream)
            {
                promptEvalCount = doneStream.PromptEvalCount;
                evalCount = doneStream.EvalCount;
                totalDuration = doneStream.TotalDuration;
                loadDuration = doneStream.LoadDuration;
                promptEvalDuration = doneStream.PromptEvalDuration;
                evalDuration = doneStream.EvalDuration;

                activity?.SetTag("ai.tokens.input", promptEvalCount);
                activity?.SetTag("ai.tokens.output", evalCount);
                activity?.SetTag("ai.duration.total_ns", totalDuration);
                activity?.SetTag("ai.duration.load_ns", loadDuration);
                activity?.SetTag("ai.duration.prompt_eval_ns", promptEvalDuration);
                activity?.SetTag("ai.duration.eval_ns", evalDuration);
            }

            if (!string.IsNullOrEmpty(chunk?.Message?.Content))
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
                yield return chunk.Message.Content;
            }
        }

        stopwatch.Stop();

        // Create usage info - OllamaSharp provides actual token counts via ChatDoneResponseStream
        StreamingTokenUsage usage;
        if (promptEvalCount.HasValue && evalCount.HasValue)
        {
            usage = StreamingTokenUsage.CreateActual(promptEvalCount.Value, evalCount.Value, ProviderName, model);
        }
        else
        {
            // Fallback to estimation if Ollama didn't return counts
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
    /// Convert a ChatMessage to Ollama format, handling multimodal content
    /// </summary>
    private static Message ConvertToOllamaMessage(Models.ChatMessage message)
    {
        var ollamaMessage = new Message
        {
            Role = message.Role.ToLower(),
            Content = message.Content
        };

        // Add images if present (Ollama uses 'images' array with base64 data)
        if (message.Images != null && message.Images.Count > 0)
        {
            ollamaMessage.Images = message.Images
                .Select(img => img.Base64Data)
                .ToArray();
        }

        return ollamaMessage;
    }

    /// <summary>
    /// Stream chat completion with native tool/function calling support.
    /// This method handles the Ollama tool calling protocol for agentic workflows.
    /// </summary>
    /// <param name="messages">The conversation messages</param>
    /// <param name="tools">The tools available for the model to call</param>
    /// <param name="settings">Optional AI request settings</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Async enumerable of tool stream events</returns>
    public async IAsyncEnumerable<OllamaToolStreamEvent> StreamWithToolsAsync(
        IEnumerable<Models.ChatMessage> messages,
        IEnumerable<Tool> tools,
        AIRequest? settings = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(settings?.OllamaBaseUrl);
        var effectiveUrl = GetEffectiveBaseUrl(settings?.OllamaBaseUrl);

        if (!IsEnabled || client == null)
        {
            yield return new OllamaToolStreamEvent
            {
                Type = OllamaToolStreamEventType.Error,
                Error = "Ollama provider is not enabled or configured"
            };
            yield break;
        }

        if (!_settings.StreamingEnabled)
        {
            yield return new OllamaToolStreamEvent
            {
                Type = OllamaToolStreamEventType.Error,
                Error = "Streaming is not enabled for Ollama"
            };
            yield break;
        }

        var model = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        var toolsList = tools.ToList();

        using var activity = ApplicationTelemetry.StartAIProviderActivity("Ollama.StreamWithTools", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.tools.count", toolsList.Count);
        activity?.SetTag("ai.streaming", true);
        activity?.SetTag("ollama.url", effectiveUrl);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var chatMessages = messageList.Select(m => ConvertToOllamaMessage(m)).ToList();

        var chatRequest = new ChatRequest
        {
            Model = model,
            Messages = chatMessages,
            Tools = toolsList,
            Stream = true,
            Options = new RequestOptions
            {
                Temperature = settings?.Temperature ?? _settings.Temperature,
                NumPredict = settings?.MaxTokens
            }
        };

        IAsyncEnumerable<ChatResponseStream?>? stream = null;
        OllamaToolStreamEvent? initError = null;
        try
        {
            stream = client.ChatAsync(chatRequest, cancellationToken);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama tool streaming failed - service unreachable (connection refused)");
            initError = new OllamaToolStreamEvent
            {
                Type = OllamaToolStreamEventType.Error,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running."
            };
        }
        catch (HttpRequestException ex)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama tool streaming failed - service unreachable");
            initError = new OllamaToolStreamEvent
            {
                Type = OllamaToolStreamEventType.Error,
                Error = $"HTTP error connecting to Ollama: {ex.Message}"
            };
        }
        catch (SocketException ex)
        {
            activity?.RecordException(ex);
            _logger.LogWarning(ex, "Ollama tool streaming failed - socket connection refused");
            initError = new OllamaToolStreamEvent
            {
                Type = OllamaToolStreamEventType.Error,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running."
            };
        }
        catch (Exception ex)
        {
            activity?.RecordException(ex);
            _logger.LogError(ex, "Ollama tool streaming failed with unexpected error");
            initError = new OllamaToolStreamEvent
            {
                Type = OllamaToolStreamEventType.Error,
                Error = ex.Message
            };
        }

        if (initError != null)
        {
            yield return initError;
            yield break;
        }

        if (stream == null)
        {
            yield return new OllamaToolStreamEvent
            {
                Type = OllamaToolStreamEventType.Error,
                Error = "Failed to initialize stream"
            };
            yield break;
        }

        var tokenCount = 0;
        var pendingToolCalls = new List<OllamaToolCallInfo>();

        await foreach (var chunk in stream)
        {
            if (chunk == null) continue;

            // Handle text content
            if (!string.IsNullOrEmpty(chunk.Message?.Content))
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

                yield return new OllamaToolStreamEvent
                {
                    Type = OllamaToolStreamEventType.Text,
                    Text = chunk.Message.Content
                };
            }

            // Handle tool calls from the response
            if (chunk.Message?.ToolCalls != null && chunk.Message.ToolCalls.Any())
            {
                foreach (var toolCall in chunk.Message.ToolCalls)
                {
                    if (toolCall.Function != null)
                    {
                        var toolInfo = new OllamaToolCallInfo
                        {
                            Name = toolCall.Function.Name ?? "",
                            Arguments = toolCall.Function.Arguments != null
                                ? JsonSerializer.Serialize(toolCall.Function.Arguments)
                                : "{}"
                        };
                        pendingToolCalls.Add(toolInfo);

                        _logger.LogDebug("Ollama tool call detected: {ToolName}", toolInfo.Name);
                    }
                }
            }

            // Check if stream is done
            if (chunk.Done)
            {
                // Emit any pending tool calls
                if (pendingToolCalls.Count > 0)
                {
                    yield return new OllamaToolStreamEvent
                    {
                        Type = OllamaToolStreamEventType.ToolCalls,
                        ToolCalls = pendingToolCalls
                    };
                }

                // Emit done event with usage info
                // Note: Token counts are only available on the final ChatDoneResponseStream
                var doneResponse = chunk as OllamaSharp.Models.Chat.ChatDoneResponseStream;
                yield return new OllamaToolStreamEvent
                {
                    Type = OllamaToolStreamEventType.Done,
                    Usage = new OllamaTokenUsage
                    {
                        PromptTokens = doneResponse?.PromptEvalCount ?? 0,
                        CompletionTokens = doneResponse?.EvalCount ?? 0
                    }
                };

                break;
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetTag("ai.tools.called", pendingToolCalls.Count);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true);
    }

    /// <summary>
    /// Continue a conversation with tool results.
    /// Call this after executing tool calls to send results back to the model.
    /// </summary>
    /// <param name="messages">The conversation messages including previous assistant message with tool calls</param>
    /// <param name="toolResults">The results from executing the tools (functionName, result)</param>
    /// <param name="tools">The tools available for subsequent calls</param>
    /// <param name="settings">Optional AI request settings</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Async enumerable of tool stream events</returns>
    public async IAsyncEnumerable<OllamaToolStreamEvent> ContinueWithToolResultsAsync(
        IEnumerable<Models.ChatMessage> messages,
        IEnumerable<(string Name, string Result)> toolResults,
        IEnumerable<Tool> tools,
        AIRequest? settings = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var messageList = messages.ToList();

        // Add tool results as tool messages
        foreach (var (name, result) in toolResults)
        {
            messageList.Add(new Models.ChatMessage
            {
                Role = "tool",
                Content = result,
                // Note: Ollama expects tool results with the function name in the message
            });
        }

        // Continue streaming with the updated messages
        await foreach (var evt in StreamWithToolsAsync(messageList, tools, settings, cancellationToken))
        {
            yield return evt;
        }
    }

    /// <summary>
    /// Gets the OllamaApiClient for a given URL (for external access by AgentService).
    /// </summary>
    public OllamaApiClient? GetClient(string? overrideUrl = null)
    {
        return GetClientForUrl(overrideUrl);
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _defaultClient == null)
            return false;

        try
        {
            var models = await _defaultClient.ListLocalModelsAsync(cancellationToken);
            return models != null && models.Any();
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogDebug("Ollama availability check failed - service unreachable at {BaseUrl} (connection refused)", _settings.BaseUrl);
            return false;
        }
        catch (HttpRequestException)
        {
            _logger.LogDebug("Ollama availability check failed - service unreachable at {BaseUrl}", _settings.BaseUrl);
            return false;
        }
        catch (SocketException)
        {
            _logger.LogDebug("Ollama availability check failed - socket connection refused at {BaseUrl}", _settings.BaseUrl);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Ollama availability check failed with unexpected error");
            return false;
        }
    }

    public Task<AIProviderHealth> GetHealthStatusAsync(
        CancellationToken cancellationToken = default)
    {
        return GetHealthStatusAsync(null, cancellationToken);
    }

    public async Task<AIProviderHealth> GetHealthStatusAsync(
        Dictionary<string, string>? configOverrides,
        CancellationToken cancellationToken = default)
    {
        // Check for remote URL override
        string? remoteUrl = null;
        if (configOverrides != null)
        {
            configOverrides.TryGetValue("ollamaBaseUrl", out remoteUrl);
        }

        var client = GetClientForUrl(remoteUrl);
        var effectiveUrl = GetEffectiveBaseUrl(remoteUrl);

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

        if (client == null)
        {
            health.IsHealthy = false;
            health.Status = "Not Configured";
            health.ErrorMessage = "Ollama client not initialized";
            return health;
        }

        // Add timeout to prevent hanging (5 seconds)
        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken, timeoutCts.Token);

        try
        {
            var models = await client.ListLocalModelsAsync(linkedCts.Token);
            stopwatch.Stop();

            var isHealthy = models != null && models.Any();

            health.IsHealthy = isHealthy;
            health.Status = isHealthy ? "Healthy" : "No Models Available";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.Version = "0.1.0";

            // Create model info with context limits from fallback database
            var modelNames = models?.Select(m => m.Name) ?? Enumerable.Empty<string>();
            var modelInfoList = modelNames.Select(id => ModelContextDatabase.CreateModelInfo(id)).ToList();

            // Populate both for backward compatibility
            health.AvailableModels = modelNames;
            health.Models = modelInfoList;

            if (!isHealthy)
            {
                health.ErrorMessage = "No models installed. Run 'ollama pull <model-name>' to install a model.";
            }
        }
        catch (TaskCanceledException) when (timeoutCts.Token.IsCancellationRequested)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Unreachable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = $"Connection to Ollama at {effectiveUrl} timed out. Ensure Ollama is running and accessible.";
            _logger.LogDebug("Ollama health check timed out at {BaseUrl} - service may be unreachable", effectiveUrl);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Unreachable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.";
            _logger.LogDebug("Ollama health check failed - service unreachable at {BaseUrl} (connection refused)", effectiveUrl);
        }
        catch (HttpRequestException)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Unreachable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.";
            _logger.LogDebug("Ollama health check failed - service unreachable at {BaseUrl}", effectiveUrl);
        }
        catch (SocketException)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Unreachable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.";
            _logger.LogDebug("Ollama health check failed - socket connection refused at {BaseUrl}", effectiveUrl);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Error";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Ollama health check failed with unexpected error");
        }

        return health;
    }

    private static async IAsyncEnumerable<string> EmptyAsyncEnumerable()
    {
        await Task.CompletedTask;
        yield break;
    }

    private async IAsyncEnumerable<string> WrapStreamWithErrorHandling(
        IAsyncEnumerable<string> stream,
        string operationName)
    {
        var enumerator = stream.GetAsyncEnumerator();
        try
        {
            while (true)
            {
                bool hasNext;
                try
                {
                    hasNext = await enumerator.MoveNextAsync();
                }
                catch (HttpRequestException ex) when (ex.InnerException is SocketException)
                {
                    _logger.LogWarning(ex, "{Operation} failed - service unreachable (connection refused)", operationName);
                    break;
                }
                catch (HttpRequestException ex)
                {
                    _logger.LogWarning(ex, "{Operation} failed - service unreachable", operationName);
                    break;
                }
                catch (SocketException ex)
                {
                    _logger.LogWarning(ex, "{Operation} failed - socket connection refused", operationName);
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "{Operation} failed with unexpected error", operationName);
                    break;
                }

                if (!hasNext)
                    break;

                yield return enumerator.Current;
            }
        }
        finally
        {
            await enumerator.DisposeAsync();
        }
    }

    /// <summary>
    /// Pull (download) a model from the Ollama library to the local or remote Ollama instance.
    /// Returns an async enumerable of progress updates for real-time feedback.
    /// </summary>
    /// <param name="modelName">Name of the model to pull (e.g., "llama3:8b")</param>
    /// <param name="remoteOllamaUrl">Optional remote Ollama server URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Async enumerable of pull progress updates</returns>
    public async IAsyncEnumerable<OllamaPullProgress> PullModelAsync(
        string modelName,
        string? remoteOllamaUrl = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(remoteOllamaUrl);
        var effectiveUrl = GetEffectiveBaseUrl(remoteOllamaUrl);

        if (!IsEnabled)
        {
            yield return new OllamaPullProgress
            {
                Status = "Error",
                IsError = true,
                ErrorMessage = "Ollama provider is not enabled"
            };
            yield break;
        }

        if (client == null)
        {
            yield return new OllamaPullProgress
            {
                Status = "Error",
                IsError = true,
                ErrorMessage = "Ollama client not initialized"
            };
            yield break;
        }

        _logger.LogInformation("Starting model pull: {ModelName} from {Url}", modelName, effectiveUrl);

        // Track timing for speed calculation
        long lastCompletedBytes = 0;
        DateTime lastProgressTime = DateTime.UtcNow;

        // Get the pull stream - note: PullModelAsync doesn't throw on call, it throws on enumeration
        var pullStream = client.PullModelAsync(modelName, cancellationToken);

        // Use a separate enumerator to handle errors during enumeration
        var enumerator = pullStream.GetAsyncEnumerator(cancellationToken);
        OllamaPullProgress? errorProgress = null;

        try
        {
            while (true)
            {
                bool hasNext;
                try
                {
                    hasNext = await enumerator.MoveNextAsync();
                }
                catch (HttpRequestException ex) when (ex.InnerException is SocketException)
                {
                    _logger.LogWarning(ex, "Model pull failed - service unreachable at {Url}", effectiveUrl);
                    errorProgress = new OllamaPullProgress
                    {
                        Status = "Error",
                        IsError = true,
                        ErrorMessage = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running."
                    };
                    break;
                }
                catch (HttpRequestException ex)
                {
                    _logger.LogWarning(ex, "Model pull failed - HTTP error at {Url}", effectiveUrl);
                    errorProgress = new OllamaPullProgress
                    {
                        Status = "Error",
                        IsError = true,
                        ErrorMessage = $"HTTP error connecting to Ollama: {ex.Message}"
                    };
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Model pull failed for {ModelName}", modelName);
                    errorProgress = new OllamaPullProgress
                    {
                        Status = "Error",
                        IsError = true,
                        ErrorMessage = ex.Message
                    };
                    break;
                }

                if (!hasNext)
                    break;

                var response = enumerator.Current;
                if (response == null) continue;

                var now = DateTime.UtcNow;
                var progress = new OllamaPullProgress
                {
                    Status = response.Status ?? "Unknown",
                    Digest = response.Digest,
                    TotalBytes = response.Total,
                    CompletedBytes = response.Completed,
                    Timestamp = now
                };

                // Calculate percentage
                if (response.Total > 0 && response.Completed > 0)
                {
                    progress.Percentage = (double)response.Completed / response.Total * 100;
                }

                // Calculate download speed (bytes per second)
                if (response.Completed > lastCompletedBytes)
                {
                    var timeDelta = (now - lastProgressTime).TotalSeconds;
                    if (timeDelta > 0.1) // Only calculate if enough time has passed
                    {
                        var bytesDelta = response.Completed - lastCompletedBytes;
                        progress.BytesPerSecond = bytesDelta / timeDelta;

                        // Calculate estimated time remaining
                        if (response.Total > 0 && progress.BytesPerSecond > 0)
                        {
                            var remainingBytes = response.Total - response.Completed;
                            progress.EstimatedSecondsRemaining = remainingBytes / progress.BytesPerSecond;
                        }

                        lastCompletedBytes = response.Completed;
                        lastProgressTime = now;
                    }
                }

                // Check if this is the final success message
                if (response.Status?.Equals("success", StringComparison.OrdinalIgnoreCase) == true)
                {
                    progress.IsComplete = true;
                    _logger.LogInformation("Model pull completed: {ModelName}", modelName);
                }

                yield return progress;
            }
        }
        finally
        {
            await enumerator.DisposeAsync();
        }

        // Yield error after the try-finally block
        if (errorProgress != null)
        {
            yield return errorProgress;
        }
    }

    /// <summary>
    /// Delete a model from the local or remote Ollama instance.
    /// </summary>
    /// <param name="modelName">Name of the model to delete</param>
    /// <param name="remoteOllamaUrl">Optional remote Ollama server URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if successful, false otherwise</returns>
    public async Task<(bool Success, string? ErrorMessage)> DeleteModelAsync(
        string modelName,
        string? remoteOllamaUrl = null,
        CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(remoteOllamaUrl);
        var effectiveUrl = GetEffectiveBaseUrl(remoteOllamaUrl);

        if (!IsEnabled || client == null)
        {
            return (false, "Ollama provider is not enabled or configured");
        }

        try
        {
            _logger.LogInformation("Deleting model: {ModelName} from {Url}", modelName, effectiveUrl);
            await client.DeleteModelAsync(modelName, cancellationToken);
            _logger.LogInformation("Model deleted: {ModelName}", modelName);
            return (true, null);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogWarning(ex, "Model delete failed - service unreachable at {Url}", effectiveUrl);
            return (false, $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete model {ModelName}", modelName);
            return (false, ex.Message);
        }
    }

    /// <summary>
    /// Get detailed information about a specific model.
    /// </summary>
    /// <param name="modelName">Name of the model to query</param>
    /// <param name="remoteOllamaUrl">Optional remote Ollama server URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Model details or null if not found</returns>
    public async Task<OllamaModelDetails?> ShowModelAsync(
        string modelName,
        string? remoteOllamaUrl = null,
        CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(remoteOllamaUrl);
        var effectiveUrl = GetEffectiveBaseUrl(remoteOllamaUrl);

        if (!IsEnabled || client == null)
        {
            _logger.LogWarning("ShowModel failed - Ollama provider is not enabled or configured");
            return null;
        }

        try
        {
            _logger.LogDebug("Getting model details for: {ModelName} from {Url}", modelName, effectiveUrl);
            var response = await client.ShowModelAsync(modelName, cancellationToken);

            if (response == null)
            {
                return null;
            }

            var details = new OllamaModelDetails
            {
                Name = modelName,
                Modelfile = response.Modelfile,
                Template = response.Template,
                License = response.License
            };

            // Parse Parameters string if present (it's a string, not a dictionary)
            if (!string.IsNullOrEmpty(response.Parameters))
            {
                try
                {
                    // Parameters is a string like "num_ctx 4096\ntemperature 0.7"
                    // Try to parse it into a dictionary for easier consumption
                    var paramDict = new Dictionary<string, object>();
                    foreach (var line in response.Parameters.Split('\n', StringSplitOptions.RemoveEmptyEntries))
                    {
                        var parts = line.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length == 2)
                        {
                            paramDict[parts[0]] = parts[1];
                        }
                    }
                    details.Parameters = paramDict;
                }
                catch
                {
                    // If parsing fails, store raw string as single entry
                    details.Parameters = new Dictionary<string, object> { ["raw"] = response.Parameters };
                }
            }

            // Extract additional info from Info if available
            if (response.Info != null)
            {
                // ModelInfo is a class with direct properties
                if (response.Info.ParameterCount != null)
                {
                    details.ParameterSize = FormatParameterCount(response.Info.ParameterCount.Value.ToString());
                }
                if (response.Info.FileType != null)
                {
                    details.Format = response.Info.FileType.Value.ToString();
                }
                if (response.Info.QuantizationVersion != null)
                {
                    details.QuantizationLevel = response.Info.QuantizationVersion.Value.ToString();
                }
            }

            // Try to extract info from Details
            if (response.Details != null)
            {
                details.Family = response.Details.Family;
                details.ParameterSize = response.Details.ParameterSize;
                details.QuantizationLevel = response.Details.QuantizationLevel;
                details.Format = response.Details.Format;
            }

            _logger.LogDebug("Retrieved model details for: {ModelName}", modelName);
            return details;
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogWarning(ex, "ShowModel failed - service unreachable at {Url}", effectiveUrl);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get model details for {ModelName}", modelName);
            return null;
        }
    }

    /// <summary>
    /// Copy/rename a model.
    /// </summary>
    /// <param name="source">Source model name</param>
    /// <param name="destination">Destination model name</param>
    /// <param name="remoteOllamaUrl">Optional remote Ollama server URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result of the copy operation</returns>
    public async Task<OllamaModelCopyResult> CopyModelAsync(
        string source,
        string destination,
        string? remoteOllamaUrl = null,
        CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(remoteOllamaUrl);
        var effectiveUrl = GetEffectiveBaseUrl(remoteOllamaUrl);

        if (!IsEnabled || client == null)
        {
            return new OllamaModelCopyResult
            {
                Success = false,
                Error = "Ollama provider is not enabled or configured",
                Source = source,
                Destination = destination
            };
        }

        try
        {
            _logger.LogInformation("Copying model: {Source} -> {Destination} at {Url}",
                source, destination, effectiveUrl);

            await client.CopyModelAsync(source, destination, cancellationToken);

            _logger.LogInformation("Model copied successfully: {Source} -> {Destination}",
                source, destination);

            return new OllamaModelCopyResult
            {
                Success = true,
                Source = source,
                Destination = destination
            };
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogWarning(ex, "CopyModel failed - service unreachable at {Url}", effectiveUrl);
            return new OllamaModelCopyResult
            {
                Success = false,
                Error = $"Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running.",
                Source = source,
                Destination = destination
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to copy model {Source} -> {Destination}", source, destination);
            return new OllamaModelCopyResult
            {
                Success = false,
                Error = ex.Message,
                Source = source,
                Destination = destination
            };
        }
    }

    /// <summary>
    /// Create a new model from a Modelfile.
    /// </summary>
    /// <param name="name">Name for the new model</param>
    /// <param name="modelfileContent">Content of the Modelfile</param>
    /// <param name="remoteOllamaUrl">Optional remote Ollama server URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Async enumerable of creation progress updates</returns>
    public async IAsyncEnumerable<OllamaCreateProgress> CreateModelAsync(
        string name,
        string modelfileContent,
        string? remoteOllamaUrl = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(remoteOllamaUrl);
        var effectiveUrl = GetEffectiveBaseUrl(remoteOllamaUrl);

        if (!IsEnabled || client == null)
        {
            yield return new OllamaCreateProgress
            {
                Status = "Error: Ollama provider is not enabled or configured"
            };
            yield break;
        }

        _logger.LogInformation("Creating model: {ModelName} at {Url}", name, effectiveUrl);

        OllamaCreateProgress? errorProgress = null;

        // Parse Modelfile content to extract base model and other parameters
        // Modelfile format: FROM <base_model>\n[PARAMETER key value]\n[SYSTEM message]\n[TEMPLATE]
        string? baseModel = null;
        string? systemPrompt = null;
        string? template = null;
        var parameters = new Dictionary<string, object>();

        foreach (var line in modelfileContent.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("FROM ", StringComparison.OrdinalIgnoreCase))
            {
                baseModel = trimmed.Substring(5).Trim();
            }
            else if (trimmed.StartsWith("SYSTEM ", StringComparison.OrdinalIgnoreCase))
            {
                systemPrompt = trimmed.Substring(7).Trim().Trim('"');
            }
            else if (trimmed.StartsWith("TEMPLATE ", StringComparison.OrdinalIgnoreCase))
            {
                template = trimmed.Substring(9).Trim().Trim('"');
            }
            else if (trimmed.StartsWith("PARAMETER ", StringComparison.OrdinalIgnoreCase))
            {
                var parts = trimmed.Substring(10).Trim().Split(' ', 2);
                if (parts.Length == 2)
                {
                    // Try to parse numeric values
                    if (int.TryParse(parts[1], out var intVal))
                        parameters[parts[0]] = intVal;
                    else if (float.TryParse(parts[1], out var floatVal))
                        parameters[parts[0]] = floatVal;
                    else if (bool.TryParse(parts[1], out var boolVal))
                        parameters[parts[0]] = boolVal;
                    else
                        parameters[parts[0]] = parts[1];
                }
            }
        }

        if (string.IsNullOrEmpty(baseModel))
        {
            yield return new OllamaCreateProgress
            {
                Status = "Error: Modelfile must contain a FROM directive specifying the base model"
            };
            yield break;
        }

        var createRequest = new OllamaSharp.Models.CreateModelRequest
        {
            Model = name,
            From = baseModel,
            System = systemPrompt,
            Template = template,
            Parameters = parameters.Count > 0 ? parameters : null,
            Stream = true
        };

        IAsyncEnumerator<OllamaSharp.Models.CreateModelResponse?>? enumerator = null;

        try
        {
            enumerator = client.CreateModelAsync(createRequest, cancellationToken).GetAsyncEnumerator(cancellationToken);
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogWarning(ex, "CreateModel failed - service unreachable at {Url}", effectiveUrl);
            errorProgress = new OllamaCreateProgress
            {
                Status = $"Error: Cannot connect to Ollama at {effectiveUrl}. Ensure Ollama is running."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CreateModel failed for {ModelName}", name);
            errorProgress = new OllamaCreateProgress { Status = $"Error: {ex.Message}" };
        }

        if (errorProgress != null)
        {
            yield return errorProgress;
            yield break;
        }

        if (enumerator == null)
        {
            yield return new OllamaCreateProgress { Status = "Error: Failed to start model creation" };
            yield break;
        }

        try
        {
            while (true)
            {
                bool hasNext;
                try
                {
                    hasNext = await enumerator.MoveNextAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during model creation for {ModelName}", name);
                    errorProgress = new OllamaCreateProgress { Status = $"Error: {ex.Message}" };
                    break;
                }

                if (!hasNext) break;

                var response = enumerator.Current;
                if (response != null)
                {
                    yield return new OllamaCreateProgress
                    {
                        Status = response.Status ?? "Processing..."
                    };

                    if (response.Status?.Equals("success", StringComparison.OrdinalIgnoreCase) == true)
                    {
                        _logger.LogInformation("Model creation completed: {ModelName}", name);
                    }
                }
            }
        }
        finally
        {
            await enumerator.DisposeAsync();
        }

        if (errorProgress != null)
        {
            yield return errorProgress;
        }
    }

    /// <summary>
    /// List all locally available models.
    /// </summary>
    /// <param name="remoteOllamaUrl">Optional remote Ollama server URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of available models</returns>
    public async Task<IEnumerable<OllamaModelInfo>> ListModelsAsync(
        string? remoteOllamaUrl = null,
        CancellationToken cancellationToken = default)
    {
        var client = GetClientForUrl(remoteOllamaUrl);
        var effectiveUrl = GetEffectiveBaseUrl(remoteOllamaUrl);

        if (!IsEnabled || client == null)
        {
            _logger.LogWarning("ListModels failed - Ollama provider is not enabled or configured");
            return Enumerable.Empty<OllamaModelInfo>();
        }

        try
        {
            var models = await client.ListLocalModelsAsync(cancellationToken);

            return models?.Select(m => new OllamaModelInfo
            {
                Name = m.Name,
                Size = m.Size,
                ModifiedAt = m.ModifiedAt,
                Digest = m.Digest
            }) ?? Enumerable.Empty<OllamaModelInfo>();
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogWarning(ex, "ListModels failed - service unreachable at {Url}", effectiveUrl);
            return Enumerable.Empty<OllamaModelInfo>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list models from {Url}", effectiveUrl);
            return Enumerable.Empty<OllamaModelInfo>();
        }
    }

    /// <summary>
    /// Helper to format parameter count (e.g., "7000000000" -> "7B")
    /// </summary>
    private static string? FormatParameterCount(string? count)
    {
        if (string.IsNullOrEmpty(count)) return null;

        if (long.TryParse(count, out var num))
        {
            if (num >= 1_000_000_000)
                return $"{num / 1_000_000_000.0:F1}B";
            if (num >= 1_000_000)
                return $"{num / 1_000_000.0:F1}M";
            return num.ToString();
        }

        return count;
    }
}
