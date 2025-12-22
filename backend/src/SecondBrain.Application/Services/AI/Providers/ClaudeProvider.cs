using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Telemetry;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.Providers;

public class ClaudeProvider : IAIProvider
{
    public const string HttpClientName = "Claude";

    private readonly AnthropicSettings _settings;
    private readonly ILogger<ClaudeProvider> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAnthropicClientFactory _clientFactory;
    private readonly AnthropicClient? _client;

    public string ProviderName => "Claude";
    public bool IsEnabled => _settings.Enabled;

    public ClaudeProvider(
        IOptions<AIProvidersSettings> settings,
        IHttpClientFactory httpClientFactory,
        IAnthropicClientFactory clientFactory,
        ILogger<ClaudeProvider> logger)
    {
        _settings = settings.Value.Anthropic;
        _httpClientFactory = httpClientFactory;
        _clientFactory = clientFactory;
        _logger = logger;

        if (_settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            try
            {
                _client = _clientFactory.CreateClient(_settings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Anthropic Claude client");
            }
        }
    }

    private HttpClient CreateHttpClient()
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);
        if (!string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            if (!client.DefaultRequestHeaders.Contains("x-api-key"))
            {
                client.DefaultRequestHeaders.Add("x-api-key", _settings.ApiKey);
            }
            if (!client.DefaultRequestHeaders.Contains("anthropic-version"))
            {
                client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
            }
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
                Error = "Claude provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var model = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Claude.GenerateCompletion", ProviderName, model);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var messages = new List<Message>
            {
                new Message(RoleType.User, request.Prompt)
            };

            var parameters = new MessageParameters
            {
                Messages = messages,
                Model = model,
                MaxTokens = request.MaxTokens ?? _settings.MaxTokens,
                Temperature = (decimal?)(request.Temperature ?? _settings.Temperature),
                Stream = false
            };

            var response = await _client.Messages.GetClaudeMessageAsync(parameters, cancellationToken);
            if (response == null) throw new InvalidOperationException("No response from Claude API");

            var textContent = response.Content
                .OfType<Anthropic.SDK.Messaging.TextContent>()
                .FirstOrDefault();

            stopwatch.Stop();
            var tokensUsed = response.Usage.InputTokens + response.Usage.OutputTokens;

