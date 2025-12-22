using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Telemetry;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SecondBrain.Application.Services.AI.Providers;

/// <summary>
/// Cohere AI provider - specializes in embeddings and reranking for RAG pipelines.
/// Uses Cohere's v2 API for chat, rerank, and embed endpoints.
/// </summary>
public class CohereProvider : IAIProvider
{
    public const string HttpClientName = "Cohere";

    private readonly CohereSettings _settings;
    private readonly ILogger<CohereProvider> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public string ProviderName => "Cohere";
    public bool IsEnabled => _settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey);

    public CohereProvider(
        IOptions<AIProvidersSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<CohereProvider> logger)
    {
        _settings = settings.Value.Cohere;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private HttpClient CreateHttpClient()
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);
        client.BaseAddress = new Uri(_settings.BaseUrl.TrimEnd('/') + "/");
        client.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);

        if (!string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
        }

        return client;
    }

    public async Task<AIResponse> GenerateCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Cohere provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var model = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Cohere.GenerateCompletion", ProviderName, model);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var httpClient = CreateHttpClient();

            // Cohere v2 chat endpoint
            var requestBody = new
            {
                model = model,
                messages = new[]
                {
                    new { role = "user", content = request.Prompt }
                },
                max_tokens = request.MaxTokens ?? _settings.MaxTokens,
                temperature = request.Temperature ?? _settings.Temperature
            };

            var jsonContent = JsonSerializer.Serialize(requestBody, CohereJsonOptions.Default);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await httpClient.PostAsync("chat", httpContent, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            stopwatch.Stop();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Cohere API error. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                activity?.RecordException(new Exception($"HTTP {response.StatusCode}"));
                ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

                return new AIResponse
                {
                    Success = false,
                    Error = $"Cohere API Error ({response.StatusCode}): {responseContent}",
                    Provider = ProviderName
                };
            }

            var result = ParseChatResponse(responseContent);

            activity?.SetTag("ai.tokens.total", result.TokensUsed);
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true, result.TokensUsed);

            return new AIResponse
            {
                Success = true,
                Content = result.Content,
                Model = model,
                TokensUsed = result.TokensUsed,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating completion from Cohere");
            return new AIResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    public async Task<AIResponse> GenerateChatCompletionAsync(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return new AIResponse
            {
                Success = false,
                Error = "Cohere provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var model = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Cohere.GenerateChatCompletion", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var httpClient = CreateHttpClient();

            var cohereMessages = messageList.Select(m => new
            {
                role = MapRole(m.Role),
                content = m.Content
            }).ToArray();

            var requestBody = new
            {
                model = model,
                messages = cohereMessages,
                max_tokens = settings?.MaxTokens ?? _settings.MaxTokens,
                temperature = settings?.Temperature ?? _settings.Temperature
            };

            var jsonContent = JsonSerializer.Serialize(requestBody, CohereJsonOptions.Default);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await httpClient.PostAsync("chat", httpContent, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            stopwatch.Stop();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Cohere chat API error. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                activity?.RecordException(new Exception($"HTTP {response.StatusCode}"));
                ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

                return new AIResponse
                {
                    Success = false,
                    Error = $"Cohere API Error ({response.StatusCode}): {responseContent}",
                    Provider = ProviderName
                };
            }

            var result = ParseChatResponse(responseContent);

            activity?.SetTag("ai.tokens.total", result.TokensUsed);
            activity?.SetStatus(ActivityStatusCode.Ok);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true, result.TokensUsed);

            return new AIResponse
            {
                Success = true,
                Content = result.Content,
                Model = model,
                TokensUsed = result.TokensUsed,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);
            ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, false);

            _logger.LogError(ex, "Error generating chat completion from Cohere");
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
        if (!IsEnabled)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(StreamCompletionInternalAsync(request, cancellationToken));
    }

    private async IAsyncEnumerable<string> StreamCompletionInternalAsync(
        AIRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var model = request.Model ?? _settings.DefaultModel;
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Cohere.StreamCompletion", ProviderName, model);
        activity?.SetTag("ai.prompt.length", request.Prompt.Length);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;
        var tokenCount = 0;

        HttpResponseMessage? response = null;
        Exception? initError = null;

        try
        {
            var httpClient = CreateHttpClient();

            var requestBody = new
            {
                model = model,
                messages = new[]
                {
                    new { role = "user", content = request.Prompt }
                },
                max_tokens = request.MaxTokens ?? _settings.MaxTokens,
                temperature = request.Temperature ?? _settings.Temperature,
                stream = true
            };

            var jsonContent = JsonSerializer.Serialize(requestBody, CohereJsonOptions.Default);
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "chat")
            {
                Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
            };

            response = await httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (Exception ex)
        {
            initError = ex;
        }

        if (initError != null || response == null || !response.IsSuccessStatusCode)
        {
            var errorMsg = initError?.Message ?? $"HTTP {response?.StatusCode}";
            _logger.LogError("Cohere streaming error: {Error}", errorMsg);
            activity?.RecordException(new Exception(errorMsg));
            yield break;
        }

        // Process SSE stream
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
            try
            {
                doc = JsonDocument.Parse(data);
            }
            catch
            {
                continue;
            }

            using (doc)
            {
                var root = doc.RootElement;

                // Cohere v2 streaming format: look for content-delta events
                if (root.TryGetProperty("type", out var typeElement) &&
                    typeElement.GetString() == "content-delta" &&
                    root.TryGetProperty("delta", out var delta) &&
                    delta.TryGetProperty("message", out var message) &&
                    message.TryGetProperty("content", out var content) &&
                    content.TryGetProperty("text", out var text))
                {
                    var textValue = text.GetString();
                    if (!string.IsNullOrEmpty(textValue))
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
                        yield return textValue;
                    }
                }
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true);
    }

    public Task<IAsyncEnumerable<string>> StreamChatCompletionAsync(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return Task.FromResult(EmptyAsyncEnumerable());
        }

        return Task.FromResult(StreamChatCompletionInternalAsync(messages, settings, cancellationToken));
    }

    private async IAsyncEnumerable<string> StreamChatCompletionInternalAsync(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var model = settings?.Model ?? _settings.DefaultModel;
        var messageList = messages.ToList();
        using var activity = ApplicationTelemetry.StartAIProviderActivity("Cohere.StreamChatCompletion", ProviderName, model);
        activity?.SetTag("ai.messages.count", messageList.Count);
        activity?.SetTag("ai.streaming", true);

        var stopwatch = Stopwatch.StartNew();
        var firstTokenReceived = false;
        var tokenCount = 0;

        HttpResponseMessage? response = null;
        Exception? initError = null;

        try
        {
            var httpClient = CreateHttpClient();

            var cohereMessages = messageList.Select(m => new
            {
                role = MapRole(m.Role),
                content = m.Content
            }).ToArray();

            var requestBody = new
            {
                model = model,
                messages = cohereMessages,
                max_tokens = settings?.MaxTokens ?? _settings.MaxTokens,
                temperature = settings?.Temperature ?? _settings.Temperature,
                stream = true
            };

            var jsonContent = JsonSerializer.Serialize(requestBody, CohereJsonOptions.Default);
            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "chat")
            {
                Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
            };

            response = await httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        }
        catch (Exception ex)
        {
            initError = ex;
        }

        if (initError != null || response == null || !response.IsSuccessStatusCode)
        {
            var errorMsg = initError?.Message ?? $"HTTP {response?.StatusCode}";
            _logger.LogError("Cohere streaming error: {Error}", errorMsg);
            activity?.RecordException(new Exception(errorMsg));
            yield break;
        }

        // Process SSE stream
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
            try
            {
                doc = JsonDocument.Parse(data);
            }
            catch
            {
                continue;
            }

            using (doc)
            {
                var root = doc.RootElement;

                // Cohere v2 streaming format
                if (root.TryGetProperty("type", out var typeElement) &&
                    typeElement.GetString() == "content-delta" &&
                    root.TryGetProperty("delta", out var delta) &&
                    delta.TryGetProperty("message", out var message) &&
                    message.TryGetProperty("content", out var content) &&
                    content.TryGetProperty("text", out var text))
                {
                    var textValue = text.GetString();
                    if (!string.IsNullOrEmpty(textValue))
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
                        yield return textValue;
                    }
                }
            }
        }

        stopwatch.Stop();
        activity?.SetTag("ai.tokens.output", tokenCount);
        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RecordAIRequest(ProviderName, model, stopwatch.ElapsedMilliseconds, true);
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
            return false;

        try
        {
            var httpClient = CreateHttpClient();

            // Simple test with minimal tokens
            var requestBody = new
            {
                model = _settings.DefaultModel,
                messages = new[]
                {
                    new { role = "user", content = "Hi" }
                },
                max_tokens = 5
            };

            var jsonContent = JsonSerializer.Serialize(requestBody, CohereJsonOptions.Default);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await httpClient.PostAsync("chat", httpContent, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cohere availability check failed");
            return false;
        }
    }

    public async Task<AIProviderHealth> GetHealthStatusAsync(CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var health = new AIProviderHealth
        {
            Provider = ProviderName,
            CheckedAt = DateTime.UtcNow
        };

        if (!_settings.Enabled)
        {
            health.IsHealthy = false;
            health.Status = "Disabled";
            health.ErrorMessage = "Provider is disabled in configuration";
            return health;
        }

        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            health.IsHealthy = false;
            health.Status = "Not Configured";
            health.ErrorMessage = "API key not configured";
            return health;
        }

        try
        {
            var isAvailable = await IsAvailableAsync(cancellationToken);
            stopwatch.Stop();

            health.IsHealthy = isAvailable;
            health.Status = isAvailable ? "Healthy" : "Unavailable";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.Version = "v2";
            health.AvailableModels = new[]
            {
                "command-r-plus",
                "command-r",
                "command-light",
                "rerank-v3.5",
                "rerank-english-v3.0",
                "rerank-multilingual-v3.0",
                "embed-v4.0",
                "embed-english-v3.0",
                "embed-multilingual-v3.0"
            };

            if (!isAvailable)
            {
                health.ErrorMessage = "Failed to connect to Cohere API";
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.Status = "Error";
            health.ResponseTimeMs = (int)stopwatch.ElapsedMilliseconds;
            health.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Cohere health check failed");
        }

        return health;
    }

    #region Cohere-Specific Methods

    /// <summary>
    /// Rerank documents using Cohere's native rerank API.
    /// Returns relevance scores for each document relative to the query.
    /// </summary>
    public async Task<CohereRerankResponse> RerankAsync(
        string query,
        IEnumerable<CohereDocument> documents,
        int topN = 10,
        string? model = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return new CohereRerankResponse
            {
                Success = false,
                Error = "Cohere provider is not enabled or configured"
            };
        }

        var rerankModel = model ?? _settings.RerankModel;
        var docList = documents.ToList();

        using var activity = ApplicationTelemetry.StartAIProviderActivity("Cohere.Rerank", ProviderName, rerankModel);
        activity?.SetTag("rag.rerank.input_count", docList.Count);
        activity?.SetTag("rag.rerank.top_n", topN);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            var httpClient = CreateHttpClient();

            var requestBody = new
            {
                model = rerankModel,
                query = query,
                documents = docList.Select(d => d.Text).ToArray(),
                top_n = Math.Min(topN, docList.Count),
                return_documents = false
            };

            var jsonContent = JsonSerializer.Serialize(requestBody, CohereJsonOptions.Default);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await httpClient.PostAsync("rerank", httpContent, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            stopwatch.Stop();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Cohere rerank API error. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                activity?.RecordException(new Exception($"HTTP {response.StatusCode}"));

                return new CohereRerankResponse
                {
                    Success = false,
                    Error = $"Cohere API Error ({response.StatusCode}): {responseContent}"
                };
            }

            var result = ParseRerankResponse(responseContent, docList);

            activity?.SetTag("rag.rerank.output_count", result.Results.Count);
            activity?.SetTag("rag.rerank.duration_ms", stopwatch.ElapsedMilliseconds);
            activity?.SetStatus(ActivityStatusCode.Ok);

            _logger.LogInformation(
                "Cohere rerank completed. Input: {InputCount}, Output: {OutputCount}, Duration: {Duration}ms",
                docList.Count, result.Results.Count, stopwatch.ElapsedMilliseconds);

            return result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            activity?.RecordException(ex);

            _logger.LogError(ex, "Error calling Cohere rerank API");
            return new CohereRerankResponse
            {
                Success = false,
                Error = ex.Message
            };
        }
    }

    #endregion

    #region Helper Methods

    private static string MapRole(string role)
    {
        return role.ToLower() switch
        {
            "system" => "system",
            "assistant" => "assistant",
            "user" => "user",
            _ => "user"
        };
    }

    private static (string Content, int TokensUsed) ParseChatResponse(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var content = "";
            var tokensUsed = 0;

            // Cohere v2 chat response format
            if (root.TryGetProperty("message", out var message) &&
                message.TryGetProperty("content", out var contentArray) &&
                contentArray.GetArrayLength() > 0)
            {
                var firstContent = contentArray[0];
                if (firstContent.TryGetProperty("text", out var text))
                {
                    content = text.GetString() ?? "";
                }
            }

            // Extract usage
            if (root.TryGetProperty("usage", out var usage))
            {
                var inputTokens = usage.TryGetProperty("billed_units", out var billed) &&
                                  billed.TryGetProperty("input_tokens", out var it)
                    ? it.GetInt32()
                    : 0;
                var outputTokens = billed.TryGetProperty("output_tokens", out var ot)
                    ? ot.GetInt32()
                    : 0;
                tokensUsed = inputTokens + outputTokens;
            }

            return (content, tokensUsed);
        }
        catch
        {
            return (json, 0);
        }
    }

    private static CohereRerankResponse ParseRerankResponse(string json, List<CohereDocument> originalDocs)
    {
        var response = new CohereRerankResponse { Success = true };

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("results", out var results))
            {
                foreach (var result in results.EnumerateArray())
                {
                    var index = result.TryGetProperty("index", out var idx) ? idx.GetInt32() : 0;
                    var relevanceScore = result.TryGetProperty("relevance_score", out var score)
                        ? score.GetSingle()
                        : 0f;

                    // Get the original document by index
                    var originalDoc = index < originalDocs.Count ? originalDocs[index] : null;

                    response.Results.Add(new CohereRerankResult
                    {
                        Index = index,
                        RelevanceScore = relevanceScore,
                        DocumentId = originalDoc?.Id ?? index.ToString()
                    });
                }
            }

            // Extract meta info
            if (root.TryGetProperty("meta", out var meta) &&
                meta.TryGetProperty("billed_units", out var billed) &&
                billed.TryGetProperty("search_units", out var searchUnits))
            {
                response.SearchUnits = searchUnits.GetInt32();
            }
        }
        catch (Exception ex)
        {
            response.Success = false;
            response.Error = $"Failed to parse rerank response: {ex.Message}";
        }

        return response;
    }

    private static async IAsyncEnumerable<string> EmptyAsyncEnumerable()
    {
        await Task.CompletedTask;
        yield break;
    }

    #endregion
}

#region Cohere Models

/// <summary>
/// Input document for Cohere rerank API
/// </summary>
public class CohereDocument
{
    public string Id { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

/// <summary>
/// Response from Cohere rerank API
/// </summary>
public class CohereRerankResponse
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public List<CohereRerankResult> Results { get; set; } = new();
    public int SearchUnits { get; set; }
}

/// <summary>
/// Individual rerank result with relevance score
/// </summary>
public class CohereRerankResult
{
    public int Index { get; set; }
    public float RelevanceScore { get; set; }
    public string DocumentId { get; set; } = string.Empty;
}

/// <summary>
/// JSON serialization options for Cohere API
/// </summary>
internal static class CohereJsonOptions
{
    public static readonly JsonSerializerOptions Default = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
}

#endregion
