using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Core.Entities;

[Table("summary_jobs")]
public class SummaryJob
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("user_id")]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    [Column("status")]
    [MaxLength(30)]
    public string Status { get; set; } = SummaryJobStatus.Pending;

    [Column("total_notes")]
    public int TotalNotes { get; set; }

    [Column("processed_notes")]
    public int ProcessedNotes { get; set; }

    [Column("success_count")]
    public int SuccessCount { get; set; }

    [Column("failure_count")]
    public int FailureCount { get; set; }

    [Column("skipped_count")]
    public int SkippedCount { get; set; }

    [Column("errors", TypeName = "text[]")]
    public List<string> Errors { get; set; } = new();

    [Column("started_at")]
    public DateTime? StartedAt { get; set; }

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public static class SummaryJobStatus
{
    public const string Pending = "pending";
    public const string Running = "running";
    public const string Completed = "completed";
    public const string Failed = "failed";
    public const string Cancelled = "cancelled";
}
