using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings.Models;

namespace SecondBrain.Application.Services.Embeddings.Providers;

public class PineconeEmbeddingProvider : IEmbeddingProvider
{
    private readonly PineconeSettings _settings;
    private readonly HttpClient _httpClient;
    private readonly ILogger<PineconeEmbeddingProvider> _logger;

    public string ProviderName => "Pinecone";
    public string ModelName => _settings.Model;
    public bool IsEnabled => !string.IsNullOrEmpty(_settings.ApiKey);

    // Updated to support text-embedding-3-small (1536 dimensions)
    // Pinecone can use various embedding models with different dimensions
    public int Dimensions => _settings.Dimensions;

    /// <summary>
    /// Available Pinecone inference API embedding models.
    /// Pinecone's inference API has a fixed set of models.
    /// </summary>
    private static readonly EmbeddingModelInfo[] AvailableModels = new[]
    {
        new EmbeddingModelInfo
        {
            ModelId = "multilingual-e5-large",
            DisplayName = "Multilingual E5 Large",
            Dimensions = 1024,
            Description = "Pinecone's multilingual embedding model",
            IsDefault = true
        }
    };

    public Task<IEnumerable<EmbeddingModelInfo>> GetAvailableModelsAsync(CancellationToken cancellationToken = default) 
        => Task.FromResult<IEnumerable<EmbeddingModelInfo>>(AvailableModels);

    public PineconeEmbeddingProvider(
        IOptions<PineconeSettings> settings,
        IHttpClientFactory httpClientFactory,
        ILogger<PineconeEmbeddingProvider> logger)
    {
        _settings = settings.Value;
        _httpClient = httpClientFactory.CreateClient();
        _logger = logger;
    }

    public async Task<EmbeddingResponse> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default,
        int? customDimensions = null,
        string? modelOverride = null)
    {
        try
        {
            // Determine effective model (override takes priority)
            var effectiveModel = !string.IsNullOrEmpty(modelOverride) ? modelOverride : _settings.Model;

            var request = new
            {
                model = effectiveModel,
                inputs = new[] { new { text = text } },
                parameters = new { input_type = "passage", truncate = "END" }
            };

            var response = await SendRequestAsync(request, cancellationToken);

            var firstEmbedding = response.Data.FirstOrDefault();
            if (firstEmbedding == null)
            {
                return new EmbeddingResponse { Success = false, Error = "No embedding returned", Provider = ProviderName };
            }

            return new EmbeddingResponse
            {
                Success = true,
                Embedding = firstEmbedding.Values,
                Provider = ProviderName,
                TokensUsed = response.Usage?.TotalTokens ?? 0,
                Model = effectiveModel
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating embedding from Pinecone");
            return new EmbeddingResponse { Success = false, Error = ex.Message, Provider = ProviderName };
        }
    }

    public async Task<BatchEmbeddingResponse> GenerateEmbeddingsAsync(
        IEnumerable<string> texts,
        CancellationToken cancellationToken = default,
        int? customDimensions = null,
        string? modelOverride = null)
    {
        try
        {
            // Determine effective model (override takes priority)
            var effectiveModel = !string.IsNullOrEmpty(modelOverride) ? modelOverride : _settings.Model;

            var inputs = texts.Select(t => new { text = t }).ToArray();
            var request = new
            {
                model = effectiveModel,
                inputs = inputs,
                parameters = new { input_type = "passage", truncate = "END" }
            };

            var response = await SendRequestAsync(request, cancellationToken);

            var embeddings = response.Data
                .OrderBy(d => d.Index) // Ensure order matches input if API doesn't guarantee
                .Select(d => d.Values)
                .ToList();

            return new BatchEmbeddingResponse
            {
                Success = true,
                Embeddings = embeddings,
                TotalTokensUsed = response.Usage?.TotalTokens ?? 0,
                Provider = ProviderName,
                Model = effectiveModel
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating batch embeddings from Pinecone");
            return new BatchEmbeddingResponse { Success = false, Error = ex.Message, Provider = ProviderName };
        }
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled) return false;
        try
        {
            await GenerateEmbeddingAsync("test", cancellationToken);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task<PineconeEmbedResponse> SendRequestAsync(object payload, CancellationToken cancellationToken)
    {
        using var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.pinecone.io/embed");
        requestMessage.Headers.Add("Api-Key", _settings.ApiKey);
        requestMessage.Headers.Add("X-Pinecone-API-Version", "2024-10");
        requestMessage.Content = JsonContent.Create(payload);

        using var response = await _httpClient.SendAsync(requestMessage, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException($"Pinecone API error: {response.StatusCode} - {error}");
        }

        var result = await response.Content.ReadFromJsonAsync<PineconeEmbedResponse>(cancellationToken: cancellationToken);
        return result ?? throw new Exception("Empty response from Pinecone API");
    }

    private class PineconeEmbedResponse
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public List<PineconeEmbeddingData> Data { get; set; } = new();

        [JsonPropertyName("usage")]
        public PineconeUsage? Usage { get; set; }
    }

    private class PineconeEmbeddingData
    {
        [JsonPropertyName("values")]
        public List<double> Values { get; set; } = new();

        [JsonPropertyName("index")]
        public int Index { get; set; }
    }

    private class PineconeUsage
    {
        [JsonPropertyName("total_tokens")]
        public int TotalTokens { get; set; }
    }
}

