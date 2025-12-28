using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings.Models;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SecondBrain.Application.Services.Embeddings.Providers;

public class GeminiEmbeddingProvider : IEmbeddingProvider
{
    private readonly GeminiEmbeddingSettings _settings;
    private readonly ILogger<GeminiEmbeddingProvider> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    // Cache for available models
    private List<EmbeddingModelInfo>? _cachedModels;
    private DateTime _modelsCacheExpiry = DateTime.MinValue;
    private static readonly TimeSpan ModelsCacheDuration = TimeSpan.FromMinutes(30);

    // Known Gemini embedding model dimensions (API doesn't expose this directly)
    private static readonly Dictionary<string, int> KnownModelDimensions = new(StringComparer.OrdinalIgnoreCase)
    {
        { "text-embedding-004", 768 },
        { "embedding-001", 768 },
        { "textembedding-gecko@001", 768 },
        { "textembedding-gecko@latest", 768 },
    };

    // Fallback models if API fails
    private static readonly EmbeddingModelInfo[] FallbackModels = new[]
    {
        new EmbeddingModelInfo
        {
            ModelId = "text-embedding-004",
            DisplayName = "Text Embedding 004",
            Dimensions = 768,
            Description = "Latest Gemini embedding model with 768 dimensions",
            IsDefault = true
        },
        new EmbeddingModelInfo
        {
            ModelId = "embedding-001",
            DisplayName = "Embedding 001 (Legacy)",
            Dimensions = 768,
            Description = "Legacy embedding model"
        }
    };

    public string ProviderName => "Gemini";
    public string ModelName => _settings.Model;
    public bool IsEnabled => _settings.Enabled && !string.IsNullOrEmpty(_settings.ApiKey);
    public int Dimensions => _settings.Dimensions;

    public GeminiEmbeddingProvider(
        IOptions<EmbeddingProvidersSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<GeminiEmbeddingProvider> logger)
    {
        _settings = settings.Value.Gemini;
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        if (IsEnabled)
        {
            _logger.LogInformation(
                "Gemini embedding provider initialized. Model: {Model}, Dimensions: {Dimensions}",
                _settings.Model, _settings.Dimensions);
        }
    }

    public async Task<IEnumerable<EmbeddingModelInfo>> GetAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        // Return cached models if still valid
        if (_cachedModels != null && DateTime.UtcNow < _modelsCacheExpiry)
        {
            return _cachedModels;
        }

        if (!IsEnabled)
        {
            _logger.LogDebug("Gemini provider not enabled, returning fallback models");
            return FallbackModels;
        }

        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(15);

            // Fetch available models from Gemini API
            var url = $"{_settings.BaseUrl.TrimEnd('/')}/models?key={_settings.ApiKey}";
            var response = await httpClient.GetAsync(url, cancellationToken);
            response.EnsureSuccessStatusCode();

            var modelsResponse = await response.Content.ReadFromJsonAsync<GeminiModelsResponse>(cancellationToken: cancellationToken);

            if (modelsResponse?.Models == null || !modelsResponse.Models.Any())
            {
                _logger.LogWarning("No models returned from Gemini API, using fallback");
                return FallbackModels;
            }

            var embeddingModels = new List<EmbeddingModelInfo>();
            var defaultModel = _settings.Model;

            foreach (var model in modelsResponse.Models)
            {
                // Filter for embedding models
                if (!model.SupportedGenerationMethods?.Contains("embedContent") == true)
                {
                    continue;
                }

                // Extract model ID (remove "models/" prefix)
                var modelId = model.Name?.Replace("models/", "") ?? model.Name ?? "";

                // Look up dimensions from known models
                var dimensions = KnownModelDimensions.TryGetValue(modelId, out var dims) ? dims : 768; // Default to 768

                embeddingModels.Add(new EmbeddingModelInfo
                {
                    ModelId = modelId,
                    DisplayName = FormatModelDisplayName(model.DisplayName ?? modelId),
                    Dimensions = dimensions,
                    Description = model.Description ?? $"Gemini embedding model ({dimensions} dimensions)",
                    IsDefault = modelId.Equals(defaultModel, StringComparison.OrdinalIgnoreCase) ||
                               modelId.Equals(defaultModel.Replace("models/", ""), StringComparison.OrdinalIgnoreCase)
                });
            }

