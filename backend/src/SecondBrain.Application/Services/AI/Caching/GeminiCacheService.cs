using Google.GenAI;
using Google.GenAI.Types;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using System.Security.Cryptography;
using System.Text;

namespace SecondBrain.Application.Services.AI.Caching;

/// <summary>
/// Service for managing Gemini context caches using the Google GenAI SDK.
/// Provides caching of large contexts to reduce latency and costs.
/// </summary>
public class GeminiCacheService : IGeminiCacheService
{
    private readonly Client? _client;
    private readonly GeminiSettings _settings;
    private readonly IGeminiCacheRepository _repository;
    private readonly ILogger<GeminiCacheService> _logger;

    public GeminiCacheService(
        IOptions<AIProvidersSettings> settings,
        IGeminiCacheRepository repository,
        ILogger<GeminiCacheService> logger)
    {
        _settings = settings.Value.Gemini;
        _repository = repository;
        _logger = logger;

        if (_settings.Enabled && !string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            try
            {
                _client = new Client(apiKey: _settings.ApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize Google Gemini client for caching");
            }
        }
    }

    public bool IsContextCachingEnabled()
    {
        return _settings.Enabled &&
               _settings.Features.EnableContextCaching &&
               _client != null;
    }

    public async Task<GeminiCacheEntry?> CreateCacheAsync(
        CreateGeminiCacheRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsContextCachingEnabled() || _client == null)
        {
            _logger.LogWarning("Context caching is not enabled or client is not initialized");
            return null;
        }

        try
        {
            var ttlMinutes = request.TtlMinutes ?? _settings.Caching.DefaultTtlMinutes;
            ttlMinutes = Math.Min(ttlMinutes, _settings.Caching.MaxTtlMinutes);
            var ttlSeconds = ttlMinutes * 60;

            var contentHash = CalculateContentHash(request.Content, request.SystemInstruction);

            // Build the cache configuration
            var config = new CreateCachedContentConfig
            {
                Contents = new List<Content>
                {
                    new Content
                    {
                        Role = "user",
                        Parts = new List<Part>
                        {
                            new Part { Text = request.Content }
                        }
                    }
                },
                DisplayName = request.DisplayName,
                Ttl = $"{ttlSeconds}s"
            };

            // Add system instruction if provided
            if (!string.IsNullOrEmpty(request.SystemInstruction))
            {
                config.SystemInstruction = new Content
                {
                    Parts = new List<Part>
                    {
                        new Part { Text = request.SystemInstruction }
                    }
                };
            }

            _logger.LogInformation(
                "Creating Gemini context cache for model {Model}, TTL: {TtlMinutes} minutes",
                request.Model, ttlMinutes);

            var cacheResponse = await _client.Caches.CreateAsync(
                model: request.Model,
                config: config);

            if (cacheResponse == null || string.IsNullOrEmpty(cacheResponse.Name))
            {
                _logger.LogWarning("Failed to create Gemini context cache - no cache name returned");
                return null;
            }

            var expiresAt = DateTime.UtcNow.AddMinutes(ttlMinutes);

            // Create entity and persist to database
            var entity = new GeminiContextCache
            {
                Id = Guid.NewGuid().ToString(),
                CacheName = cacheResponse.Name,
                DisplayName = request.DisplayName,
                Model = request.Model,
                ContentHash = contentHash,
                UserId = request.UserId,
                TokenCount = cacheResponse.UsageMetadata?.TotalTokenCount,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = expiresAt
            };

            await _repository.CreateAsync(entity, cancellationToken);

            _logger.LogInformation(
                "Created Gemini context cache {CacheName} with {TokenCount} tokens, expires at {ExpiresAt}",
                entity.CacheName, entity.TokenCount, entity.ExpiresAt);

            return MapToEntry(entity);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating Gemini context cache");
            return null;
        }
    }

    public async Task<GeminiCacheEntry?> GetCacheAsync(
        string cacheName,
        CancellationToken cancellationToken = default)
    {
        if (!IsContextCachingEnabled() || _client == null)
            return null;

        try
        {
            // First check local database
            var localEntity = await _repository.GetByCacheNameAsync(cacheName, cancellationToken);

            if (localEntity == null)
            {
                _logger.LogDebug("Cache {CacheName} not found in local database", cacheName);
                return null;
            }

            // Check if expired
            if (!localEntity.IsValid)
            {
                _logger.LogDebug("Cache {CacheName} has expired locally", cacheName);
                await _repository.DeleteAsync(localEntity.Id, cancellationToken);
                return null;
            }

            // Verify cache still exists on Gemini API
            try
            {
                var apiCache = await _client.Caches.GetAsync(name: cacheName);
                if (apiCache == null)
                {
                    _logger.LogDebug("Cache {CacheName} no longer exists on Gemini API", cacheName);
                    await _repository.DeleteAsync(localEntity.Id, cancellationToken);
                    return null;
                }

                return MapToEntry(localEntity);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error verifying cache {CacheName} on Gemini API", cacheName);
                // Return local entry anyway - it might still work
                return MapToEntry(localEntity);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving Gemini context cache {CacheName}", cacheName);
            return null;
        }
    }

    public async Task<GeminiCacheEntry?> GetCacheByIdAsync(
        string cacheId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var entity = await _repository.GetByIdAsync(cacheId, cancellationToken);

            if (entity == null || !entity.IsValid)
                return null;

            return MapToEntry(entity);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving cache by ID {CacheId}", cacheId);
            return null;
        }
    }

