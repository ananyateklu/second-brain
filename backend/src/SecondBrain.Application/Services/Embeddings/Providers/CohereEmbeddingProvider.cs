using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SecondBrain.Application.Services.Embeddings.Providers;

/// <summary>
/// Cohere embedding provider using the v2 Embed API.
/// Supports embed-v4.0 with configurable output dimensions (256-4096).
/// See: https://docs.cohere.com/reference/embed
/// </summary>
public class CohereEmbeddingProvider : IEmbeddingProvider
{
    public const string HttpClientName = "CohereEmbedding";

    private readonly CohereEmbeddingSettings _embeddingSettings;
    private readonly CohereSettings _aiSettings;
    private readonly ILogger<CohereEmbeddingProvider> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    // Cache for available models (models don't change frequently)
    private List<EmbeddingModelInfo>? _cachedModels;
    private DateTime _modelsCacheExpiry = DateTime.MinValue;
    private static readonly TimeSpan ModelsCacheDuration = TimeSpan.FromMinutes(30);

    /// <summary>
    /// Known Cohere embedding models with their dimension info
    /// </summary>
    private static readonly Dictionary<string, (int DefaultDims, int MinDims, int MaxDims, string Description)> KnownModels = new(StringComparer.OrdinalIgnoreCase)
    {
        { "embed-v4.0", (1024, 256, 4096, "Latest and most capable model, 100+ languages. Supports custom dimensions (256-4096).") },
        { "embed-english-v3.0", (1024, 1024, 1024, "English-only, optimized for speed") },
        { "embed-multilingual-v3.0", (1024, 1024, 1024, "100+ languages, v3 generation") },
        { "embed-english-light-v3.0", (384, 384, 384, "Lightweight English model, fastest") },
        { "embed-multilingual-light-v3.0", (384, 384, 384, "Lightweight multilingual model") },
    };

    /// <summary>
    /// Fallback models if API listing fails
    /// </summary>
    private static readonly EmbeddingModelInfo[] FallbackModels =
    [
        new EmbeddingModelInfo
        {
            ModelId = "embed-v4.0",
            DisplayName = "Embed v4.0",
            Dimensions = 1024,
            Description = "Latest and most capable model, 100+ languages. Supports custom dimensions (256-4096).",
            IsDefault = true,
            SupportsCustomDimensions = true,
            MinDimensions = 256,
            MaxDimensions = 4096
        },
        new EmbeddingModelInfo
        {
            ModelId = "embed-english-v3.0",
            DisplayName = "Embed English v3.0",
            Dimensions = 1024,
            Description = "English-only model, optimized for speed"
        },
        new EmbeddingModelInfo
        {
            ModelId = "embed-multilingual-v3.0",
            DisplayName = "Embed Multilingual v3.0",
            Dimensions = 1024,
            Description = "Multilingual model supporting 100+ languages"
        }
    ];

    public string ProviderName => "Cohere";
    public string ModelName => _embeddingSettings.Model;
    public bool IsEnabled => _embeddingSettings.Enabled && !string.IsNullOrWhiteSpace(_aiSettings.ApiKey);
    public int Dimensions => _embeddingSettings.Dimensions;

    public CohereEmbeddingProvider(
        IOptions<EmbeddingProvidersSettings> embeddingSettings,
        IOptions<AIProvidersSettings> aiSettings,
        IHttpClientFactory httpClientFactory,
        ILogger<CohereEmbeddingProvider> logger)
    {
        _embeddingSettings = embeddingSettings.Value.Cohere;
        _aiSettings = aiSettings.Value.Cohere;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private HttpClient CreateHttpClient()
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);
        var baseUrl = _aiSettings.BaseUrl.TrimEnd('/');
        client.BaseAddress = new Uri(baseUrl + "/");
        client.Timeout = TimeSpan.FromSeconds(_embeddingSettings.TimeoutSeconds);

