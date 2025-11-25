using Mscc.GenerativeAI;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace SecondBrain.Application.Services.AI.Providers;

public class GeminiProvider : IAIProvider
{
    private readonly GeminiSettings _settings;
    private readonly ILogger<GeminiProvider> _logger;
    private readonly GoogleAI? _client;
    private readonly HttpClient _httpClient;

    public string ProviderName => "Gemini";
    public bool IsEnabled => _settings.Enabled;

    public GeminiProvider(
        IOptions<AIProvidersSettings> settings,
        ILogger<GeminiProvider> logger)
    {
        _settings = settings.Value.Gemini;
        _logger = logger;
        _httpClient = new HttpClient();

        if (_settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            try
            {
                _client = new GoogleAI(_settings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Google Gemini client");
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
                Error = "Gemini provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        try
        {
            var model = _client.GenerativeModel(
                model: request.Model ?? _settings.DefaultModel);

            var generationConfig = new GenerationConfig
            {
                MaxOutputTokens = request.MaxTokens ?? _settings.MaxTokens,
                Temperature = request.Temperature ?? _settings.Temperature,
                TopP = _settings.TopP,
                TopK = _settings.TopK
            };

            var response = await model.GenerateContent(
                request.Prompt,
                generationConfig: generationConfig);

            return new AIResponse
            {
                Success = true,
                Content = response?.Text ?? string.Empty,
                Model = request.Model ?? _settings.DefaultModel,
                TokensUsed = response?.UsageMetadata?.TotalTokenCount ?? 0,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating completion from Gemini");
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
                Error = "Gemini provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        try
        {
            var model = _client.GenerativeModel(
                model: settings?.Model ?? _settings.DefaultModel);

            var generationConfig = new GenerationConfig
            {
                MaxOutputTokens = settings?.MaxTokens ?? _settings.MaxTokens,
                Temperature = settings?.Temperature ?? _settings.Temperature,
                TopP = _settings.TopP,
                TopK = _settings.TopK
            };

            // Convert messages to Gemini format with proper conversation history
            var messageList = messages.ToList();

            // Separate system messages from conversation
            var systemMessage = messageList.FirstOrDefault(m => m.Role.ToLower() == "system");
            var conversationMessages = messageList.Where(m => m.Role.ToLower() != "system").ToList();

            if (conversationMessages.Count == 0)
            {
                throw new InvalidOperationException("No conversation messages found");
            }

            // Build a properly formatted conversation history
            var conversationBuilder = new System.Text.StringBuilder();

            if (systemMessage != null)
            {
                conversationBuilder.AppendLine($"System: {systemMessage.Content}");
                conversationBuilder.AppendLine();
            }

            // Add all previous conversation turns
            foreach (var msg in conversationMessages)
            {
                var roleLabel = msg.Role.ToLower() == "assistant" ? "Assistant" : "User";
                conversationBuilder.AppendLine($"{roleLabel}: {msg.Content}");
                conversationBuilder.AppendLine();
            }

            // Remove the last newlines and get the final prompt
            var fullPrompt = conversationBuilder.ToString().TrimEnd();

            var response = await model.GenerateContent(fullPrompt, generationConfig: generationConfig);

            return new AIResponse
            {
                Success = true,
                Content = response?.Text ?? string.Empty,
                Model = settings?.Model ?? _settings.DefaultModel,
                TokensUsed = response?.UsageMetadata?.TotalTokenCount ?? 0,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating chat completion from Gemini");
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

        var model = _client.GenerativeModel(
            model: request.Model ?? _settings.DefaultModel);

        var generationConfig = new GenerationConfig
        {
            MaxOutputTokens = request.MaxTokens ?? _settings.MaxTokens,
            Temperature = request.Temperature ?? _settings.Temperature,
            TopP = _settings.TopP,
            TopK = _settings.TopK
        };

        await foreach (var chunk in model.GenerateContentStream(
            request.Prompt,
            generationConfig: generationConfig))
        {
            if (!string.IsNullOrEmpty(chunk?.Text))
            {
                yield return chunk.Text;
            }
        }
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

        var model = _client.GenerativeModel(
            model: settings?.Model ?? _settings.DefaultModel);

        var generationConfig = new GenerationConfig
        {
            MaxOutputTokens = settings?.MaxTokens ?? _settings.MaxTokens,
            Temperature = settings?.Temperature ?? _settings.Temperature,
            TopP = _settings.TopP,
            TopK = _settings.TopK
        };

        // Convert messages to Gemini format with proper conversation history
        var messageList = messages.ToList();

        // Separate system messages from conversation
        var systemMessage = messageList.FirstOrDefault(m => m.Role.ToLower() == "system");
        var conversationMessages = messageList.Where(m => m.Role.ToLower() != "system").ToList();

        if (conversationMessages.Count == 0)
            yield break;

        // Build a properly formatted conversation history
        var conversationBuilder = new System.Text.StringBuilder();

        if (systemMessage != null)
        {
            conversationBuilder.AppendLine($"System: {systemMessage.Content}");
            conversationBuilder.AppendLine();
        }

        // Add all previous conversation turns
        foreach (var msg in conversationMessages)
        {
            var roleLabel = msg.Role.ToLower() == "assistant" ? "Assistant" : "User";
            conversationBuilder.AppendLine($"{roleLabel}: {msg.Content}");
            conversationBuilder.AppendLine();
        }

        // Remove the last newlines and get the final prompt
        var fullPrompt = conversationBuilder.ToString().TrimEnd();

        await foreach (var chunk in model.GenerateContentStream(
            fullPrompt,
            generationConfig: generationConfig))
        {
            if (!string.IsNullOrEmpty(chunk?.Text))
            {
                yield return chunk.Text;
            }
        }
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
            return false;

        try
        {
            var model = _client.GenerativeModel(model: _settings.DefaultModel);

            var generationConfig = new GenerationConfig
            {
                MaxOutputTokens = 5
            };

            var response = await model.GenerateContent(
                "Hello",
                generationConfig: generationConfig);

            return response != null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini availability check failed");
            return false;
        }
    }

    private async Task<IEnumerable<string>> FetchAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"https://generativelanguage.googleapis.com/v1beta/models?key={_settings.ApiKey}",
                cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                var jsonDoc = JsonDocument.Parse(content);

                if (jsonDoc.RootElement.TryGetProperty("models", out var modelsElement))
                {
                    return modelsElement.EnumerateArray()
                        .Where(model => model.TryGetProperty("name", out _))
                        .Select(model =>
                        {
                            var name = model.GetProperty("name").GetString() ?? string.Empty;
                            return name.Replace("models/", "");
                        })
                        .Where(name => !string.IsNullOrEmpty(name) && name.StartsWith("gemini"))
                        .OrderByDescending(name => name)
                        .ToList();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch available models from Gemini API");
        }

        // Fallback to known models if API call fails
        return new[]
        {
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-1.0-pro"
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
                health.ErrorMessage = "Failed to connect to Google Gemini API";
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Error";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Gemini health check failed");
        }

        return health;
    }

    private static async IAsyncEnumerable<string> EmptyAsyncEnumerable()
    {
        await Task.CompletedTask;
        yield break;
    }
}