    public async Task<bool> DeleteCacheAsync(
        string cacheName,
        CancellationToken cancellationToken = default)
    {
        if (_client == null)
            return false;

        try
        {
            // Delete from Gemini API
            try
            {
                await _client.Caches.DeleteAsync(name: cacheName);
                _logger.LogInformation("Deleted Gemini context cache {CacheName} from API", cacheName);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete cache {CacheName} from Gemini API - may already be expired", cacheName);
            }

            // Delete from local database
            var localEntity = await _repository.GetByCacheNameAsync(cacheName, cancellationToken);
            if (localEntity != null)
            {
                await _repository.DeleteAsync(localEntity.Id, cancellationToken);
                _logger.LogInformation("Deleted local cache record for {CacheName}", cacheName);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting Gemini context cache {CacheName}", cacheName);
            return false;
        }
    }

    public async Task<IEnumerable<GeminiCacheEntry>> ListUserCachesAsync(
        string userId,
        bool includeExpired = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var entities = await _repository.GetByUserIdAsync(userId, cancellationToken);

            if (!includeExpired)
            {
                entities = entities.Where(c => c.IsValid);
            }

            return entities
                .OrderByDescending(c => c.CreatedAt)
                .Select(MapToEntry)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing caches for user {UserId}", userId);
            return Enumerable.Empty<GeminiCacheEntry>();
        }
    }

    public async Task<GeminiCacheEntry?> GetOrCreateCacheAsync(
        string model,
        string displayName,
        string content,
        string? systemInstruction,
        int? ttlMinutes,
        string userId,
        CancellationToken cancellationToken = default)
    {
        if (!IsContextCachingEnabled())
            return null;

        try
        {
            var contentHash = CalculateContentHash(content, systemInstruction);

            // Try to find existing cache
            var existingCache = await FindCacheByContentHashAsync(contentHash, model, userId, cancellationToken);

            if (existingCache != null)
            {
                _logger.LogDebug(
                    "Found existing cache {CacheName} for content hash {ContentHash}",
                    existingCache.CacheName, contentHash);
                return existingCache;
            }

            // Create new cache
            var request = new CreateGeminiCacheRequest
            {
                Model = model,
                DisplayName = displayName,
                Content = content,
                SystemInstruction = systemInstruction,
                TtlMinutes = ttlMinutes,
                UserId = userId
            };

            return await CreateCacheAsync(request, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetOrCreateCache for model {Model}", model);
            return null;
        }
    }

    public async Task<GeminiCacheEntry?> FindCacheByContentHashAsync(
        string contentHash,
        string model,
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var entity = await _repository.FindByContentHashAsync(contentHash, model, userId, cancellationToken);

            if (entity != null && entity.IsValid)
            {
                return MapToEntry(entity);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error finding cache by content hash");
            return null;
        }
    }

    public async Task<GeminiCacheEntry?> ExtendCacheTtlAsync(
        string cacheName,
        int additionalMinutes,
        CancellationToken cancellationToken = default)
    {
        if (!IsContextCachingEnabled() || _client == null)
            return null;

        try
        {
            var localEntity = await _repository.GetByCacheNameAsync(cacheName, cancellationToken);
            if (localEntity == null)
            {
                _logger.LogWarning("Cannot extend TTL - cache {CacheName} not found", cacheName);
                return null;
            }

            // Calculate new TTL
            var currentRemaining = localEntity.TimeRemaining;
            var newTotalSeconds = (int)currentRemaining.TotalSeconds + (additionalMinutes * 60);

            // Ensure we don't exceed max TTL
            var maxTtlSeconds = _settings.Caching.MaxTtlMinutes * 60;
            newTotalSeconds = Math.Min(newTotalSeconds, maxTtlSeconds);

            // Update on Gemini API
            var updateConfig = new UpdateCachedContentConfig
            {
                Ttl = $"{newTotalSeconds}s"
            };

            var updatedCache = await _client.Caches.UpdateAsync(
                name: cacheName,
                config: updateConfig);

            if (updatedCache == null)
            {
                _logger.LogWarning("Failed to update TTL for cache {CacheName}", cacheName);
                return null;
            }

            // Update local record
            localEntity.ExpiresAt = DateTime.UtcNow.AddSeconds(newTotalSeconds);
            await _repository.UpdateAsync(localEntity, cancellationToken);

            _logger.LogInformation(
                "Extended TTL for cache {CacheName}, new expiration: {ExpiresAt}",
                cacheName, localEntity.ExpiresAt);

            return MapToEntry(localEntity);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extending TTL for cache {CacheName}", cacheName);
            return null;
        }
    }

    public async Task<int> CleanupExpiredCachesAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var expiredCaches = await _repository.GetExpiredCachesAsync(cancellationToken);
            var count = 0;

            foreach (var cache in expiredCaches)
            {
                try
                {
                    await _repository.DeleteAsync(cache.Id, cancellationToken);
                    count++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete expired cache {CacheId}", cache.Id);
                }
            }

            if (count > 0)
            {
                _logger.LogInformation("Cleaned up {Count} expired context caches", count);
            }

            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up expired caches");
            return 0;
        }
    }

    public string CalculateContentHash(string content, string? systemInstruction = null)
    {
        var combined = content + (systemInstruction ?? string.Empty);
        var bytes = Encoding.UTF8.GetBytes(combined);
        var hashBytes = SHA256.HashData(bytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    /// <summary>
    /// Maps an entity to the application model
    /// </summary>
    private static GeminiCacheEntry MapToEntry(GeminiContextCache entity)
    {
        return new GeminiCacheEntry
        {
            Id = entity.Id,
            CacheName = entity.CacheName,
            DisplayName = entity.DisplayName,
            Model = entity.Model,
            ContentHash = entity.ContentHash,
            UserId = entity.UserId,
            TokenCount = entity.TokenCount,
            CreatedAt = entity.CreatedAt,
            ExpiresAt = entity.ExpiresAt
        };
    }
}
