using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings.Models;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SecondBrain.Application.Services.Embeddings.Providers;

public class OllamaEmbeddingProvider : IEmbeddingProvider
{
    private readonly OllamaEmbeddingSettings _settings;
    private readonly ILogger<OllamaEmbeddingProvider> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    // Cache for available models - keyed by base URL to handle URL changes
    private List<EmbeddingModelInfo>? _cachedModels;
    private DateTime _modelsCacheExpiry = DateTime.MinValue;
    private string? _cachedBaseUrl;
    private static readonly TimeSpan ModelsCacheDuration = TimeSpan.FromMinutes(1); // Short cache for local models

    // Known embedding models and their dimensions (only these are considered embedding models)
    private static readonly Dictionary<string, int> KnownEmbeddingModels = new(StringComparer.OrdinalIgnoreCase)
    {
        // Nomic
        { "nomic-embed-text", 768 },
        // MixedBread
        { "mxbai-embed-large", 1024 },
        // All-MiniLM
        { "all-minilm", 384 },
        // Snowflake
        { "snowflake-arctic-embed", 1024 },
        { "snowflake-arctic-embed2", 1024 },
        // BGE models
        { "bge-m3", 1024 },
        { "bge-large", 1024 },
        { "bge-base", 768 },
        { "bge-small", 384 },
        // Paraphrase
        { "paraphrase-multilingual", 768 },
        // E5 models
        { "e5-small", 384 },
        { "e5-base", 768 },
        { "e5-large", 1024 },
        { "e5-mistral-7b-instruct", 4096 },
        // GTE models  
        { "gte-small", 384 },
        { "gte-base", 768 },
        { "gte-large", 1024 },
        // UAE
        { "uae-large-v1", 1024 },
    };

    public string ProviderName => "Ollama";
    public string ModelName => _settings.Model;
    public bool IsEnabled => _settings.Enabled;
    public int Dimensions => GetDimensionsForModel(_settings.Model);

    /// <summary>
    /// Get available Ollama embedding models from the local Ollama installation.
    /// Only returns models that are both installed locally AND known to be embedding models.
    /// </summary>
    public async Task<IEnumerable<EmbeddingModelInfo>> GetAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        // Invalidate cache if base URL changed
        if (_cachedBaseUrl != _settings.BaseUrl)
        {
            _cachedModels = null;
            _cachedBaseUrl = _settings.BaseUrl;
        }

        // Return cached models if still valid
        if (_cachedModels != null && DateTime.UtcNow < _modelsCacheExpiry)
        {
            _logger.LogDebug("Returning {Count} cached Ollama embedding models", _cachedModels.Count);
            return _cachedModels;
        }

        if (!IsEnabled)
        {
            _logger.LogDebug("Ollama provider not enabled, returning empty model list");
            return Enumerable.Empty<EmbeddingModelInfo>();
        }

        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            // Fetch locally installed models from Ollama API
            var url = $"{_settings.BaseUrl.TrimEnd('/')}/api/tags";
            _logger.LogDebug("Fetching Ollama models from: {Url}", url);

            var response = await httpClient.GetAsync(url, cancellationToken);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var modelsResponse = JsonSerializer.Deserialize<OllamaModelsResponse>(content);

            if (modelsResponse?.Models == null || !modelsResponse.Models.Any())
            {
                _logger.LogInformation("No models found in Ollama installation at {BaseUrl}", _settings.BaseUrl);
                _cachedModels = new List<EmbeddingModelInfo>();
                _modelsCacheExpiry = DateTime.UtcNow.Add(ModelsCacheDuration);
                return _cachedModels;
            }

            _logger.LogDebug("Ollama returned {Count} total models", modelsResponse.Models.Length);

            var embeddingModels = new List<EmbeddingModelInfo>();
            var defaultModel = _settings.Model;

            foreach (var model in modelsResponse.Models)
            {
                // Extract base model name (remove :latest, :v1, etc.)
                var modelName = model.Name ?? "";
                var baseModelName = modelName.Split(':')[0].ToLowerInvariant();

                // ONLY include models that are in our known embedding models dictionary
                // This ensures we only show actual embedding models, not chat models
                if (!KnownEmbeddingModels.TryGetValue(baseModelName, out var dimensions))
                {
                    _logger.LogDebug("Skipping non-embedding model: {ModelName}", modelName);
                    continue;
                }

                _logger.LogDebug("Found installed embedding model: {ModelName} ({Dimensions} dims)", modelName, dimensions);

                embeddingModels.Add(new EmbeddingModelInfo
                {
                    ModelId = modelName,
                    DisplayName = FormatModelDisplayName(modelName),
                    Dimensions = dimensions,
                    Description = $"Locally installed • {FormatModelSize(model.Size)}",
                    IsDefault = modelName.Equals(defaultModel, StringComparison.OrdinalIgnoreCase) ||
                               baseModelName.Equals(defaultModel.Split(':')[0], StringComparison.OrdinalIgnoreCase)
                });
            }

