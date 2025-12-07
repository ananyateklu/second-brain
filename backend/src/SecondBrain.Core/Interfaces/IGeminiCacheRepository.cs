using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Repository for managing Gemini context cache records in the database.
/// </summary>
public interface IGeminiCacheRepository
{
    /// <summary>
    /// Creates a new cache record in the database.
    /// </summary>
    Task<GeminiContextCache> CreateAsync(GeminiContextCache entity, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a cache entry by its local database ID.
    /// </summary>
    Task<GeminiContextCache?> GetByIdAsync(string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a cache entry by its Gemini API cache name.
    /// </summary>
    Task<GeminiContextCache?> GetByCacheNameAsync(string cacheName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing cache record.
    /// </summary>
    Task<GeminiContextCache?> UpdateAsync(GeminiContextCache entity, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a cache record by its local database ID.
    /// </summary>
    Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all caches for a specific user.
    /// </summary>
    Task<IEnumerable<GeminiContextCache>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds a cache by content hash, model, and user.
    /// Used for cache deduplication.
    /// </summary>
    Task<GeminiContextCache?> FindByContentHashAsync(
        string contentHash,
        string model,
        string userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all expired cache records for cleanup.
    /// </summary>
    Task<IEnumerable<GeminiContextCache>> GetExpiredCachesAsync(CancellationToken cancellationToken = default);
}
