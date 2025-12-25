using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Embeddings.Models;
using SecondBrain.Application.Telemetry;

namespace SecondBrain.Application.Services.Embeddings;

/// <summary>
/// Decorator that adds caching to any embedding provider using HybridCache.
/// HybridCache provides two-tier caching (L1 memory + L2 distributed) with stampede protection.
/// Embeddings are deterministic for the same input, so caching significantly reduces API costs.
/// </summary>
public class CachedEmbeddingProvider : IEmbeddingProvider
{
    private readonly IEmbeddingProvider _innerProvider;
    private readonly HybridCache _cache;
    private readonly ILogger<CachedEmbeddingProvider> _logger;
    private readonly TimeSpan _localCacheExpiration;
    private readonly TimeSpan _distributedCacheExpiration;

    /// <summary>
    /// Cache key prefix to namespace embedding cache entries
    /// </summary>
    private const string CacheKeyPrefix = "embedding";

    public CachedEmbeddingProvider(
        IEmbeddingProvider innerProvider,
        HybridCache cache,
        ILogger<CachedEmbeddingProvider> logger,
        TimeSpan? localCacheExpiration = null,
        TimeSpan? distributedCacheExpiration = null)
    {
        _innerProvider = innerProvider ?? throw new ArgumentNullException(nameof(innerProvider));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _localCacheExpiration = localCacheExpiration ?? TimeSpan.FromMinutes(10);
        _distributedCacheExpiration = distributedCacheExpiration ?? TimeSpan.FromHours(24);
    }

    public string ProviderName => _innerProvider.ProviderName;
    public string ModelName => _innerProvider.ModelName;
    public bool IsEnabled => _innerProvider.IsEnabled;
    public int Dimensions => _innerProvider.Dimensions;

    public Task<IEnumerable<EmbeddingModelInfo>> GetAvailableModelsAsync(CancellationToken cancellationToken = default) 
        => _innerProvider.GetAvailableModelsAsync(cancellationToken);

