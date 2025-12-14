using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Embeddings;
using OpenAI.Models;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings.Interfaces;
using SecondBrain.Application.Services.Embeddings.Models;

namespace SecondBrain.Application.Services.Embeddings.Providers;

public class OpenAIEmbeddingProvider : IEmbeddingProvider
{
    private readonly OpenAIEmbeddingSettings _settings;
    private readonly ILogger<OpenAIEmbeddingProvider> _logger;
    private readonly IOpenAIEmbeddingClientFactory _clientFactory;
    private readonly EmbeddingClient? _client;
    private readonly OpenAIClient? _openAIClient;

    // Cache for available models (models don't change frequently)
    private List<EmbeddingModelInfo>? _cachedModels;
    private DateTime _modelsCacheExpiry = DateTime.MinValue;
    private static readonly TimeSpan ModelsCacheDuration = TimeSpan.FromMinutes(30);

    // Known embedding model default dimensions (OpenAI API doesn't expose this)
    private static readonly Dictionary<string, int> KnownModelDimensions = new(StringComparer.OrdinalIgnoreCase)
    {
        { "text-embedding-3-small", 1536 },
        { "text-embedding-3-large", 3072 },
        { "text-embedding-ada-002", 1536 },
    };

    // Models that support custom dimensions (256-3072 for small, 256-3072 for large)
    private static readonly HashSet<string> ModelsWithCustomDimensions = new(StringComparer.OrdinalIgnoreCase)
    {
        "text-embedding-3-small",
        "text-embedding-3-large"
    };

    // Fallback models if API fails
    private static readonly EmbeddingModelInfo[] FallbackModels =
    [
        new EmbeddingModelInfo
        {
            ModelId = "text-embedding-3-small",
            DisplayName = "Text Embedding 3 Small",
            Dimensions = 1536,
            Description = "Most capable small embedding model, best for most use cases",
            IsDefault = true
        },
        new EmbeddingModelInfo
        {
            ModelId = "text-embedding-3-large",
            DisplayName = "Text Embedding 3 Large",
            Dimensions = 3072,
            Description = "Larger embedding model with higher accuracy but more expensive"
        }
    ];

    public string ProviderName => "OpenAI";
    public string ModelName => _settings.Model;
    public bool IsEnabled => _settings.Enabled && !string.IsNullOrEmpty(_settings.ApiKey);
    public int Dimensions => _settings.Dimensions;

    public OpenAIEmbeddingProvider(
        IOptions<EmbeddingProvidersSettings> settings,
        IOpenAIEmbeddingClientFactory clientFactory,
        ILogger<OpenAIEmbeddingProvider> logger)
    {
        _settings = settings.Value.OpenAI;
        _clientFactory = clientFactory;
        _logger = logger;

        if (IsEnabled && !string.IsNullOrEmpty(_settings.ApiKey))
        {
            _client = _clientFactory.CreateClient(_settings.ApiKey!, _settings.Model);
            _openAIClient = new OpenAIClient(_settings.ApiKey!);
        }
    }

    public async Task<IEnumerable<EmbeddingModelInfo>> GetAvailableModelsAsync(CancellationToken cancellationToken = default)
    {
        // Return cached models if still valid
        if (_cachedModels != null && DateTime.UtcNow < _modelsCacheExpiry)
        {
            return _cachedModels;
        }

        if (!IsEnabled || _openAIClient == null)
        {
            _logger.LogDebug("OpenAI provider not enabled, returning fallback models");
            return FallbackModels;
        }

        try
        {
            var modelClient = _openAIClient.GetOpenAIModelClient();
            var modelsResponse = await modelClient.GetModelsAsync(cancellationToken);

            var embeddingModels = new List<EmbeddingModelInfo>();
            var defaultModel = _settings.Model;

            foreach (var model in modelsResponse.Value)
            {
                // Filter for embedding models (models with "embedding" in the name)
                if (model.Id.Contains("embedding", StringComparison.OrdinalIgnoreCase))
                {
                    // Look up dimensions from known models
                    var dimensions = KnownModelDimensions.TryGetValue(model.Id, out var dims) ? dims : 0;

                    // Skip models we don't know the dimensions for
                    if (dimensions == 0)
                    {
                        _logger.LogDebug("Skipping embedding model {ModelId} - unknown dimensions", model.Id);
                        continue;
                    }

                    embeddingModels.Add(new EmbeddingModelInfo
                    {
                        ModelId = model.Id,
                        DisplayName = FormatModelDisplayName(model.Id),
                        Dimensions = dimensions,
                        Description = GetModelDescription(model.Id),
                        IsDefault = model.Id.Equals(defaultModel, StringComparison.OrdinalIgnoreCase)
                    });
                }
            }

            // Sort by model name, with newest first
            embeddingModels = embeddingModels
                .OrderByDescending(m => m.ModelId.Contains("3-large"))
                .ThenByDescending(m => m.ModelId.Contains("3-small"))
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

            _logger.LogInformation("Fetched {Count} embedding models from OpenAI API", embeddingModels.Count);
            return _cachedModels;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch models from OpenAI API, using fallback models");
            return FallbackModels;
        }
    }

