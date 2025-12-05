using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SecondBrain.Application.Services.Embeddings;

/// <summary>
/// Factory that creates cached embedding providers by decorating the underlying providers with HybridCache.
/// Maintains a pool of cached providers to ensure consistent caching behavior.
/// HybridCache provides two-tier caching with stampede protection.
/// </summary>
public class CachedEmbeddingProviderFactory : IEmbeddingProviderFactory
{
    private readonly IEmbeddingProviderFactory _innerFactory;
    private readonly HybridCache _cache;
    private readonly ILogger<CachedEmbeddingProvider> _logger;
    private readonly CachedEmbeddingSettings _settings;
    private readonly ConcurrentDictionary<string, CachedEmbeddingProvider> _cachedProviders;

    public CachedEmbeddingProviderFactory(
        IEmbeddingProviderFactory innerFactory,
        HybridCache cache,
        ILogger<CachedEmbeddingProvider> logger,
        IOptions<CachedEmbeddingSettings> settings)
    {
        _innerFactory = innerFactory ?? throw new ArgumentNullException(nameof(innerFactory));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _settings = settings?.Value ?? new CachedEmbeddingSettings();
        _cachedProviders = new ConcurrentDictionary<string, CachedEmbeddingProvider>(StringComparer.OrdinalIgnoreCase);
    }

    public IEmbeddingProvider GetProvider(string providerName)
    {
        if (!_settings.EnableCaching)
        {
            return _innerFactory.GetProvider(providerName);
        }

        return _cachedProviders.GetOrAdd(providerName, name =>
        {
            var innerProvider = _innerFactory.GetProvider(name);
            var localExpiration = TimeSpan.FromMinutes(_settings.LocalCacheMinutes);
            var distributedExpiration = TimeSpan.FromHours(_settings.CacheDurationHours);

            _logger.LogInformation(
                "Creating cached embedding provider with HybridCache. Provider: {Provider}, Model: {Model}, LocalCache: {Local}m, DistributedCache: {Distributed}h",
                innerProvider.ProviderName, innerProvider.ModelName, _settings.LocalCacheMinutes, _settings.CacheDurationHours);

            return new CachedEmbeddingProvider(
                innerProvider,
                _cache,
                _logger,
                localExpiration,
                distributedExpiration);
        });
    }

    public IEmbeddingProvider GetDefaultProvider()
    {
        if (!_settings.EnableCaching)
        {
            return _innerFactory.GetDefaultProvider();
        }

        var defaultProvider = _innerFactory.GetDefaultProvider();
        return GetProvider(defaultProvider.ProviderName);
    }

    public IEnumerable<IEmbeddingProvider> GetAllProviders()
    {
        if (!_settings.EnableCaching)
        {
            return _innerFactory.GetAllProviders();
        }

        return _innerFactory.GetAllProviders().Select(p => GetProvider(p.ProviderName));
    }
}

/// <summary>
/// Configuration settings for embedding caching
/// </summary>
public class CachedEmbeddingSettings
{
    public const string SectionName = "EmbeddingCache";

    /// <summary>
    /// Whether to enable embedding caching. Default is true.
    /// </summary>
    public bool EnableCaching { get; set; } = true;

    /// <summary>
    /// How long to cache embeddings in hours (distributed/L2 cache). Default is 24 hours.
    /// </summary>
    public int CacheDurationHours { get; set; } = 24;

    /// <summary>
    /// How long to cache embeddings in local memory (L1 cache) in minutes. Default is 10 minutes.
    /// Local cache is faster but limited in size.
    /// </summary>
    public int LocalCacheMinutes { get; set; } = 10;

    /// <summary>
    /// Maximum memory size for the local cache in megabytes. Default is 100 MB.
    /// </summary>
    public int MaxMemorySizeMB { get; set; } = 100;
}