    public async Task<EmbeddingResponse> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default,
        int? customDimensions = null,
        string? modelOverride = null)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return new EmbeddingResponse
            {
                Success = false,
                Error = "Text cannot be empty"
            };
        }

        // Include customDimensions and modelOverride in cache key to differentiate embeddings
        var cacheKey = GenerateCacheKey(text, customDimensions, modelOverride);
        var cacheHit = true;
        var stopwatch = Stopwatch.StartNew();
        var effectiveModel = !string.IsNullOrEmpty(modelOverride) ? modelOverride : ModelName;

        // HybridCache.GetOrCreateAsync handles stampede protection automatically
        // Multiple concurrent requests for the same key will share a single factory execution
        var response = await _cache.GetOrCreateAsync(
            cacheKey,
            async ct =>
            {
                cacheHit = false;
                _logger.LogDebug(
                    "Embedding cache miss. Provider: {Provider}, Model: {Model}, TextLength: {Length}, CustomDims: {Dims}",
                    ProviderName, effectiveModel, text.Length, customDimensions?.ToString() ?? "default");

                // Generate embedding from provider - pass customDimensions and modelOverride
                var result = await _innerProvider.GenerateEmbeddingAsync(text, ct, customDimensions, modelOverride);

                if (result.Success)
                {
                    _logger.LogDebug(
                        "Embedding cached. Provider: {Provider}, Model: {Model}, Dimensions: {Dimensions}, TokensUsed: {Tokens}",
                        ProviderName, effectiveModel, result.Embedding.Count, result.TokensUsed);
                }

                return result;
            },
            new HybridCacheEntryOptions
            {
                LocalCacheExpiration = _localCacheExpiration,
                Expiration = _distributedCacheExpiration
            },
            cancellationToken: cancellationToken);

        stopwatch.Stop();

        // Record telemetry
        if (cacheHit)
        {
            ApplicationTelemetry.RecordCacheHit("embedding");
            _logger.LogDebug(
                "Embedding cache hit. Provider: {Provider}, Model: {Model}, TextLength: {Length}",
                ProviderName, effectiveModel, text.Length);

            // Return a copy with zero tokens since no API call was made
            return new EmbeddingResponse
            {
                Success = response.Success,
                Embedding = new List<double>(response.Embedding),
                Error = response.Error,
                TokensUsed = 0, // No tokens used for cached response
                Provider = response.Provider,
                Model = response.Model
            };
        }
        else
        {
            ApplicationTelemetry.RecordCacheMiss("embedding");
            ApplicationTelemetry.RecordEmbeddingGeneration(ProviderName, stopwatch.ElapsedMilliseconds);
        }

        return response;
    }

    public async Task<BatchEmbeddingResponse> GenerateEmbeddingsAsync(
        IEnumerable<string> texts,
        CancellationToken cancellationToken = default,
        int? customDimensions = null,
        string? modelOverride = null)
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

        var effectiveModel = !string.IsNullOrEmpty(modelOverride) ? modelOverride : ModelName;
        var results = new List<List<double>>(textList.Count);
        var uncachedTexts = new List<(int Index, string Text)>();
        var totalTokensUsed = 0;
        var cacheHits = 0;

        // Check cache for each text (using GetOrCreateAsync for each to benefit from stampede protection)
        for (int i = 0; i < textList.Count; i++)
        {
            var text = textList[i];
            var cacheKey = GenerateCacheKey(text, customDimensions, modelOverride);
            var index = i; // Capture for closure

            // Use a local flag to track cache hits
            var wasHit = true;

            var cachedResponse = await _cache.GetOrCreateAsync(
                cacheKey,
                async ct =>
                {
                    wasHit = false;
                    return new EmbeddingResponse { Success = false }; // Placeholder for uncached
                },
                new HybridCacheEntryOptions
                {
                    LocalCacheExpiration = _localCacheExpiration,
                    Expiration = _distributedCacheExpiration
                },
                cancellationToken: cancellationToken);

            if (wasHit && cachedResponse?.Success == true)
            {
                results.Add(new List<double>(cachedResponse.Embedding));
                cacheHits++;
                _logger.LogDebug(
                    "Batch embedding cache hit for item {Index}. Provider: {Provider}, Model: {Model}",
                    i, ProviderName, effectiveModel);
            }
            else
            {
                uncachedTexts.Add((i, text));
                results.Add(new List<double>()); // Placeholder
            }
        }

        // Record cache metrics
        for (int i = 0; i < cacheHits; i++)
            ApplicationTelemetry.RecordCacheHit("embedding");
        for (int i = 0; i < uncachedTexts.Count; i++)
            ApplicationTelemetry.RecordCacheMiss("embedding");

        // If all cached, return immediately
        if (!uncachedTexts.Any())
        {
            _logger.LogInformation(
                "All {Count} embeddings served from cache. Provider: {Provider}, Model: {Model}",
                textList.Count, ProviderName, effectiveModel);

            return new BatchEmbeddingResponse
            {
                Success = true,
                Embeddings = results,
                TotalTokensUsed = 0,
                Provider = ProviderName,
                Model = effectiveModel
            };
        }

        _logger.LogDebug(
            "Batch embedding: {CachedCount} cached, {UncachedCount} need generation. Provider: {Provider}, Model: {Model}",
            textList.Count - uncachedTexts.Count, uncachedTexts.Count, ProviderName, effectiveModel);

        // Generate embeddings for uncached texts - pass customDimensions and modelOverride
        var stopwatch = Stopwatch.StartNew();
        var uncachedTextsList = uncachedTexts.Select(x => x.Text).ToList();
        var batchResponse = await _innerProvider.GenerateEmbeddingsAsync(uncachedTextsList, cancellationToken, customDimensions, modelOverride);
        stopwatch.Stop();

        ApplicationTelemetry.RecordEmbeddingGeneration(ProviderName, stopwatch.ElapsedMilliseconds, uncachedTextsList.Count);

        if (!batchResponse.Success)
        {
            return batchResponse;
        }

        // Validate that the provider returned the expected number of embeddings
        if (batchResponse.Embeddings.Count != uncachedTextsList.Count)
        {
            _logger.LogError(
                "Embedding count mismatch. Expected: {Expected}, Received: {Received}. Provider: {Provider}",
                uncachedTextsList.Count, batchResponse.Embeddings.Count, ProviderName);

            return new BatchEmbeddingResponse
            {
                Success = false,
                Error = $"Provider returned {batchResponse.Embeddings.Count} embeddings but {uncachedTextsList.Count} were requested",
                Provider = ProviderName
            };
        }

        totalTokensUsed = batchResponse.TotalTokensUsed;

        // Cache and populate results
        for (int i = 0; i < uncachedTexts.Count; i++)
        {
            var (originalIndex, text) = uncachedTexts[i];
            var embedding = batchResponse.Embeddings[i];

            // Update result
            results[originalIndex] = embedding;

            // Cache individual embedding using SetAsync - include customDimensions and modelOverride in key
            var cacheKey = GenerateCacheKey(text, customDimensions, modelOverride);
            var embeddingResponse = new EmbeddingResponse
            {
                Success = true,
                Embedding = embedding,
                Provider = ProviderName,
                Model = batchResponse.Model ?? effectiveModel,
                TokensUsed = 0 // Token count is for the batch, not individual
            };

            await _cache.SetAsync(
                cacheKey,
                embeddingResponse,
                new HybridCacheEntryOptions
                {
                    LocalCacheExpiration = _localCacheExpiration,
                    Expiration = _distributedCacheExpiration
                },
                cancellationToken: cancellationToken);
        }

        return new BatchEmbeddingResponse
        {
            Success = true,
            Embeddings = results,
            TotalTokensUsed = totalTokensUsed,
            Provider = ProviderName,
            Model = batchResponse.Model ?? effectiveModel
        };
    }

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        return _innerProvider.IsAvailableAsync(cancellationToken);
    }

    /// <summary>
    /// Generates a cache key based on text content, provider, model, custom dimensions, and model override.
    /// Uses SHA256 hash to ensure consistent, safe cache keys.
    /// </summary>
    private string GenerateCacheKey(string text, int? customDimensions = null, string? modelOverride = null)
    {
        // Include customDimensions and modelOverride in key to differentiate embeddings
        var effectiveModel = !string.IsNullOrEmpty(modelOverride) ? modelOverride : ModelName;
        var dimsKey = customDimensions?.ToString() ?? "default";
        var keyInput = $"{ProviderName}:{effectiveModel}:{dimsKey}:{text}";
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(keyInput));
        var hashString = Convert.ToBase64String(hashBytes);

        return $"{CacheKeyPrefix}:{hashString}";
    }
}
