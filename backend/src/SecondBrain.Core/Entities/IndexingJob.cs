using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Core.Entities;

[Table("indexing_jobs")]
public class IndexingJob
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("user_id")]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    [Column("status")]
    [MaxLength(30)]
    public string Status { get; set; } = IndexingStatus.Pending;

    [Column("total_notes")]
    public int TotalNotes { get; set; }

    [Column("processed_notes")]
    public int ProcessedNotes { get; set; }

    [Column("total_chunks")]
    public int TotalChunks { get; set; }

    [Column("processed_chunks")]
    public int ProcessedChunks { get; set; }

    [Column("errors", TypeName = "text[]")]
    public List<string> Errors { get; set; } = new();

    [Column("embedding_provider")]
    [MaxLength(50)]
    public string EmbeddingProvider { get; set; } = string.Empty;

    [Column("started_at")]
    public DateTime? StartedAt { get; set; }

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public static class IndexingStatus
{
    public const string Pending = "pending";
    public const string Running = "running";
    public const string Completed = "completed";
    public const string Failed = "failed";
    public const string PartiallyCompleted = "partially_completed";
    public const string Cancelled = "cancelled";
}
