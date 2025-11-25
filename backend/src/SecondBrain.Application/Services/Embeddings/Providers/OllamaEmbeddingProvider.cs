using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OllamaSharp;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings.Models;

namespace SecondBrain.Application.Services.Embeddings.Providers;

public class OllamaEmbeddingProvider : IEmbeddingProvider
{
    private readonly OllamaEmbeddingSettings _settings;
    private readonly ILogger<OllamaEmbeddingProvider> _logger;
    private readonly OllamaApiClient? _client;

    public string ProviderName => "Ollama";
    public string ModelName => _settings.Model;
    public bool IsEnabled => _settings.Enabled;
    public int Dimensions => _settings.Dimensions;

    public OllamaEmbeddingProvider(
        IOptions<EmbeddingProvidersSettings> settings,
        ILogger<OllamaEmbeddingProvider> logger)
    {
        _settings = settings.Value.Ollama;
        _logger = logger;

        if (IsEnabled)
        {
            try
            {
                _client = new OllamaApiClient(_settings.BaseUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Ollama embedding client");
            }
        }
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
            // Note: OllamaSharp embedding API needs to be updated based on library version
            _logger.LogWarning("Ollama embedding generation requires specific library setup");
            
            return new EmbeddingResponse
            {
                Success = false,
                Error = "Ollama embedding provider needs additional configuration. Use OpenAI for now.",
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
        if (!IsEnabled || _client == null)
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
            _logger.LogWarning("Ollama batch embedding generation requires specific library setup");
            
            return new BatchEmbeddingResponse
            {
                Success = false,
                Error = "Ollama embedding provider needs additional configuration. Use OpenAI for now.",
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
        if (!IsEnabled || _client == null)
        {
            return false;
        }

        try
        {
            var models = await _client.ListLocalModels();
            return models.Any(m => m.Name.Contains(_settings.Model));
        }
        catch
        {
            return false;
        }
    }
}

