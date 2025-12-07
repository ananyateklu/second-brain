using Google.GenAI;
using Google.GenAI.Types;
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

public class GeminiProvider : IAIProvider
{
    public const string HttpClientName = "Gemini";

    private readonly GeminiSettings _settings;
    private readonly ILogger<GeminiProvider> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly Client? _client;

    public string ProviderName => "Gemini";
    public bool IsEnabled => _settings.Enabled;

    public GeminiProvider(
        IOptions<AIProvidersSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<GeminiProvider> logger)
    {
        _settings = settings.Value.Gemini;
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        if (_settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            try
            {
                _client = new Client(apiKey: _settings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Google Gemini client");
            }
        }
    }

    private HttpClient CreateHttpClient()
    {
        return _httpClientFactory.CreateClient(HttpClientName);
    }

    /// <summary>
    /// Build generation config from settings
    /// </summary>
    private GenerateContentConfig BuildGenerationConfig(int? maxTokens = null, float? temperature = null)
    {
        return new GenerateContentConfig
        {
            MaxOutputTokens = maxTokens ?? _settings.MaxTokens,
            Temperature = temperature ?? _settings.Temperature,
            TopP = _settings.TopP,
            TopK = _settings.TopK
        };
    }

    /// <summary>
    /// Extract text from GenerateContentResponse
    /// </summary>
    private static string ExtractText(GenerateContentResponse? response)
    {
        if (response?.Candidates == null || response.Candidates.Count == 0)
            return string.Empty;

        var candidate = response.Candidates[0];
        if (candidate?.Content?.Parts == null || candidate.Content.Parts.Count == 0)
            return string.Empty;

        var part = candidate.Content.Parts[0];
        return part?.Text ?? string.Empty;
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

        var modelName = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Gemini.GenerateCompletion", ProviderName, modelName);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var config = BuildGenerationConfig(request.MaxTokens, request.Temperature);

            var response = await _client.Models.GenerateContentAsync(
                model: modelName,
                contents: request.Prompt,
                config: config);

            stopwatch.Stop();
            var tokensUsed = response?.UsageMetadata?.TotalTokenCount ?? 0;

            activity?.SetTag("ai.tokens.total", tokensUsed);
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, true, tokensUsed);

            return new AIResponse
            {
                Success = true,
                Content = ExtractText(response),
                Model = modelName,
                TokensUsed = tokensUsed,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, false);

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

        var modelName = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Gemini.GenerateChatCompletion", ProviderName, modelName);
        activity?.SetTag("ai.messages.count", messageList.Count);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var config = BuildGenerationConfig(settings?.MaxTokens, settings?.Temperature);

            // Separate system messages from conversation
            var systemMessage = messageList.FirstOrDefault(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
            var conversationMessages = messageList.Where(m => !m.Role.Equals("system", StringComparison.OrdinalIgnoreCase)).ToList();

            if (conversationMessages.Count == 0)
            {
                throw new InvalidOperationException("No conversation messages found");
            }

            // Add system instruction to config if present
            if (systemMessage != null)
            {
                config.SystemInstruction = new Content
                {
                    Parts = new List<Part> { new Part { Text = systemMessage.Content } }
                };
            }

            // Check if the last message has images (multimodal)
            var lastMessage = conversationMessages.LastOrDefault();
            GenerateContentResponse? response;

            if (lastMessage?.Images != null && lastMessage.Images.Count > 0)
            {
                activity?.SetTag("ai.multimodal", true);
                activity?.SetTag("ai.images.count", lastMessage.Images.Count);

                // Build multimodal content with text and images
                var contents = BuildMultimodalContents(conversationMessages);

                response = await _client.Models.GenerateContentAsync(
                    model: modelName,
                    contents: contents,
                    config: config);
            }
            else
            {
                // Build text-only contents
                var contents = BuildTextContents(conversationMessages);

                response = await _client.Models.GenerateContentAsync(
                    model: modelName,
                    contents: contents,
                    config: config);
            }

            stopwatch.Stop();
            var tokensUsed = response?.UsageMetadata?.TotalTokenCount ?? 0;

            activity?.SetTag("ai.tokens.total", tokensUsed);
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, true, tokensUsed);

            return new AIResponse
            {
                Success = true,
                Content = ExtractText(response),
                Model = modelName,
                TokensUsed = tokensUsed,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, false);

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

        var modelName = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Gemini.StreamCompletion", ProviderName, modelName);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var config = BuildGenerationConfig(request.MaxTokens, request.Temperature);

        var tokenCount = 0;
        await foreach (var chunk in _client.Models.GenerateContentStreamAsync(
            model: modelName,
            contents: request.Prompt,
            config: config))
        {
            if (cancellationToken.IsCancellationRequested)
                yield break;

            var text = ExtractText(chunk);
            if (!string.IsNullOrEmpty(text))
            {
                if (!firstTokenReceived)
                {
                    firstTokenReceived = true;
                    ApplicationTelemetry.AIStreamingFirstTokenDuration.Record(
                        stopwatch.ElapsedMilliseconds,
                        new("provider", ProviderName),
                        new("model", modelName));
                }
                tokenCount++;
                yield return text;
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, true);
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

        var modelName = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Gemini.StreamChatCompletion", ProviderName, modelName);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;

        var config = BuildGenerationConfig(settings?.MaxTokens, settings?.Temperature);

        // Separate system messages from conversation
        var systemMessage = messageList.FirstOrDefault(m => m.Role.Equals("system", StringComparison.OrdinalIgnoreCase));
        var conversationMessages = messageList.Where(m => !m.Role.Equals("system", StringComparison.OrdinalIgnoreCase)).ToList();

        if (conversationMessages.Count == 0)
            yield break;

        // Add system instruction to config if present
        if (systemMessage != null)
        {
            config.SystemInstruction = new Content
            {
                Parts = new List<Part> { new Part { Text = systemMessage.Content } }
            };
        }

        var tokenCount = 0;

        // Check if the last message has images (multimodal)
        var lastMessage = conversationMessages.LastOrDefault();
        IAsyncEnumerable<GenerateContentResponse> streamResponse;

        if (lastMessage?.Images != null && lastMessage.Images.Count > 0)
        {
            activity?.SetTag("ai.multimodal", true);
            activity?.SetTag("ai.images.count", lastMessage.Images.Count);

            // Build multimodal content with text and images
            var contents = BuildMultimodalContents(conversationMessages);

            streamResponse = _client.Models.GenerateContentStreamAsync(
                model: modelName,
                contents: contents,
                config: config);
        }
        else
        {
            // Build text-only contents
            var contents = BuildTextContents(conversationMessages);

            streamResponse = _client.Models.GenerateContentStreamAsync(
                model: modelName,
                contents: contents,
                config: config);
        }

        await foreach (var chunk in streamResponse)
        {
            if (cancellationToken.IsCancellationRequested)
                yield break;

            var text = ExtractText(chunk);
            if (!string.IsNullOrEmpty(text))
            {
                if (!firstTokenReceived)
                {
                    firstTokenReceived = true;
                    ApplicationTelemetry.AIStreamingFirstTokenDuration.Record(
                        stopwatch.ElapsedMilliseconds,
                        new("provider", ProviderName),
                        new("model", modelName));
                }
                tokenCount++;
                yield return text;
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, modelName, stopwatch.ElapsedMilliseconds, true);
    }

    /// <summary>
    /// Build text-only contents from conversation messages
    /// </summary>
    private static List<Content> BuildTextContents(List<Models.ChatMessage> conversationMessages)
    {
        var contents = new List<Content>();

        foreach (var msg in conversationMessages)
        {
            var role = msg.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase) ? "model" : "user";
            contents.Add(new Content
            {
                Role = role,
                Parts = new List<Part> { new Part { Text = msg.Content } }
            });
        }

        return contents;
    }

    /// <summary>
    /// Build multimodal contents from conversation messages (with images)
    /// </summary>
    private static List<Content> BuildMultimodalContents(List<Models.ChatMessage> conversationMessages)
    {
        var contents = new List<Content>();

        foreach (var msg in conversationMessages)
        {
            var role = msg.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase) ? "model" : "user";
            var parts = new List<Part> { new Part { Text = msg.Content } };

            // Add images if present
            if (msg.Images != null && msg.Images.Count > 0)
            {
                foreach (var image in msg.Images)
                {
                    // Convert base64 string to byte array
                    var imageBytes = Convert.FromBase64String(image.Base64Data);
                    parts.Add(new Part
                    {
                        InlineData = new Blob
                        {
                            MimeType = image.MediaType,
                            Data = imageBytes
                        }
                    });
                }
            }

            contents.Add(new Content
            {
                Role = role,
                Parts = parts
            });
        }

        return contents;
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
            return false;

        try
        {
            var config = new GenerateContentConfig
            {
                MaxOutputTokens = 5
            };

            var response = await _client.Models.GenerateContentAsync(
                model: _settings.DefaultModel,
                contents: "Hello",
                config: config);

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
            using var httpClient = CreateHttpClient();
            var response = await httpClient.GetAsync(
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
