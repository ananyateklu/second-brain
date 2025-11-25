using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Core.Entities;

[Table("notes")]
public class Note
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("title")]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [Column("content")]
    public string Content { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("tags", TypeName = "text[]")]
    public List<string> Tags { get; set; } = new();

    [Column("is_archived")]
    public bool IsArchived { get; set; }

    [Column("user_id")]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    [Column("source")]
    [MaxLength(50)]
    public string Source { get; set; } = "web";

    [Column("external_id")]
    [MaxLength(256)]
    public string? ExternalId { get; set; }

    [Column("folder")]
    [MaxLength(256)]
    public string? Folder { get; set; }
}
