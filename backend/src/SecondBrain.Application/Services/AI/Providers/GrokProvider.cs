using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using System.ClientModel;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text.Json;
using OpenAIChatMessage = OpenAI.Chat.ChatMessage;

namespace SecondBrain.Application.Services.AI.Providers;

public class GrokProvider : IAIProvider
{
    private readonly XAISettings _settings;
    private readonly ILogger<GrokProvider> _logger;
    private readonly ChatClient? _client;
    private readonly HttpClient _httpClient;

    public string ProviderName => "Grok";
    public bool IsEnabled => _settings.Enabled;

    public GrokProvider(
        IOptions<AIProvidersSettings> settings,
        ILogger<GrokProvider> logger)
    {
        _settings = settings.Value.XAI;
        _logger = logger;
        _httpClient = new HttpClient();

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

                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_settings.ApiKey}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize xAI Grok client");
            }
        }
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

            return new AIResponse
            {
                Success = true,
                Content = response.Value.Content[0].Text,
                Model = _settings.DefaultModel,
                TokensUsed = response.Value.Usage.TotalTokenCount,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
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

        try
        {
            var chatMessages = messages.Select(m => m.Role.ToLower() switch
            {
                "system" => (OpenAIChatMessage)new SystemChatMessage(m.Content),
                "assistant" => new AssistantChatMessage(m.Content),
                _ => new UserChatMessage(m.Content)
            }).ToList();

            var chatOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = settings?.MaxTokens ?? _settings.MaxTokens,
                Temperature = settings?.Temperature ?? _settings.Temperature
            };

            var response = await _client.CompleteChatAsync(
                chatMessages,
                chatOptions,
                cancellationToken);

            return new AIResponse
            {
                Success = true,
                Content = response.Value.Content[0].Text,
                Model = _settings.DefaultModel,
                TokensUsed = response.Value.Usage.TotalTokenCount,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
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

        var messages = new List<OpenAIChatMessage>
        {
            new UserChatMessage(request.Prompt)
        };

        var chatOptions = new ChatCompletionOptions
        {
            MaxOutputTokenCount = request.MaxTokens ?? _settings.MaxTokens,
            Temperature = request.Temperature ?? _settings.Temperature
        };

        await foreach (var update in _client.CompleteChatStreamingAsync(
            messages,
            chatOptions,
            cancellationToken))
        {
            foreach (var contentPart in update.ContentUpdate)
            {
                yield return contentPart.Text;
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

        var chatMessages = messages.Select(m => m.Role.ToLower() switch
        {
            "system" => (OpenAIChatMessage)new SystemChatMessage(m.Content),
            "assistant" => new AssistantChatMessage(m.Content),
            _ => new UserChatMessage(m.Content)
        }).ToList();

        var chatOptions = new ChatCompletionOptions
        {
            MaxOutputTokenCount = settings?.MaxTokens ?? _settings.MaxTokens,
            Temperature = settings?.Temperature ?? _settings.Temperature
        };

        await foreach (var update in _client.CompleteChatStreamingAsync(
            chatMessages,
            chatOptions,
            cancellationToken))
        {
            foreach (var contentPart in update.ContentUpdate)
            {
                yield return contentPart.Text;
            }
        }
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
            var response = await _httpClient.GetAsync($"{_settings.BaseUrl}/models", cancellationToken);
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
