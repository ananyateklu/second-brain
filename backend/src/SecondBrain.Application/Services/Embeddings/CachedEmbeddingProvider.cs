using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Embeddings.Models;

namespace SecondBrain.Application.Services.Embeddings;

/// <summary>
/// Decorator that adds caching to any embedding provider.
/// Embeddings are deterministic for the same input, so caching significantly reduces API costs.
/// </summary>
public class CachedEmbeddingProvider : IEmbeddingProvider
{
    private readonly IEmbeddingProvider _innerProvider;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CachedEmbeddingProvider> _logger;
    private readonly TimeSpan _cacheDuration;

    /// <summary>
    /// Cache key prefix to namespace embedding cache entries
    /// </summary>
    private const string CacheKeyPrefix = "embedding";

    public CachedEmbeddingProvider(
        IEmbeddingProvider innerProvider,
        IMemoryCache cache,
        ILogger<CachedEmbeddingProvider> logger,
        TimeSpan? cacheDuration = null)
    {
        _innerProvider = innerProvider ?? throw new ArgumentNullException(nameof(innerProvider));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _cacheDuration = cacheDuration ?? TimeSpan.FromHours(24); // Default 24 hours
    }

    public string ProviderName => _innerProvider.ProviderName;
    public string ModelName => _innerProvider.ModelName;
    public bool IsEnabled => _innerProvider.IsEnabled;
    public int Dimensions => _innerProvider.Dimensions;

    public async Task<EmbeddingResponse> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return new EmbeddingResponse
            {
                Success = false,
                Error = "Text cannot be empty"
            };
        }

        var cacheKey = GenerateCacheKey(text);

        // Try to get from cache
        if (_cache.TryGetValue<EmbeddingResponse>(cacheKey, out var cachedResponse) && cachedResponse != null)
        {
            _logger.LogDebug(
                "Embedding cache hit. Provider: {Provider}, Model: {Model}, TextLength: {Length}",
                ProviderName, ModelName, text.Length);

            // Return a copy to prevent cache mutation
            return new EmbeddingResponse
            {
                Success = cachedResponse.Success,
                Embedding = new List<double>(cachedResponse.Embedding),
                Error = cachedResponse.Error,
                TokensUsed = 0, // No tokens used for cached response
                Provider = cachedResponse.Provider
            };
        }

        _logger.LogDebug(
            "Embedding cache miss. Provider: {Provider}, Model: {Model}, TextLength: {Length}",
            ProviderName, ModelName, text.Length);

        // Generate embedding from provider
        var response = await _innerProvider.GenerateEmbeddingAsync(text, cancellationToken);

        // Cache successful responses
        if (response.Success)
        {
            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = _cacheDuration,
                Size = response.Embedding.Count * sizeof(double) + text.Length // Approximate memory size
            };

            _cache.Set(cacheKey, response, cacheOptions);

            _logger.LogDebug(
                "Embedding cached. Provider: {Provider}, Model: {Model}, Dimensions: {Dimensions}, TokensUsed: {Tokens}",
                ProviderName, ModelName, response.Embedding.Count, response.TokensUsed);
        }

        return response;
    }

    public async Task<BatchEmbeddingResponse> GenerateEmbeddingsAsync(
        IEnumerable<string> texts,
        CancellationToken cancellationToken = default)
    {
        var textList = texts.ToList();
        if (!textList.Any())
        {
            return new BatchEmbeddingResponse
            {
                Success = true,
                Embeddings = new List<List<double>>(),
                Provider = ProviderName
            };
        }

        var results = new List<List<double>>(textList.Count);
        var uncachedTexts = new List<(int Index, string Text)>();
        var totalTokensUsed = 0;

        // Check cache for each text
        for (int i = 0; i < textList.Count; i++)
        {
            var text = textList[i];
            var cacheKey = GenerateCacheKey(text);

            if (_cache.TryGetValue<EmbeddingResponse>(cacheKey, out var cached) && cached?.Success == true)
            {
                results.Add(new List<double>(cached.Embedding));
                _logger.LogDebug(
                    "Batch embedding cache hit for item {Index}. Provider: {Provider}",
                    i, ProviderName);
            }
            else
            {
                uncachedTexts.Add((i, text));
                results.Add(new List<double>()); // Placeholder
            }
        }

        // If all cached, return immediately
        if (!uncachedTexts.Any())
        {
            _logger.LogInformation(
                "All {Count} embeddings served from cache. Provider: {Provider}",
                textList.Count, ProviderName);

            return new BatchEmbeddingResponse
            {
                Success = true,
                Embeddings = results,
                TotalTokensUsed = 0,
                Provider = ProviderName
            };
        }

        _logger.LogDebug(
            "Batch embedding: {CachedCount} cached, {UncachedCount} need generation. Provider: {Provider}",
            textList.Count - uncachedTexts.Count, uncachedTexts.Count, ProviderName);

        // Generate embeddings for uncached texts
        var uncachedTextsList = uncachedTexts.Select(x => x.Text).ToList();
        var batchResponse = await _innerProvider.GenerateEmbeddingsAsync(uncachedTextsList, cancellationToken);

        if (!batchResponse.Success)
        {
            return batchResponse;
        }

        totalTokensUsed = batchResponse.TotalTokensUsed;

        // Cache and populate results
        for (int i = 0; i < uncachedTexts.Count; i++)
        {
            var (originalIndex, text) = uncachedTexts[i];
            var embedding = batchResponse.Embeddings[i];

            // Update result
            results[originalIndex] = embedding;

            // Cache individual embedding
            var cacheKey = GenerateCacheKey(text);
            var embeddingResponse = new EmbeddingResponse
            {
                Success = true,
                Embedding = embedding,
                Provider = ProviderName,
                TokensUsed = 0 // Token count is for the batch, not individual
            };

            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = _cacheDuration,
                Size = embedding.Count * sizeof(double) + text.Length
            };

            _cache.Set(cacheKey, embeddingResponse, cacheOptions);
        }

        return new BatchEmbeddingResponse
        {
            Success = true,
            Embeddings = results,
            TotalTokensUsed = totalTokensUsed,
            Provider = ProviderName
        };
    }

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        return _innerProvider.IsAvailableAsync(cancellationToken);
    }

    /// <summary>
    /// Generates a cache key based on text content, provider, and model.
    /// Uses SHA256 hash to ensure consistent, safe cache keys.
    /// </summary>
    private string GenerateCacheKey(string text)
    {
        var keyInput = $"{ProviderName}:{ModelName}:{text}";
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(keyInput));
        var hashString = Convert.ToBase64String(hashBytes);

        return $"{CacheKeyPrefix}:{hashString}";
    }
}
