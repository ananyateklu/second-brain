using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Embeddings;
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
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize OpenAI embedding client");
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