    private static string FormatModelDisplayName(string modelId)
    {
        return modelId switch
        {
            "text-embedding-3-small" => "Text Embedding 3 Small",
            "text-embedding-3-large" => "Text Embedding 3 Large",
            "text-embedding-ada-002" => "Ada 002 (Legacy)",
            _ => modelId.Replace("-", " ").Replace("text embedding", "Text Embedding")
        };
    }

    private static string? GetModelDescription(string modelId)
    {
        return modelId switch
        {
            "text-embedding-3-small" => "Most capable small embedding model, best for most use cases",
            "text-embedding-3-large" => "Larger embedding model with higher accuracy but more expensive",
            "text-embedding-ada-002" => "Legacy model, use text-embedding-3-small instead",
            _ => null
        };
    }

    public async Task<EmbeddingResponse> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _client == null)
        {
            return new EmbeddingResponse
            {
                Success = false,
                Error = "OpenAI embedding provider is not enabled or configured",
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
            // Create options with custom dimensions support for text-embedding-3 models
            var options = CreateEmbeddingOptions();

            // Use batch method to get token usage (single embedding doesn't provide usage in SDK)
            var textList = new List<string> { text };
            var response = await _client.GenerateEmbeddingsAsync(textList, options, cancellationToken);

            if (response.Value.Count == 0)
            {
                return new EmbeddingResponse
                {
                    Success = false,
                    Error = "No embedding returned from OpenAI",
                    Provider = ProviderName
                };
            }

            var floats = response.Value[0].ToFloats();
            var embedding = new List<double>();
            foreach (var f in floats.Span)
            {
                embedding.Add((double)f);
            }

            // Extract token usage from the batch response (available on EmbeddingCollection)
            var tokensUsed = response.Value.Usage?.InputTokenCount ?? 0;

            if (tokensUsed > 0)
            {
                _logger.LogDebug("OpenAI embedding generated: {Dimensions} dimensions, {Tokens} tokens used",
                    embedding.Count, tokensUsed);
            }

            return new EmbeddingResponse
            {
                Success = true,
                Embedding = embedding,
                TokensUsed = tokensUsed,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating embedding from OpenAI");
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
        if (!IsEnabled || _client == null)
        {
            return new BatchEmbeddingResponse
            {
                Success = false,
                Error = "OpenAI embedding provider is not enabled or configured",
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
            // Create options with custom dimensions support for text-embedding-3 models
            var options = CreateEmbeddingOptions();

            var response = await _client.GenerateEmbeddingsAsync(textList, options, cancellationToken);
            var embeddings = new List<List<double>>();

            foreach (var embeddingItem in response.Value)
            {
                var floats = embeddingItem.ToFloats();
                var embedding = new List<double>();
                foreach (var f in floats.Span)
                {
                    embedding.Add((double)f);
                }
                embeddings.Add(embedding);
            }

            // Extract total token usage from the SDK response
            var totalTokensUsed = response.Value.Usage?.InputTokenCount ?? 0;

            if (totalTokensUsed > 0)
            {
                _logger.LogDebug("OpenAI batch embeddings generated: {Count} embeddings, {Tokens} total tokens used",
                    embeddings.Count, totalTokensUsed);
            }

            return new BatchEmbeddingResponse
            {
                Success = true,
                Embeddings = embeddings,
                TotalTokensUsed = totalTokensUsed,
                Provider = ProviderName
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating batch embeddings from OpenAI");
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
        if (!IsEnabled || _client == null)
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
    /// Creates embedding generation options with custom dimensions support.
    /// Only text-embedding-3-small and text-embedding-3-large support custom dimensions (256-3072).
    /// </summary>
    private EmbeddingGenerationOptions? CreateEmbeddingOptions()
    {
        // Only set custom dimensions for models that support it
        if (_settings.Dimensions > 0 &&
            ModelsWithCustomDimensions.Contains(_settings.Model))
        {
            var options = new EmbeddingGenerationOptions
            {
                Dimensions = _settings.Dimensions
            };

            _logger.LogDebug("Using custom embedding dimensions: {Dimensions} for model {Model}",
                _settings.Dimensions, _settings.Model);

            return options;
        }

        return null;
    }

    /// <summary>
    /// Checks if the configured model supports custom dimensions.
    /// </summary>
    public bool SupportsCustomDimensions => ModelsWithCustomDimensions.Contains(_settings.Model);

    /// <summary>
    /// Gets the valid dimension range for the configured model.
    /// Returns null if custom dimensions are not supported.
    /// </summary>
    public (int min, int max)? GetValidDimensionRange()
    {
        if (!ModelsWithCustomDimensions.Contains(_settings.Model))
            return null;

        // text-embedding-3 models support dimensions from 256 to their default max
        var maxDimensions = _settings.Model.Contains("large", StringComparison.OrdinalIgnoreCase) ? 3072 : 1536;
        return (256, maxDimensions);
    }
}

