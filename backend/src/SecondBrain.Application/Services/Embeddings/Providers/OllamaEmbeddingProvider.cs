using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OllamaSharp;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings.Models;
using System.Collections.Concurrent;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SecondBrain.Application.Services.Embeddings.Providers;

public class OllamaEmbeddingProvider : IEmbeddingProvider
{
    private readonly OllamaEmbeddingSettings _settings;
    private readonly ILogger<OllamaEmbeddingProvider> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly OllamaApiClient? _defaultClient;
    private readonly ConcurrentDictionary<string, OllamaApiClient> _clientCache = new();
    private readonly bool _useSdkEmbeddings;

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

        // Try to use SDK by default, fall back to HTTP if needed
        _useSdkEmbeddings = true;

        if (IsEnabled)
        {
            try
            {
                _defaultClient = new OllamaApiClient(new Uri(_settings.BaseUrl));
                _clientCache[_settings.BaseUrl] = _defaultClient;
                _logger.LogInformation(
                    "Ollama embedding provider initialized with SDK. Model: {Model}, BaseUrl: {BaseUrl}, Dimensions: {Dimensions}",
                    _settings.Model, _settings.BaseUrl, Dimensions);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to initialize Ollama SDK client for embeddings, falling back to HTTP");
                _useSdkEmbeddings = false;
                _logger.LogInformation(
                    "Ollama embedding provider initialized with HTTP. Model: {Model}, BaseUrl: {BaseUrl}, Dimensions: {Dimensions}",
                    _settings.Model, _settings.BaseUrl, Dimensions);
            }
        }
    }

    /// <summary>
    /// Gets or creates an Ollama client for the specified base URL.
    /// </summary>
    private OllamaApiClient? GetClientForUrl(string? overrideUrl)
    {
        if (!_useSdkEmbeddings) return null;

        if (string.IsNullOrWhiteSpace(overrideUrl))
        {
            return _defaultClient;
        }

        var normalizedUrl = overrideUrl.TrimEnd('/');
        return _clientCache.GetOrAdd(normalizedUrl, url =>
        {
            _logger.LogInformation("Creating new Ollama embedding client for URL: {Url}", url);
            return new OllamaApiClient(new Uri(url));
        });
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
        CancellationToken cancellationToken = default,
        int? customDimensions = null,
        string? modelOverride = null)
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

        // Determine effective model (override takes priority)
        var effectiveModel = !string.IsNullOrEmpty(modelOverride) ? modelOverride : _settings.Model;

        // Try SDK-based embedding first
        if (_useSdkEmbeddings && _defaultClient != null)
        {
            return await GenerateEmbeddingWithSdkAsync(text, effectiveModel, cancellationToken);
        }

        // Fall back to HTTP-based embedding
        return await GenerateEmbeddingWithHttpAsync(text, effectiveModel, cancellationToken);
    }

    /// <summary>
    /// Generate embedding using OllamaSharp SDK
    /// </summary>
    private async Task<EmbeddingResponse> GenerateEmbeddingWithSdkAsync(
        string text,
        string effectiveModel,
        CancellationToken cancellationToken)
    {
        try
        {
            var client = GetClientForUrl(null);
            if (client == null)
            {
                return await GenerateEmbeddingWithHttpAsync(text, effectiveModel, cancellationToken);
            }

            var embedRequest = new OllamaSharp.Models.EmbedRequest
            {
                Model = effectiveModel,
                Input = new List<string> { text }
            };
            var response = await client.EmbedAsync(embedRequest, cancellationToken);

            if (response?.Embeddings == null || response.Embeddings.Count == 0)
            {
                return new EmbeddingResponse
                {
                    Success = false,
                    Error = "Ollama SDK returned empty embedding",
                    Provider = ProviderName
                };
            }

            // Take the first embedding (for single text input)
            var embedding = response.Embeddings[0];

            _logger.LogDebug(
                "Generated Ollama embedding via SDK. Model: {Model}, Dimensions: {Dimensions}",
                effectiveModel, embedding.Length);

            return new EmbeddingResponse
            {
                Success = true,
                Embedding = embedding.Select(v => (double)v).ToList(),
                Provider = ProviderName,
                Model = effectiveModel
            };
        }
        catch (HttpRequestException ex) when (ex.InnerException is System.Net.Sockets.SocketException)
        {
            _logger.LogWarning("Ollama server is not reachable at {BaseUrl} (SDK)", _settings.BaseUrl);
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
            _logger.LogError(ex, "Error generating embedding from Ollama SDK, falling back to HTTP");
            // Fall back to HTTP on SDK error
            return await GenerateEmbeddingWithHttpAsync(text, effectiveModel, cancellationToken);
        }
    }

    /// <summary>
    /// Generate embedding using HTTP API (fallback)
    /// </summary>
    private async Task<EmbeddingResponse> GenerateEmbeddingWithHttpAsync(
        string text,
        string effectiveModel,
        CancellationToken cancellationToken)
    {
        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);

            var url = $"{_settings.BaseUrl.TrimEnd('/')}/api/embed";

            var request = new OllamaEmbedRequest
            {
                Model = effectiveModel,
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
                "Generated Ollama embedding via HTTP. Model: {Model}, Dimensions: {Dimensions}",
                effectiveModel, embedding.Length);

            return new EmbeddingResponse
            {
                Success = true,
                Embedding = embedding.Select(v => (double)v).ToList(),
                Provider = ProviderName,
                Model = effectiveModel
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
        CancellationToken cancellationToken = default,
        int? customDimensions = null,
        string? modelOverride = null)
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

        // Determine effective model (override takes priority)
        var effectiveModel = !string.IsNullOrEmpty(modelOverride) ? modelOverride : _settings.Model;

        // Try SDK-based batch embedding first
        if (_useSdkEmbeddings && _defaultClient != null)
        {
            return await GenerateEmbeddingsWithSdkAsync(textList, effectiveModel, cancellationToken);
        }

        // Fall back to HTTP-based batch embedding
        return await GenerateEmbeddingsWithHttpAsync(textList, effectiveModel, cancellationToken);
    }

    /// <summary>
    /// Generate batch embeddings using OllamaSharp SDK
    /// </summary>
    private async Task<BatchEmbeddingResponse> GenerateEmbeddingsWithSdkAsync(
        List<string> texts,
        string effectiveModel,
        CancellationToken cancellationToken)
    {
        try
        {
            var client = GetClientForUrl(null);
            if (client == null)
            {
                return await GenerateEmbeddingsWithHttpAsync(texts, effectiveModel, cancellationToken);
            }

            // OllamaSharp's EmbedAsync supports multiple inputs
            var embedRequest = new OllamaSharp.Models.EmbedRequest
            {
                Model = effectiveModel,
                Input = texts.ToList()
            };
            var response = await client.EmbedAsync(embedRequest, cancellationToken);

            if (response?.Embeddings == null || response.Embeddings.Count == 0)
            {
                return new BatchEmbeddingResponse
                {
                    Success = false,
                    Error = "Ollama SDK returned empty batch embeddings",
                    Provider = ProviderName
                };
            }

            var embeddings = response.Embeddings
                .Select(e => e.Select(v => (double)v).ToList())
                .ToList();

            _logger.LogDebug(
                "Generated {Count} Ollama embeddings via SDK. Model: {Model}, Dimensions: {Dimensions}",
                embeddings.Count, effectiveModel, embeddings.FirstOrDefault()?.Count ?? 0);

            return new BatchEmbeddingResponse
            {
                Success = true,
                Embeddings = embeddings,
                Provider = ProviderName,
                Model = effectiveModel
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating batch embeddings from Ollama SDK, falling back to HTTP");
            return await GenerateEmbeddingsWithHttpAsync(texts, effectiveModel, cancellationToken);
        }
    }

    /// <summary>
    /// Generate batch embeddings using HTTP API (fallback)
    /// </summary>
    private async Task<BatchEmbeddingResponse> GenerateEmbeddingsWithHttpAsync(
        List<string> texts,
        string effectiveModel,
        CancellationToken cancellationToken)
    {
        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds * 2); // Longer timeout for batch

            var url = $"{_settings.BaseUrl.TrimEnd('/')}/api/embed";

            // Ollama's embed API supports array input
            var request = new OllamaEmbedBatchRequest
            {
                Model = effectiveModel,
                Input = texts.ToArray()
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
                "Generated {Count} Ollama embeddings via HTTP. Model: {Model}, Dimensions: {Dimensions}",
                embeddings.Count, effectiveModel, embeddings.FirstOrDefault()?.Count ?? 0);

            return new BatchEmbeddingResponse
            {
                Success = true,
                Embeddings = embeddings,
                Provider = ProviderName,
                Model = effectiveModel
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
