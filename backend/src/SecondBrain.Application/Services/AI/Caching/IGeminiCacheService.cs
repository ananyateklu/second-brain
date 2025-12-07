namespace SecondBrain.Application.Services.AI.Caching;

/// <summary>
/// Service for managing Gemini context caches.
/// Context caching allows caching large system prompts or documents on Gemini's servers
/// to reduce latency and costs for repeated requests with the same context.
/// </summary>
public interface IGeminiCacheService
{
    /// <summary>
    /// Creates a new context cache on the Gemini API.
    /// </summary>
    /// <param name="request">The cache creation request containing content and configuration</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The created cache entry, or null if creation failed</returns>
    Task<GeminiCacheEntry?> CreateCacheAsync(
        CreateGeminiCacheRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a cache entry by its Gemini API cache name.
    /// </summary>
    /// <param name="cacheName">The cache name from Gemini API (e.g., "cachedContents/abc123")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The cache entry if found and valid, null otherwise</returns>
    Task<GeminiCacheEntry?> GetCacheAsync(
        string cacheName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a cache entry by its local database ID.
    /// </summary>
    /// <param name="cacheId">The local database ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The cache entry if found and valid, null otherwise</returns>
    Task<GeminiCacheEntry?> GetCacheByIdAsync(
        string cacheId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a cache from both the Gemini API and local database.
    /// </summary>
    /// <param name="cacheName">The cache name from Gemini API</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if deletion was successful, false otherwise</returns>
    Task<bool> DeleteCacheAsync(
        string cacheName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists all caches for a specific user.
    /// </summary>
    /// <param name="userId">The user ID to filter by</param>
    /// <param name="includeExpired">Whether to include expired caches</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of cache entries for the user</returns>
    Task<IEnumerable<GeminiCacheEntry>> ListUserCachesAsync(
        string userId,
        bool includeExpired = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets an existing cache by content hash, or creates a new one if not found.
    /// This is the recommended method for efficient cache reuse.
    /// </summary>
    /// <param name="model">The model to use</param>
    /// <param name="displayName">Display name for the cache</param>
    /// <param name="content">The content to cache</param>
    /// <param name="systemInstruction">Optional system instruction</param>
    /// <param name="ttlMinutes">Optional TTL override</param>
    /// <param name="userId">User ID for ownership</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The existing or newly created cache entry</returns>
    Task<GeminiCacheEntry?> GetOrCreateCacheAsync(
        string model,
        string displayName,
        string content,
        string? systemInstruction,
        int? ttlMinutes,
        string userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds a valid cache by content hash and model.
    /// </summary>
    /// <param name="contentHash">SHA-256 hash of the content</param>
    /// <param name="model">The model the cache was created for</param>
    /// <param name="userId">User ID to filter by</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The cache entry if found and valid, null otherwise</returns>
    Task<GeminiCacheEntry?> FindCacheByContentHashAsync(
        string contentHash,
        string model,
        string userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the expiration time of an existing cache.
    /// </summary>
    /// <param name="cacheName">The cache name from Gemini API</param>
    /// <param name="additionalMinutes">Additional minutes to add to the TTL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The updated cache entry, or null if update failed</returns>
    Task<GeminiCacheEntry?> ExtendCacheTtlAsync(
        string cacheName,
        int additionalMinutes,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cleans up expired caches from the local database.
    /// Note: Caches expire automatically on the Gemini API.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of expired cache records removed</returns>
    Task<int> CleanupExpiredCachesAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if context caching is available and enabled.
    /// </summary>
    /// <returns>True if context caching can be used</returns>
    bool IsContextCachingEnabled();

    /// <summary>
    /// Calculates the SHA-256 hash of content for cache deduplication.
    /// </summary>
    /// <param name="content">The content to hash</param>
    /// <param name="systemInstruction">Optional system instruction to include in hash</param>
    /// <returns>Hexadecimal hash string</returns>
    string CalculateContentHash(string content, string? systemInstruction = null);
}
