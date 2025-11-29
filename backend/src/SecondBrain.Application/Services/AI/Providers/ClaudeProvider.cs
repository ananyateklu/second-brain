using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
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
    private readonly AnthropicClient? _client;

    public string ProviderName => "Claude";
    public bool IsEnabled => _settings.Enabled;

    public ClaudeProvider(
        IOptions<AIProvidersSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<ClaudeProvider> logger)
    {
        _settings = settings.Value.Anthropic;
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        if (_settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            try
            {
                _client = new AnthropicClient(new APIAuthentication(_settings.ApiKey));
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

        try
        {
            var messages = new List<Message>
            {
                new Message(RoleType.User, request.Prompt)
            };

            var parameters = new MessageParameters
            {
                Messages = messages,
                Model = request.Model ?? _settings.DefaultModel,
                MaxTokens = request.MaxTokens ?? _settings.MaxTokens,
                Temperature = (decimal?)(request.Temperature ?? _settings.Temperature),
                Stream = false
            };

            var response = await _client.Messages.GetClaudeMessageAsync(parameters, cancellationToken);
            if (response == null) throw new InvalidOperationException("No response from Claude API");

            var textContent = response.Content
                .OfType<Anthropic.SDK.Messaging.TextContent>()
                .FirstOrDefault();

            return new AIResponse
            {
                Success = true,
                Content = textContent?.Text ?? string.Empty,
                Model = response.Model,
                TokensUsed = response.Usage.InputTokens + response.Usage.OutputTokens,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
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

        try
        {
            var claudeMessages = messages
                .Where(m => m.Role.ToLower() != "system")
                .Select(m => ConvertToClaudeMessage(m))
                .ToList();

            var systemMessage = messages.FirstOrDefault(m => m.Role.ToLower() == "system");

            var parameters = new MessageParameters
            {
                Messages = claudeMessages,
                Model = settings?.Model ?? _settings.DefaultModel,
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

            var response = await _client.Messages.GetClaudeMessageAsync(parameters, cancellationToken);
            if (response == null) throw new InvalidOperationException("No response from Claude API");

            var textContent = response.Content
                .OfType<Anthropic.SDK.Messaging.TextContent>()
                .FirstOrDefault();

            return new AIResponse
            {
                Success = true,
                Content = textContent?.Text ?? string.Empty,
                Model = response.Model,
                TokensUsed = response.Usage.InputTokens + response.Usage.OutputTokens,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating chat completion from Claude");
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

        var messages = new List<Message>
        {
            new Message(RoleType.User, request.Prompt)
        };

        var parameters = new MessageParameters
        {
            Messages = messages,
            Model = request.Model ?? _settings.DefaultModel,
            MaxTokens = request.MaxTokens ?? _settings.MaxTokens,
            Temperature = (decimal?)(request.Temperature ?? _settings.Temperature),
            Stream = true
        };

        await foreach (var messageChunk in _client.Messages.StreamClaudeMessageAsync(
            parameters,
            cancellationToken))
        {
            if (messageChunk.Delta?.Text != null)
            {
                yield return messageChunk.Delta.Text;
            }
        }
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

        var claudeMessages = messages
            .Where(m => m.Role.ToLower() != "system")
            .Select(m => ConvertToClaudeMessage(m))
            .ToList();

        var systemMessage = messages.FirstOrDefault(m => m.Role.ToLower() == "system");

        var parameters = new MessageParameters
        {
            Messages = claudeMessages,
            Model = settings?.Model ?? _settings.DefaultModel,
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

        await foreach (var messageChunk in _client.Messages.StreamClaudeMessageAsync(
            parameters,
            cancellationToken))
        {
            if (messageChunk.Delta?.Text != null)
            {
                yield return messageChunk.Delta.Text;
            }
        }
    }

    /// <summary>
    /// Convert a ChatMessage to Claude format, handling multimodal content
    /// </summary>
    private static Message ConvertToClaudeMessage(Models.ChatMessage message)
    {
        var role = message.Role.ToLower() == "assistant" ? RoleType.Assistant : RoleType.User;

        // Check for images - use multimodal format
        if (message.Images != null && message.Images.Count > 0)
        {
            // Build multimodal content for Claude using ContentBase list
            var contentBlocks = new List<ContentBase>();

            // Add images first (Claude prefers images before text)
            foreach (var image in message.Images)
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

            // Add text content after images
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

        // Simple text message
        return new Message(role, message.Content);
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
            using var httpClient = CreateHttpClient();
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
            "claude-3-5-sonnet-20241022",
            "claude-3-5-sonnet-20240620",
            "claude-3-5-haiku-20241022",
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