            // Sort by name
            embeddingModels = embeddingModels.OrderBy(m => m.ModelId).ToList();

            // Ensure at least one model is marked as default if we have models
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

            _cachedModels = embeddingModels;
            _modelsCacheExpiry = DateTime.UtcNow.Add(ModelsCacheDuration);

            _logger.LogInformation("Found {Count} embedding models installed in Ollama at {BaseUrl}",
                embeddingModels.Count, _settings.BaseUrl);

            return _cachedModels;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning("Cannot connect to Ollama at {BaseUrl}: {Message}", _settings.BaseUrl, ex.Message);
            return Enumerable.Empty<EmbeddingModelInfo>();
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Timeout connecting to Ollama at {BaseUrl}", _settings.BaseUrl);
            return Enumerable.Empty<EmbeddingModelInfo>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch models from Ollama API at {BaseUrl}", _settings.BaseUrl);
            return Enumerable.Empty<EmbeddingModelInfo>();
        }
    }

    private static string FormatModelDisplayName(string modelId)
    {
        // Remove version tag and format nicely
        var baseName = modelId.Split(':')[0];
        return baseName
            .Replace("-", " ")
            .Replace("_", " ")
            .Split(' ')
            .Select(word => char.ToUpperInvariant(word[0]) + word[1..].ToLowerInvariant())
            .Aggregate((a, b) => $"{a} {b}");
    }

    private static string FormatModelSize(long sizeBytes)
    {
        if (sizeBytes >= 1_000_000_000)
            return $"{sizeBytes / 1_000_000_000.0:F1} GB";
        if (sizeBytes >= 1_000_000)
            return $"{sizeBytes / 1_000_000.0:F1} MB";
        return $"{sizeBytes / 1_000.0:F1} KB";
    }

    public OllamaEmbeddingProvider(
        IOptions<EmbeddingProvidersSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<OllamaEmbeddingProvider> logger)
    {
        _settings = settings.Value.Ollama;
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        if (IsEnabled)
        {
            _logger.LogInformation(
                "Ollama embedding provider initialized. Model: {Model}, BaseUrl: {BaseUrl}, Dimensions: {Dimensions}",
                _settings.Model, _settings.BaseUrl, Dimensions);
        }
    }

    /// <summary>
    /// Get dimensions for a model, using known values or configured default
    /// </summary>
    private int GetDimensionsForModel(string model)
    {
        // Try to find in known models (strip version tags like :latest)
        var baseModelName = model.Split(':')[0];

        if (KnownEmbeddingModels.TryGetValue(baseModelName, out var dimensions))
        {
            return dimensions;
        }

        // Fall back to configured dimensions
        return _settings.Dimensions;
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
                Error = "Ollama embedding provider is not enabled or configured",
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

            var url = $"{_settings.BaseUrl.TrimEnd('/')}/api/embed";

            var request = new OllamaEmbedRequest
            {
                Model = _settings.Model,
                Input = text
            };

            var response = await httpClient.PostAsJsonAsync(url, request, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Ollama embedding API error. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                return new EmbeddingResponse
                {
                    Success = false,
                    Error = $"Ollama API error: {response.StatusCode} - {responseContent}",
                    Provider = ProviderName
                };
            }

            var embedResponse = JsonSerializer.Deserialize<OllamaEmbedResponse>(responseContent);

            if (embedResponse?.Embeddings == null || embedResponse.Embeddings.Length == 0)
            {
                return new EmbeddingResponse
                {
                    Success = false,
                    Error = "Ollama returned empty embedding",
                    Provider = ProviderName
                };
            }

            // Ollama returns embeddings as an array, take the first one for single text
            var embedding = embedResponse.Embeddings[0];

            _logger.LogDebug(
                "Generated Ollama embedding. Model: {Model}, Dimensions: {Dimensions}",
                _settings.Model, embedding.Length);

            return new EmbeddingResponse
            {
                Success = true,
                Embedding = embedding.Select(v => (double)v).ToList(),
                Provider = ProviderName,
                Model = ModelName
            };
        }
        catch (HttpRequestException ex) when (ex.InnerException is System.Net.Sockets.SocketException)
        {
            _logger.LogWarning("Ollama server is not reachable at {BaseUrl}", _settings.BaseUrl);
            return new EmbeddingResponse
            {
                Success = false,
                Error = $"Ollama server is not reachable at {_settings.BaseUrl}. Make sure Ollama is running.",
                Provider = ProviderName
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
            _logger.LogError(ex, "Error generating embedding from Ollama");
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
                Error = "Ollama embedding provider is not enabled or configured",
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

            var url = $"{_settings.BaseUrl.TrimEnd('/')}/api/embed";

            // Ollama's embed API supports array input
            var request = new OllamaEmbedBatchRequest
            {
                Model = _settings.Model,
                Input = textList.ToArray()
            };

            var response = await httpClient.PostAsJsonAsync(url, request, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Ollama batch embedding API error. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                return new BatchEmbeddingResponse
                {
                    Success = false,
                    Error = $"Ollama API error: {response.StatusCode} - {responseContent}",
                    Provider = ProviderName
                };
            }

            var embedResponse = JsonSerializer.Deserialize<OllamaEmbedResponse>(responseContent);

            if (embedResponse?.Embeddings == null || embedResponse.Embeddings.Length == 0)
            {
                return new BatchEmbeddingResponse
                {
                    Success = false,
                    Error = "Ollama returned empty batch embeddings",
                    Provider = ProviderName
                };
            }

            var embeddings = embedResponse.Embeddings
                .Select(e => e.Select(v => (double)v).ToList())
                .ToList();

            _logger.LogDebug(
                "Generated {Count} Ollama embeddings. Model: {Model}, Dimensions: {Dimensions}",
                embeddings.Count, _settings.Model, embeddings.FirstOrDefault()?.Count ?? 0);

            return new BatchEmbeddingResponse
            {
                Success = true,
                Embeddings = embeddings,
                Provider = ProviderName,
                Model = ModelName
            };
        }
        catch (HttpRequestException ex) when (ex.InnerException is System.Net.Sockets.SocketException)
        {
            _logger.LogWarning("Ollama server is not reachable at {BaseUrl}", _settings.BaseUrl);
            return new BatchEmbeddingResponse
            {
                Success = false,
                Error = $"Ollama server is not reachable at {_settings.BaseUrl}. Make sure Ollama is running.",
                Provider = ProviderName
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
            _logger.LogError(ex, "Error generating batch embeddings from Ollama");
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
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            // Check if Ollama is running by hitting the tags endpoint
            var url = $"{_settings.BaseUrl.TrimEnd('/')}/api/tags";
            var response = await httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return false;
            }

            // Check if the embedding model is available
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var tagsResponse = JsonSerializer.Deserialize<OllamaTagsResponse>(content);

            if (tagsResponse?.Models == null)
            {
                return false;
            }

            // Check if our configured model exists (strip version tag for comparison)
            var modelBase = _settings.Model.Split(':')[0];
            return tagsResponse.Models.Any(m =>
                m.Name?.StartsWith(modelBase, StringComparison.OrdinalIgnoreCase) == true);
        }
        catch
        {
            return false;
        }
    }

    // Request/Response DTOs for Ollama API
    private class OllamaEmbedRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("input")]
        public string Input { get; set; } = string.Empty;
    }

    private class OllamaEmbedBatchRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("input")]
        public string[] Input { get; set; } = Array.Empty<string>();
    }

    private class OllamaEmbedResponse
    {
        [JsonPropertyName("model")]
        public string? Model { get; set; }

        [JsonPropertyName("embeddings")]
        public float[][]? Embeddings { get; set; }
    }

    private class OllamaTagsResponse
    {
        [JsonPropertyName("models")]
        public OllamaModel[]? Models { get; set; }
    }

    // Alias for OllamaTagsResponse (same structure as /api/tags)
    private class OllamaModelsResponse
    {
        [JsonPropertyName("models")]
        public OllamaModel[]? Models { get; set; }
    }

    private class OllamaModel
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("size")]
        public long Size { get; set; }

        [JsonPropertyName("modified_at")]
        public string? ModifiedAt { get; set; }
    }
}