            activity?.SetTag("ai.tokens.total", tokensUsed);
            activity?.SetTag("ai.tokens.input", response.Usage.InputTokens);
            activity?.SetTag("ai.tokens.output", response.Usage.OutputTokens);
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true, tokensUsed);

            return new AIResponse
            {
                Success = true,
                Content = textContent?.Text ?? string.Empty,
                Model = response.Model,
                TokensUsed = tokensUsed,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating completion from Claude");
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
                Error = "Claude provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var model = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Claude.GenerateChatCompletion", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var claudeMessages = messageList
                .Where(m => m.Role.ToLower() != "system")
                .Where(m => !string.IsNullOrWhiteSpace(m.Content) ||
                           (m.Images != null && m.Images.Count > 0) ||
                           (m.Documents != null && m.Documents.Count > 0))
                .Select(m => ConvertToClaudeMessage(m))
                .ToList();

            var systemMessage = messageList.FirstOrDefault(m => m.Role.ToLower() == "system");

            var parameters = new MessageParameters
            {
                Messages = claudeMessages,
                Model = model,
                MaxTokens = settings?.MaxTokens ?? _settings.MaxTokens,
                Temperature = (decimal?)(settings?.Temperature ?? _settings.Temperature),
                Stream = false
            };

            if (systemMessage != null)
            {
                parameters.System = new List<SystemMessage>
                {
                    new SystemMessage(systemMessage.Content)
                };
            }

            // Add prompt caching for large system prompts
            var enableCaching = settings?.EnablePromptCaching ?? _settings.Caching.Enabled;
            if (enableCaching && (systemMessage?.Content.Length ?? 0) >= _settings.Caching.MinContentTokens * 4) // Rough estimate: 4 chars per token
            {
                parameters.PromptCaching = PromptCacheType.AutomaticToolsAndSystem;
                activity?.SetTag("ai.cache.enabled", true);
            }

            // Add extended thinking support if enabled
            var enableThinking = settings?.EnableThinking ?? _settings.Features.EnableExtendedThinking;
            if (enableThinking && IsThinkingCapableModel(model))
            {
                var thinkingBudget = settings?.ThinkingBudget ?? _settings.Thinking.DefaultBudget;
                thinkingBudget = Math.Min(thinkingBudget, _settings.Thinking.MaxBudget);

                parameters.Thinking = new ThinkingParameters
                {
                    BudgetTokens = thinkingBudget
                };

                activity?.SetTag("ai.thinking.enabled", true);
                activity?.SetTag("ai.thinking.budget", thinkingBudget);

                _logger.LogDebug("Extended thinking enabled with budget {Budget} for model {Model}", thinkingBudget, model);
            }

            var response = await _client.Messages.GetClaudeMessageAsync(parameters, cancellationToken);
            if (response == null) throw new InvalidOperationException("No response from Claude API");

            // Parse response content including thinking blocks
            var (textContent, thinkingContent) = ParseResponseContent(response);

            stopwatch.Stop();
            var tokensUsed = response.Usage.InputTokens + response.Usage.OutputTokens;

            activity?.SetTag("ai.tokens.total", tokensUsed);
            activity?.SetTag("ai.tokens.input", response.Usage.InputTokens);
            activity?.SetTag("ai.tokens.output", response.Usage.OutputTokens);
            if (thinkingContent != null)
            {
                activity?.SetTag("ai.thinking.present", true);
            }
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true, tokensUsed);

            var aiResponse = new AIResponse
            {
                Success = true,
                Content = textContent,
                Model = response.Model,
                TokensUsed = tokensUsed,
                Provider = ProviderName
            };

            // Include thinking process if available and configured to show
            if (thinkingContent != null && _settings.Thinking.IncludeThinkingInResponse)
            {
                aiResponse.ThinkingProcess = thinkingContent;
            }

            // Track cache usage if available
            if (response.Usage.CacheCreationInputTokens > 0 || response.Usage.CacheReadInputTokens > 0)
            {
                aiResponse.CacheUsage = new CacheUsageStats
                {
                    CacheCreationTokens = response.Usage.CacheCreationInputTokens,
                    CacheReadTokens = response.Usage.CacheReadInputTokens
                };

                activity?.SetTag("ai.cache.creation_tokens", response.Usage.CacheCreationInputTokens);
                activity?.SetTag("ai.cache.read_tokens", response.Usage.CacheReadInputTokens);

                _logger.LogDebug("Cache usage - Creation: {Creation}, Read: {Read}, Savings: {Savings}%",
                    response.Usage.CacheCreationInputTokens,
                    response.Usage.CacheReadInputTokens,
                    aiResponse.CacheUsage.SavingsPercent);
            }

            return aiResponse;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating chat completion from Claude");
            return new AIResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    /// <summary>
    /// Check if the model supports extended thinking
    /// </summary>
    private static bool IsThinkingCapableModel(string model)
    {
        // Extended thinking is supported on Claude 3.5 Sonnet and newer models
        // Claude 3.7, Claude 4 (Sonnet/Opus) all support it
        var thinkingCapableModels = new[]
        {
            "claude-opus-4",
            "claude-sonnet-4",
            "claude-3-7-sonnet",
            "claude-3-5-sonnet"
        };

        return thinkingCapableModels.Any(m => model.Contains(m, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Parse response content to extract text and thinking blocks
    /// </summary>
    private static (string TextContent, string? ThinkingContent) ParseResponseContent(MessageResponse response)
    {
        var textBuilder = new System.Text.StringBuilder();
        string? thinkingContent = null;

        foreach (var content in response.Content)
        {
            if (content is Anthropic.SDK.Messaging.TextContent textBlock)
            {
                textBuilder.Append(textBlock.Text);
            }
            else if (content is ThinkingContent thinkingBlock)
            {
                thinkingContent = thinkingBlock.Thinking;
            }
        }

        return (textBuilder.ToString(), thinkingContent);
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
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Claude.StreamCompletion", ProviderName, model);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var messages = new List<Message>
        {
            new Message(RoleType.User, request.Prompt)
        };

        var parameters = new MessageParameters
        {
            Messages = messages,
            Model = model,
            MaxTokens = request.MaxTokens ?? _settings.MaxTokens,
            Temperature = (decimal?)(request.Temperature ?? _settings.Temperature),
            Stream = true
        };

        var tokenCount = 0;
        await foreach (var messageChunk in _client.Messages.StreamClaudeMessageAsync(
            parameters,
            cancellationToken))
        {
            if (messageChunk.Delta?.Text != null)
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
                yield return messageChunk.Delta.Text;
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
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Claude.StreamChatCompletion", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var claudeMessages = messageList
            .Where(m => m.Role.ToLower() != "system")
            .Where(m => !string.IsNullOrWhiteSpace(m.Content) ||
                       (m.Images != null && m.Images.Count > 0) ||
                       (m.Documents != null && m.Documents.Count > 0))
            .Select(m => ConvertToClaudeMessage(m))
            .ToList();

        var systemMessage = messageList.FirstOrDefault(m => m.Role.ToLower() == "system");

        var parameters = new MessageParameters
        {
            Messages = claudeMessages,
            Model = model,
            MaxTokens = settings?.MaxTokens ?? _settings.MaxTokens,
            Temperature = (decimal?)(settings?.Temperature ?? _settings.Temperature),
            Stream = true
        };

        if (systemMessage != null)
        {
            parameters.System = new List<SystemMessage>
            {
                new SystemMessage(systemMessage.Content)
            };
        }

        // Add prompt caching for large system prompts
        var enableCaching = settings?.EnablePromptCaching ?? _settings.Caching.Enabled;
        if (enableCaching && (systemMessage?.Content.Length ?? 0) >= _settings.Caching.MinContentTokens * 4) // Rough estimate: 4 chars per token
        {
            parameters.PromptCaching = PromptCacheType.AutomaticToolsAndSystem;
            activity?.SetTag("ai.cache.enabled", true);
        }

        // Add extended thinking support if enabled
        var enableThinking = settings?.EnableThinking ?? _settings.Features.EnableExtendedThinking;
        if (enableThinking && IsThinkingCapableModel(model))
        {
            var thinkingBudget = settings?.ThinkingBudget ?? _settings.Thinking.DefaultBudget;
            thinkingBudget = Math.Min(thinkingBudget, _settings.Thinking.MaxBudget);

            parameters.Thinking = new ThinkingParameters
            {
                BudgetTokens = thinkingBudget
            };

            activity?.SetTag("ai.thinking.enabled", true);
            activity?.SetTag("ai.thinking.budget", thinkingBudget);
        }

        var tokenCount = 0;
        var isInThinkingBlock = false;

        await foreach (var messageChunk in _client.Messages.StreamClaudeMessageAsync(
            parameters,
            cancellationToken))
        {
            // Handle thinking block start
            if (messageChunk.ContentBlock?.Type == "thinking")
            {
                isInThinkingBlock = true;
                if (_settings.Thinking.IncludeThinkingInResponse)
                {
                    yield return "<thinking>";
                }
                continue;
            }

            // Handle thinking content delta
            if (messageChunk.Delta?.Thinking != null)
            {
                if (_settings.Thinking.IncludeThinkingInResponse)
                {
                    yield return messageChunk.Delta.Thinking;
                }
                continue;
            }

            // Handle content block start (text block after thinking)
            if (messageChunk.ContentBlock?.Type == "text" && isInThinkingBlock)
            {
                isInThinkingBlock = false;
                if (_settings.Thinking.IncludeThinkingInResponse)
                {
                    yield return "</thinking>\n\n";
                }
            }

            // Handle text delta
            if (messageChunk.Delta?.Text != null)
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
                yield return messageChunk.Delta.Text;
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true);
    }

    /// <summary>
    /// Stream chat completion with token usage callback.
    /// Claude's streaming API provides usage info in message_delta events.
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
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Claude.StreamChatCompletionWithUsage", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.streaming", true);
        activity?.SetTag("ai.usage_tracking", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var claudeMessages = messageList
            .Where(m => m.Role.ToLower() != "system")
            .Where(m => !string.IsNullOrWhiteSpace(m.Content) ||
                       (m.Images != null && m.Images.Count > 0) ||
                       (m.Documents != null && m.Documents.Count > 0))
            .Select(m => ConvertToClaudeMessage(m))
            .ToList();

        var systemMessage = messageList.FirstOrDefault(m => m.Role.ToLower() == "system");

        var parameters = new MessageParameters
        {
            Messages = claudeMessages,
            Model = model,
            MaxTokens = settings?.MaxTokens ?? _settings.MaxTokens,
            Temperature = (decimal?)(settings?.Temperature ?? _settings.Temperature),
            Stream = true
        };

        if (systemMessage != null)
        {
            parameters.System = new List<SystemMessage>
            {
                new SystemMessage(systemMessage.Content)
            };
        }

        // Add prompt caching for large system prompts
        var enableCaching = settings?.EnablePromptCaching ?? _settings.Caching.Enabled;
        if (enableCaching && (systemMessage?.Content.Length ?? 0) >= _settings.Caching.MinContentTokens * 4)
        {
            parameters.PromptCaching = PromptCacheType.AutomaticToolsAndSystem;
            activity?.SetTag("ai.cache.enabled", true);
        }

        // Add extended thinking support if enabled
        var enableThinking = settings?.EnableThinking ?? _settings.Features.EnableExtendedThinking;
        if (enableThinking && IsThinkingCapableModel(model))
        {
            var thinkingBudget = settings?.ThinkingBudget ?? _settings.Thinking.DefaultBudget;
            thinkingBudget = Math.Min(thinkingBudget, _settings.Thinking.MaxBudget);

            parameters.Thinking = new ThinkingParameters
            {
                BudgetTokens = thinkingBudget
            };

            activity?.SetTag("ai.thinking.enabled", true);
            activity?.SetTag("ai.thinking.budget", thinkingBudget);
        }

        var tokenCount = 0;
        var isInThinkingBlock = false;

        // Token usage tracking from Claude's streaming response
        int? inputTokens = null;
        int? outputTokens = null;
        int? cacheCreationTokens = null;
        int? cacheReadTokens = null;

        await foreach (var messageChunk in _client.Messages.StreamClaudeMessageAsync(
            parameters,
            cancellationToken))
        {
            // Capture usage information from message_start or message_delta events
            if (messageChunk.Usage != null)
            {
                inputTokens = messageChunk.Usage.InputTokens;
                outputTokens = messageChunk.Usage.OutputTokens;

                // Claude includes cache usage in the usage object
                if (messageChunk.Usage.CacheCreationInputTokens > 0)
                    cacheCreationTokens = messageChunk.Usage.CacheCreationInputTokens;
                if (messageChunk.Usage.CacheReadInputTokens > 0)
                    cacheReadTokens = messageChunk.Usage.CacheReadInputTokens;

                activity?.SetTag("ai.tokens.input", inputTokens);
                activity?.SetTag("ai.tokens.output", outputTokens);
            }

            // Handle thinking block start
            if (messageChunk.ContentBlock?.Type == "thinking")
            {
                isInThinkingBlock = true;
                if (_settings.Thinking.IncludeThinkingInResponse)
                {
                    yield return "<thinking>";
                }
                continue;
            }

            // Handle thinking content delta
            if (messageChunk.Delta?.Thinking != null)
            {
                if (_settings.Thinking.IncludeThinkingInResponse)
                {
                    yield return messageChunk.Delta.Thinking;
                }
                continue;
            }

            // Handle content block start (text block after thinking)
            if (messageChunk.ContentBlock?.Type == "text" && isInThinkingBlock)
            {
                isInThinkingBlock = false;
                if (_settings.Thinking.IncludeThinkingInResponse)
                {
                    yield return "</thinking>\n\n";
                }
            }

            // Handle text delta
            if (messageChunk.Delta?.Text != null)
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
                yield return messageChunk.Delta.Text;
            }
        }

        stopwatch.Stop();

        // Create usage info - Claude provides accurate token counts in streaming
        StreamingTokenUsage usage;
        if (inputTokens.HasValue && outputTokens.HasValue)
        {
            usage = StreamingTokenUsage.CreateActual(inputTokens.Value, outputTokens.Value, ProviderName, model);
            if (cacheCreationTokens.HasValue)
                usage.CacheCreationTokens = cacheCreationTokens.Value;
            if (cacheReadTokens.HasValue)
                usage.CacheReadTokens = cacheReadTokens.Value;
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
    /// Convert a ChatMessage to Claude format, handling multimodal content (images and PDFs)
    /// </summary>
    private static Message ConvertToClaudeMessage(Models.ChatMessage message)
    {
        var role = message.Role.ToLower() == "assistant" ? RoleType.Assistant : RoleType.User;

        var hasImages = message.Images != null && message.Images.Count > 0;
        var hasDocuments = message.Documents != null && message.Documents.Count > 0;

        // Check for multimodal content (images or documents)
        if (hasImages || hasDocuments)
        {
            // Build multimodal content for Claude using ContentBase list
            var contentBlocks = new List<ContentBase>();

            // Add documents first (PDFs for context)
            if (hasDocuments)
            {
                foreach (var doc in message.Documents!)
                {
                    // Create DocumentContent for PDF files
                    var documentContent = new DocumentContent
                    {
                        Source = new DocumentSource
                        {
                            MediaType = doc.MediaType,
                            Data = doc.Base64Data
                        }
                    };
                    contentBlocks.Add(documentContent);
                }
            }

            // Add images (Claude prefers images before text)
            if (hasImages)
            {
                foreach (var image in message.Images!)
                {
                    // Create ImageContent with ImageSource directly
                    var imageContent = new ImageContent
                    {
                        Source = new ImageSource
                        {
                            MediaType = image.MediaType,
                            Data = image.Base64Data
                        }
                    };
                    contentBlocks.Add(imageContent);
                }
            }

            // Add text content after documents and images
            if (!string.IsNullOrEmpty(message.Content))
            {
                contentBlocks.Add(new Anthropic.SDK.Messaging.TextContent { Text = message.Content });
            }

            // Create message with content blocks
            return new Message
            {
                Role = role,
                Content = contentBlocks
            };
        }

        // Simple text message - Claude API requires non-empty text content blocks
        // Use a placeholder for empty messages to prevent API error
        var content = string.IsNullOrWhiteSpace(message.Content) ? " " : message.Content;
        return new Message(role, content);
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
            return false;

        try
        {
            var testMessage = new List<Message>
            {
                new Message(RoleType.User, "Hello")
            };

            var parameters = new MessageParameters
            {
                Messages = testMessage,
                Model = _settings.DefaultModel,
                MaxTokens = 10,
                Stream = false
            };

            var response = await _client.Messages.GetClaudeMessageAsync(parameters, cancellationToken);
            if (response == null) throw new InvalidOperationException("No response from Claude API");
            return response != null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Claude availability check failed");
            return false;
        }
    }

    private async Task<IEnumerable<string>> FetchAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var httpClient = CreateHttpClient();
            var response = await httpClient.GetAsync("https://api.anthropic.com/v1/models", cancellationToken);
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
                        .ToList();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch available models from Anthropic API");
        }

        // Fallback to known models if API call fails
        return new[]
        {
            // Claude 4 models
            "claude-sonnet-4-20250514",
            "claude-opus-4-20250514",
            // Claude 3.7 models
            "claude-3-7-sonnet-20250219",
            // Claude 3.5 models
            "claude-3-5-sonnet-20241022",
            "claude-3-5-sonnet-20240620",
            "claude-3-5-haiku-20241022",
            // Claude 3 models
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
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
            health.Version = _settings.Version;
            health.AvailableModels = availableModels;

            if (!isAvailable)
            {
                health.ErrorMessage = "Failed to connect to Anthropic API";
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Error";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Claude health check failed");
        }

        return health;
    }

    private static async IAsyncEnumerable<string> EmptyAsyncEnumerable()
    {
        await Task.CompletedTask;
        yield break;
    }
}