        if (!string.IsNullOrWhiteSpace(_aiSettings.ApiKey))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _aiSettings.ApiKey);
        }

        return client;
    }

    public Task<IEnumerable<EmbeddingModelInfo>> GetAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        // Return cached models if still valid
        if (_cachedModels != null && DateTime.UtcNow < _modelsCacheExpiry)
        {
            return Task.FromResult<IEnumerable<EmbeddingModelInfo>>(_cachedModels);
        }

        if (!IsEnabled)
        {
            _logger.LogDebug("Cohere embedding provider not enabled, returning fallback models");
            return Task.FromResult<IEnumerable<EmbeddingModelInfo>>(FallbackModels);
        }

        // Cohere doesn't have a models listing API, so return known models
        var models = KnownModels.Select(kvp =>
        {
            var supportsCustom = kvp.Value.MinDims != kvp.Value.MaxDims;
            return new EmbeddingModelInfo
            {
                ModelId = kvp.Key,
                DisplayName = FormatModelDisplayName(kvp.Key),
                Dimensions = _embeddingSettings.Dimensions > 0 && supportsCustom
                    ? Math.Clamp(_embeddingSettings.Dimensions, kvp.Value.MinDims, kvp.Value.MaxDims)
                    : kvp.Value.DefaultDims,
                Description = kvp.Value.Description,
                IsDefault = kvp.Key.Equals(_embeddingSettings.Model, StringComparison.OrdinalIgnoreCase),
                SupportsCustomDimensions = supportsCustom,
                MinDimensions = supportsCustom ? kvp.Value.MinDims : null,
                MaxDimensions = supportsCustom ? kvp.Value.MaxDims : null
            };
        }).ToList();

        // Ensure at least one is marked default
        if (!models.Any(m => m.IsDefault) && models.Any())
        {
            var first = models[0];
            models[0] = new EmbeddingModelInfo
            {
                ModelId = first.ModelId,
                DisplayName = first.DisplayName,
                Dimensions = first.Dimensions,
                Description = first.Description,
                IsDefault = true,
                SupportsCustomDimensions = first.SupportsCustomDimensions,
                MinDimensions = first.MinDimensions,
                MaxDimensions = first.MaxDimensions
            };
        }

        _cachedModels = models;
        _modelsCacheExpiry = DateTime.UtcNow.Add(ModelsCacheDuration);

        return Task.FromResult<IEnumerable<EmbeddingModelInfo>>(_cachedModels);
    }

    public async Task<EmbeddingResponse> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return new EmbeddingResponse
            {
                Success = false,
                Error = "Cohere embedding provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            return new EmbeddingResponse
            {
                Success = false,
                Error = "Text cannot be empty",
                Provider = ProviderName
            };
        }

        try
        {
            var httpClient = CreateHttpClient();

            // Cohere v2 Embed API request format
            var requestBody = BuildEmbedRequest(new[] { text }, CohereInputType.SearchDocument);

            var jsonContent = JsonSerializer.Serialize(requestBody, CohereEmbedJsonOptions.Default);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            _logger.LogDebug("Generating Cohere embedding. Model: {Model}, TextLength: {Length}",
                _embeddingSettings.Model, text.Length);

            var response = await httpClient.PostAsync("embed", httpContent, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Cohere embed API error. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                return new EmbeddingResponse
                {
                    Success = false,
                    Error = $"Cohere API Error ({response.StatusCode}): {responseContent}",
                    Provider = ProviderName
                };
            }

            var result = ParseEmbedResponse(responseContent);

            if (result.Embeddings.Count == 0)
            {
                return new EmbeddingResponse
                {
                    Success = false,
                    Error = "No embedding returned from Cohere",
                    Provider = ProviderName
                };
            }

            _logger.LogDebug("Cohere embedding generated: {Dimensions} dimensions, {Tokens} tokens used",
                result.Embeddings[0].Count, result.TokensUsed);

            return new EmbeddingResponse
            {
                Success = true,
                Embedding = result.Embeddings[0],
                TokensUsed = result.TokensUsed,
                Provider = ProviderName,
                Model = _embeddingSettings.Model
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating embedding from Cohere");
            return new EmbeddingResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    public async Task<BatchEmbeddingResponse> GenerateEmbeddingsAsync(
        IEnumerable<string> texts,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return new BatchEmbeddingResponse
            {
                Success = false,
                Error = "Cohere embedding provider is not enabled or configured",
                Provider = ProviderName
            };
        }

        var textList = texts.ToList();
        if (!textList.Any())
        {
            return new BatchEmbeddingResponse
            {
                Success = false,
                Error = "Text list cannot be empty",
                Provider = ProviderName
            };
        }

        try
        {
            var httpClient = CreateHttpClient();

            // Cohere v2 Embed API request format
            var requestBody = BuildEmbedRequest(textList, CohereInputType.SearchDocument);

            var jsonContent = JsonSerializer.Serialize(requestBody, CohereEmbedJsonOptions.Default);
            var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            _logger.LogDebug("Generating Cohere batch embeddings. Model: {Model}, Count: {Count}",
                _embeddingSettings.Model, textList.Count);

            var response = await httpClient.PostAsync("embed", httpContent, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Cohere embed API error. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                return new BatchEmbeddingResponse
                {
                    Success = false,
                    Error = $"Cohere API Error ({response.StatusCode}): {responseContent}",
                    Provider = ProviderName
                };
            }

            var result = ParseEmbedResponse(responseContent);

            if (result.Embeddings.Count != textList.Count)
            {
                _logger.LogError("Embedding count mismatch. Expected: {Expected}, Received: {Received}",
                    textList.Count, result.Embeddings.Count);

                return new BatchEmbeddingResponse
                {
                    Success = false,
                    Error = $"Provider returned {result.Embeddings.Count} embeddings but {textList.Count} were requested",
                    Provider = ProviderName
                };
            }

            _logger.LogDebug("Cohere batch embeddings generated: {Count} embeddings, {Tokens} total tokens",
                result.Embeddings.Count, result.TokensUsed);

            return new BatchEmbeddingResponse
            {
                Success = true,
                Embeddings = result.Embeddings,
                TotalTokensUsed = result.TokensUsed,
                Provider = ProviderName,
                Model = _embeddingSettings.Model
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating batch embeddings from Cohere");
            return new BatchEmbeddingResponse
            {
                Success = false,
                Error = ex.Message,
                Provider = ProviderName
            };
        }
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return false;
        }

        try
        {
            var testResponse = await GenerateEmbeddingAsync("test", cancellationToken);
            return testResponse.Success;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Builds a Cohere v2 Embed API request object
    /// </summary>
    private object BuildEmbedRequest(IEnumerable<string> texts, CohereInputType inputType)
    {
        var textList = texts.ToList();

        // Build inputs array in v2 format: [{"content": [{"type": "text", "text": "..."}]}]
        var inputs = textList.Select(text => new CohereEmbedInput
        {
            Content = new List<CohereContentItem>
            {
                new CohereContentItem { Type = "text", Text = text }
            }
        }).ToList();

        var request = new CohereEmbedRequest
        {
            Model = _embeddingSettings.Model,
            InputType = inputType.ToApiString(),
            EmbeddingTypes = new[] { "float" },
            Inputs = inputs
        };

        // Only set output_dimension for embed-v4.0 which supports custom dimensions
        if (SupportsCustomDimensions(_embeddingSettings.Model) && _embeddingSettings.Dimensions > 0)
        {
            request.OutputDimension = _embeddingSettings.Dimensions;
        }

        return request;
    }

    /// <summary>
    /// Parses the Cohere v2 Embed API response
    /// </summary>
    private static (List<List<double>> Embeddings, int TokensUsed) ParseEmbedResponse(string json)
    {
        var embeddings = new List<List<double>>();
        var tokensUsed = 0;

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // v2 response format: {"embeddings": {"float": [[...], [...]]}, "meta": {"billed_units": {"input_tokens": N}}}
            if (root.TryGetProperty("embeddings", out var embeddingsObj) &&
                embeddingsObj.TryGetProperty("float", out var floatEmbeddings))
            {
                foreach (var embeddingArray in floatEmbeddings.EnumerateArray())
                {
                    var embedding = new List<double>();
                    foreach (var value in embeddingArray.EnumerateArray())
                    {
                        embedding.Add(value.GetDouble());
                    }
                    embeddings.Add(embedding);
                }
            }

            // Extract token usage
            if (root.TryGetProperty("meta", out var meta) &&
                meta.TryGetProperty("billed_units", out var billedUnits) &&
                billedUnits.TryGetProperty("input_tokens", out var inputTokens))
            {
                tokensUsed = inputTokens.GetInt32();
            }
        }
        catch (Exception)
        {
            // Return empty on parse failure
        }

        return (embeddings, tokensUsed);
    }

    /// <summary>
    /// Checks if the model supports custom output dimensions
    /// </summary>
    private static bool SupportsCustomDimensions(string model)
    {
        // Only embed-v4.0 supports custom dimensions (256-4096)
        return model.Equals("embed-v4.0", StringComparison.OrdinalIgnoreCase);
    }

    private static string FormatModelDisplayName(string modelId)
    {
        return modelId switch
        {
            "embed-v4.0" => "Embed v4.0",
            "embed-english-v3.0" => "Embed English v3.0",
            "embed-multilingual-v3.0" => "Embed Multilingual v3.0",
            "embed-english-light-v3.0" => "Embed English Light v3.0",
            "embed-multilingual-light-v3.0" => "Embed Multilingual Light v3.0",
            _ => modelId.Replace("-", " ").Replace("embed", "Embed")
        };
    }
}

#region Cohere Embed Request/Response Models

/// <summary>
/// Input type for Cohere embeddings - affects how text is processed
/// </summary>
public enum CohereInputType
{
    /// <summary>For documents to be stored and searched</summary>
    SearchDocument,
    /// <summary>For search queries</summary>
    SearchQuery,
    /// <summary>For classification tasks</summary>
    Classification,
    /// <summary>For clustering tasks</summary>
    Clustering,
    /// <summary>For image embeddings</summary>
    Image
}

public static class CohereInputTypeExtensions
{
    public static string ToApiString(this CohereInputType inputType)
    {
        return inputType switch
        {
            CohereInputType.SearchDocument => "search_document",
            CohereInputType.SearchQuery => "search_query",
            CohereInputType.Classification => "classification",
            CohereInputType.Clustering => "clustering",
            CohereInputType.Image => "image",
            _ => "search_document"
        };
    }
}

/// <summary>
/// Cohere v2 Embed API request
/// </summary>
internal class CohereEmbedRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = "embed-v4.0";

    [JsonPropertyName("input_type")]
    public string InputType { get; set; } = "search_document";

    [JsonPropertyName("embedding_types")]
    public string[] EmbeddingTypes { get; set; } = new[] { "float" };

    [JsonPropertyName("inputs")]
    public List<CohereEmbedInput> Inputs { get; set; } = new();

    [JsonPropertyName("output_dimension")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? OutputDimension { get; set; }
}

/// <summary>
/// Single input item for Cohere v2 Embed API
/// </summary>
internal class CohereEmbedInput
{
    [JsonPropertyName("content")]
    public List<CohereContentItem> Content { get; set; } = new();
}

/// <summary>
/// Content item within an embed input
/// </summary>
internal class CohereContentItem
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "text";

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

/// <summary>
/// JSON serialization options for Cohere Embed API
/// </summary>
internal static class CohereEmbedJsonOptions
{
    public static readonly JsonSerializerOptions Default = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
}

#endregion
