namespace SecondBrain.Application.Services.AI.Caching;

/// <summary>
/// Represents a cached content entry from the Gemini API.
/// This model is used for both API responses and local tracking.
/// </summary>
public class GeminiCacheEntry
{
    /// <summary>
    /// Unique identifier for the cache entry (local database ID)
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// The cache name returned by the Gemini API (e.g., "cachedContents/abc123")
    /// This is used to reference the cache in generation requests.
    /// </summary>
    public string CacheName { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable display name for the cache
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// The model this cache was created for (e.g., "gemini-2.0-flash")
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// SHA-256 hash of the cached content for deduplication
    /// </summary>
    public string ContentHash { get; set; } = string.Empty;

    /// <summary>
    /// User ID who owns this cache
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Estimated token count of the cached content
    /// </summary>
    public int? TokenCount { get; set; }

    /// <summary>
    /// When the cache was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the cache will expire on the Gemini API
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Whether the cache is still valid (not expired)
    /// </summary>
    public bool IsValid => ExpiresAt > DateTime.UtcNow;

    /// <summary>
    /// Time remaining until expiration
    /// </summary>
    public TimeSpan TimeRemaining => IsValid ? ExpiresAt - DateTime.UtcNow : TimeSpan.Zero;
}

/// <summary>
/// Request to create a new Gemini context cache
/// </summary>
public class CreateGeminiCacheRequest
{
    /// <summary>
    /// The model to create the cache for
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable display name for the cache
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// The content to cache (large text, documents, etc.)
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Optional system instruction to cache along with content
    /// </summary>
    public string? SystemInstruction { get; set; }

    /// <summary>
    /// Time-to-live in minutes (defaults to configuration setting)
    /// </summary>
    public int? TtlMinutes { get; set; }

    /// <summary>
    /// User ID for ownership tracking
    /// </summary>
    public string UserId { get; set; } = string.Empty;
}
