using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Pgvector;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Core.Entities;

/// <summary>
/// Represents a persisted AI-generated focus suggestion with vector embedding for deduplication.
/// Suggestions are generated from user's notes and can be converted to FocusItems.
/// </summary>
[Table("focus_suggestions")]
public class FocusSuggestion : ISoftDeletable
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("user_id")]
    [MaxLength(128)]
    [Required]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Suggested task title (max 500 chars).
    /// </summary>
    [Column("title")]
    [MaxLength(500)]
    [Required]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of the suggested task.
    /// </summary>
    [Column("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Priority level: 1 = P1 (High), 2 = P2 (Medium), 3 = P3 (Low).
    /// </summary>
    [Column("priority")]
    [Range(1, 3)]
    public int Priority { get; set; } = 2;

    /// <summary>
    /// Estimated time to complete in minutes.
    /// </summary>
    [Column("estimated_minutes")]
    public int? EstimatedMinutes { get; set; }

    /// <summary>
    /// AI-generated explanation for why this was suggested.
    /// </summary>
    [Column("reason")]
    [Required]
    public string Reason { get; set; } = string.Empty;

    /// <summary>
    /// AI confidence score for this suggestion (0-1).
    /// </summary>
    [Column("confidence")]
    public float Confidence { get; set; } = 0.5f;

    /// <summary>
    /// ID of the source note this suggestion was derived from.
    /// </summary>
    [Column("source_note_id")]
    public string? SourceNoteId { get; set; }

    /// <summary>
    /// Title of the source note (denormalized for display).
    /// </summary>
    [Column("source_note_title")]
    [MaxLength(500)]
    public string? SourceNoteTitle { get; set; }

    /// <summary>
    /// Vector embedding for semantic similarity detection during deduplication.
    /// Uses 1536 dimensions (OpenAI ada-002 compatible).
    /// </summary>
    [Column("embedding", TypeName = "vector")]
    public Vector? Embedding { get; set; }

    /// <summary>
    /// Name of the embedding provider (e.g., "OpenAI", "Ollama").
    /// </summary>
    [Column("embedding_provider")]
    [MaxLength(50)]
    public string? EmbeddingProvider { get; set; }

    /// <summary>
    /// Model used for embedding generation (e.g., "text-embedding-ada-002").
    /// </summary>
    [Column("embedding_model")]
    [MaxLength(100)]
    public string? EmbeddingModel { get; set; }

    /// <summary>
    /// Number of dimensions in the embedding vector.
    /// </summary>
    [Column("embedding_dimensions")]
    public int EmbeddingDimensions { get; set; } = 1536;

    /// <summary>
    /// Timestamp when the user converted this suggestion to a FocusItem.
    /// Null if not yet accepted.
    /// </summary>
    [Column("accepted_at")]
    public DateTime? AcceptedAt { get; set; }

    /// <summary>
    /// ID of the FocusItem created from this suggestion.
    /// </summary>
    [Column("accepted_focus_item_id")]
    public string? AcceptedFocusItemId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Soft delete properties (ISoftDeletable)
    [Column("is_deleted")]
    public bool IsDeleted { get; set; }

    [Column("deleted_at")]
    public DateTime? DeletedAt { get; set; }

    [Column("deleted_by")]
    [MaxLength(128)]
    public string? DeletedBy { get; set; }

    // Navigation properties
    /// <summary>
    /// The source note this suggestion was derived from.
    /// </summary>
    public Note? SourceNote { get; set; }

    /// <summary>
    /// The FocusItem created from this suggestion (if accepted).
    /// </summary>
    public FocusItem? AcceptedFocusItem { get; set; }

    // Computed properties
    /// <summary>
    /// Whether this suggestion has been accepted and converted to a FocusItem.
    /// </summary>
    [NotMapped]
    public bool IsAccepted => AcceptedAt.HasValue;

    /// <summary>
    /// Whether this suggestion has an embedding for similarity comparison.
    /// </summary>
    [NotMapped]
    public bool HasEmbedding => Embedding != null;
}
