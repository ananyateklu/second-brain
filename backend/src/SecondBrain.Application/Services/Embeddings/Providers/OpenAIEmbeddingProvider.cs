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

    // Known embedding model dimensions (OpenAI API doesn't expose this)
    private static readonly Dictionary<string, int> KnownModelDimensions = new(StringComparer.OrdinalIgnoreCase)
    {
        { "text-embedding-3-small", 1536 },
        { "text-embedding-3-large", 3072 },
        { "text-embedding-ada-002", 1536 },
    };

    // Fallback models if API fails
    private static readonly EmbeddingModelInfo[] FallbackModels = new[]
    {
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
        },
        new EmbeddingModelInfo
        {
            ModelId = "text-embedding-ada-002",
            DisplayName = "Ada 002 (Legacy)",
            Dimensions = 1536,
            Description = "Legacy model, use text-embedding-3-small instead"
        }
    };

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
            try
            {
                _client = _clientFactory.CreateClient(_settings.ApiKey!, _settings.Model);
                _openAIClient = new OpenAIClient(_settings.ApiKey!);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize OpenAI embedding client");
            }
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
            var response = await _client.GenerateEmbeddingAsync(text, cancellationToken: cancellationToken);
            var floats = response.Value.ToFloats();
            var embedding = new List<double>();
            foreach (var f in floats.Span)
            {
                embedding.Add((double)f);
            }

            return new EmbeddingResponse
            {
                Success = true,
                Embedding = embedding,
                TokensUsed = 0, // Token usage not readily available in this SDK version
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
            var response = await _client.GenerateEmbeddingsAsync(textList, cancellationToken: cancellationToken);
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

            return new BatchEmbeddingResponse
            {
                Success = true,
                Embeddings = embeddings,
                TotalTokensUsed = 0, // Token usage not readily available in this SDK version
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
}