            // Sort with latest model first
            embeddingModels = embeddingModels
                .OrderByDescending(m => m.ModelId.Contains("004"))
                .ThenBy(m => m.ModelId)
                .ToList();

            // Ensure at least one model is marked as default
            if (embeddingModels.Any() && !embeddingModels.Any(m => m.IsDefault))
            {
                var firstModel = embeddingModels.First();
                embeddingModels[0] = new EmbeddingModelInfo
                {
                    ModelId = firstModel.ModelId,
                    DisplayName = firstModel.DisplayName,
                    Dimensions = firstModel.Dimensions,
                    Description = firstModel.Description,
                    IsDefault = true
                };
            }

            _cachedModels = embeddingModels.Any() ? embeddingModels : FallbackModels.ToList();
            _modelsCacheExpiry = DateTime.UtcNow.Add(ModelsCacheDuration);

            _logger.LogInformation("Fetched {Count} embedding models from Gemini API", embeddingModels.Count);
            return _cachedModels;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch models from Gemini API, using fallback models");
            return FallbackModels;
        }
    }

    private static string FormatModelDisplayName(string displayName)
    {
        // Clean up display name
        return displayName
            .Replace("Text Embeddings Model", "Text Embedding")
            .Replace("Embeddings Model", "Embedding")
            .Trim();
    }

    public async Task<EmbeddingResponse> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default,
        int? customDimensions = null,
        string? modelOverride = null)
    {
        if (!IsEnabled)
        {
            return new EmbeddingResponse
            {
                Success = false,
                Error = "Gemini embedding provider is not enabled or configured",
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
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);

            // Determine effective model (override takes priority)
            var effectiveModel = !string.IsNullOrEmpty(modelOverride) ? modelOverride : _settings.Model;

            // Build the request URL
            // Use the model name directly - it should be in format "models/text-embedding-004" or "text-embedding-004"
            var modelPath = effectiveModel.StartsWith("models/")
                ? effectiveModel
                : $"models/{effectiveModel}";

            var url = $"{_settings.BaseUrl}/{modelPath}:embedContent?key={_settings.ApiKey}";

            // Build the request body
            var request = new GeminiEmbedRequest
            {
                Content = new GeminiContent
                {
                    Parts = new[] { new GeminiPart { Text = text } }
                },
                OutputDimensionality = _settings.Dimensions
            };

            var response = await httpClient.PostAsJsonAsync(url, request, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Gemini embedding API error. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                return new EmbeddingResponse
                {
                    Success = false,
                    Error = $"Gemini API error: {response.StatusCode} - {responseContent}",
                    Provider = ProviderName
                };
            }

            var embedResponse = JsonSerializer.Deserialize<GeminiEmbedResponse>(responseContent);

            if (embedResponse?.Embedding?.Values == null || embedResponse.Embedding.Values.Length == 0)
            {
                return new EmbeddingResponse
                {
                    Success = false,
                    Error = "Gemini returned empty embedding",
                    Provider = ProviderName
                };
            }

            _logger.LogDebug(
                "Generated Gemini embedding. Model: {Model}, Dimensions: {Dimensions}",
                effectiveModel, embedResponse.Embedding.Values.Length);

            return new EmbeddingResponse
            {
                Success = true,
                Embedding = embedResponse.Embedding.Values.Select(v => (double)v).ToList(),
                Provider = ProviderName,
                Model = effectiveModel
            };
        }
        catch (TaskCanceledException)
        {
            return new EmbeddingResponse
            {
                Success = false,
                Error = "Request timed out",
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating embedding from Gemini");
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
        CancellationToken cancellationToken = default,
        int? customDimensions = null,
        string? modelOverride = null)
    {
        if (!IsEnabled)
        {
            return new BatchEmbeddingResponse
            {
                Success = false,
                Error = "Gemini embedding provider is not enabled or configured",
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
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds * 2); // Longer timeout for batch

            // Determine effective model (override takes priority)
            var effectiveModel = !string.IsNullOrEmpty(modelOverride) ? modelOverride : _settings.Model;

            // Build the request URL for batch embedding
            var modelPath = effectiveModel.StartsWith("models/")
                ? effectiveModel
                : $"models/{effectiveModel}";

            var url = $"{_settings.BaseUrl}/{modelPath}:batchEmbedContents?key={_settings.ApiKey}";

            // Build batch request
            var requests = textList.Select(text => new GeminiEmbedRequest
            {
                Model = modelPath,
                Content = new GeminiContent
                {
                    Parts = new[] { new GeminiPart { Text = text } }
                },
                OutputDimensionality = _settings.Dimensions
            }).ToArray();

            var batchRequest = new GeminiBatchEmbedRequest { Requests = requests };

            var response = await httpClient.PostAsJsonAsync(url, batchRequest, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Gemini batch embedding API error. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                return new BatchEmbeddingResponse
                {
                    Success = false,
                    Error = $"Gemini API error: {response.StatusCode} - {responseContent}",
                    Provider = ProviderName
                };
            }

            var batchResponse = JsonSerializer.Deserialize<GeminiBatchEmbedResponse>(responseContent);

            if (batchResponse?.Embeddings == null || batchResponse.Embeddings.Length == 0)
            {
                return new BatchEmbeddingResponse
                {
                    Success = false,
                    Error = "Gemini returned empty batch embeddings",
                    Provider = ProviderName
                };
            }

            var embeddings = batchResponse.Embeddings
                .Select(e => e.Values?.Select(v => (double)v).ToList() ?? new List<double>())
                .ToList();

            _logger.LogDebug(
                "Generated {Count} Gemini embeddings. Model: {Model}, Dimensions: {Dimensions}",
                embeddings.Count, effectiveModel, embeddings.FirstOrDefault()?.Count ?? 0);

            return new BatchEmbeddingResponse
            {
                Success = true,
                Embeddings = embeddings,
                Provider = ProviderName,
                Model = effectiveModel
            };
        }
        catch (TaskCanceledException)
        {
            return new BatchEmbeddingResponse
            {
                Success = false,
                Error = "Request timed out",
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating batch embeddings from Gemini");
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

    // Request/Response DTOs for Gemini Embedding API
    private class GeminiEmbedRequest
    {
        [JsonPropertyName("model")]
        public string? Model { get; set; }

        [JsonPropertyName("content")]
        public GeminiContent Content { get; set; } = new();

        [JsonPropertyName("outputDimensionality")]
        public int? OutputDimensionality { get; set; }
    }

    private class GeminiContent
    {
        [JsonPropertyName("parts")]
        public GeminiPart[] Parts { get; set; } = Array.Empty<GeminiPart>();
    }

    private class GeminiPart
    {
        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;
    }

    private class GeminiEmbedResponse
    {
        [JsonPropertyName("embedding")]
        public GeminiEmbedding? Embedding { get; set; }
    }

    private class GeminiEmbedding
    {
        [JsonPropertyName("values")]
        public float[] Values { get; set; } = Array.Empty<float>();
    }

    private class GeminiBatchEmbedRequest
    {
        [JsonPropertyName("requests")]
        public GeminiEmbedRequest[] Requests { get; set; } = Array.Empty<GeminiEmbedRequest>();
    }

    private class GeminiBatchEmbedResponse
    {
        [JsonPropertyName("embeddings")]
        public GeminiEmbedding[] Embeddings { get; set; } = Array.Empty<GeminiEmbedding>();
    }

    // DTOs for Gemini Models API
    private class GeminiModelsResponse
    {
        [JsonPropertyName("models")]
        public GeminiModelInfo[]? Models { get; set; }
    }

    private class GeminiModelInfo
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("displayName")]
        public string? DisplayName { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("supportedGenerationMethods")]
        public string[]? SupportedGenerationMethods { get; set; }
    }
}
