using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Core.Entities;

/// <summary>
/// Entity for tracking Gemini context caches.
/// Context caching allows caching large system prompts or documents on Gemini's servers
/// to reduce latency and costs for repeated requests with the same context.
/// </summary>
[Table("gemini_context_caches")]
public class GeminiContextCache
{
    /// <summary>
    /// Local database ID
    /// </summary>
    [Key]
    [Column("id")]
    [MaxLength(128)]
    public string Id { get; set; } = Guid.CreateVersion7().ToString();

    /// <summary>
    /// User who owns this cache
    /// </summary>
    [Required]
    [Column("user_id")]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// The cache name returned by Gemini API (e.g., "cachedContents/abc123").
    /// This is the key used to reference the cache in generation requests.
    /// </summary>
    [Required]
    [Column("cache_name")]
    [MaxLength(512)]
    public string CacheName { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable display name for the cache
    /// </summary>
    [Required]
    [Column("display_name")]
    [MaxLength(256)]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// The model this cache was created for (e.g., "gemini-2.0-flash")
    /// </summary>
    [Required]
    [Column("model")]
    [MaxLength(64)]
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// SHA-256 hash of the cached content for deduplication
    /// </summary>
    [Required]
    [Column("content_hash")]
    [MaxLength(64)]
    public string ContentHash { get; set; } = string.Empty;

    /// <summary>
    /// Estimated token count of the cached content (from Gemini API)
    /// </summary>
    [Column("token_count")]
    public int? TokenCount { get; set; }

    /// <summary>
    /// When the cache will expire on the Gemini API
    /// </summary>
    [Required]
    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// When the cache was created
    /// </summary>
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the cache record was last updated
    /// </summary>
    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Whether the cache is still valid (not expired)
    /// </summary>
    [NotMapped]
    public bool IsValid => ExpiresAt > DateTime.UtcNow;

    /// <summary>
    /// Time remaining until expiration
    /// </summary>
    [NotMapped]
    public TimeSpan TimeRemaining => IsValid ? ExpiresAt - DateTime.UtcNow : TimeSpan.Zero;
}
