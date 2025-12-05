using Microsoft.AspNetCore.OutputCaching;

namespace SecondBrain.API.Caching;

/// <summary>
/// Service interface for invalidating output cache entries
/// </summary>
public interface ICacheInvalidator
{
    /// <summary>
    /// Invalidates all cached notes for a user
    /// </summary>
    Task InvalidateNotesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidates all cached statistics
    /// </summary>
    Task InvalidateStatsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidates all cached RAG analytics
    /// </summary>
    Task InvalidateRagAnalyticsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidates all cached AI health data
    /// </summary>
    Task InvalidateAIHealthAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidates all cached indexing data
    /// </summary>
    Task InvalidateIndexingAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidates all caches (use sparingly)
    /// </summary>
    Task InvalidateAllAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Implementation of cache invalidator using ASP.NET Core Output Caching
/// </summary>
public class OutputCacheInvalidator : ICacheInvalidator
{
    private readonly IOutputCacheStore _store;
    private readonly ILogger<OutputCacheInvalidator> _logger;

    public OutputCacheInvalidator(IOutputCacheStore store, ILogger<OutputCacheInvalidator> logger)
    {
        _store = store;
        _logger = logger;
    }

    public async Task InvalidateNotesAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Invalidating notes cache");
        await _store.EvictByTagAsync("notes", cancellationToken);
    }

    public async Task InvalidateStatsAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Invalidating stats cache");
        await _store.EvictByTagAsync("stats", cancellationToken);
    }

    public async Task InvalidateRagAnalyticsAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Invalidating RAG analytics cache");
        await _store.EvictByTagAsync("rag-analytics", cancellationToken);
    }

    public async Task InvalidateAIHealthAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Invalidating AI health cache");
        await _store.EvictByTagAsync("ai-health", cancellationToken);
    }

    public async Task InvalidateIndexingAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Invalidating indexing cache");
        await _store.EvictByTagAsync("indexing", cancellationToken);
    }

    public async Task InvalidateAllAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Invalidating all output caches");

        await Task.WhenAll(
            InvalidateNotesAsync(cancellationToken),
            InvalidateStatsAsync(cancellationToken),
            InvalidateRagAnalyticsAsync(cancellationToken),
            InvalidateAIHealthAsync(cancellationToken),
            InvalidateIndexingAsync(cancellationToken)
        );
    }
}
