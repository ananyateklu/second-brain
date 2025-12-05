using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NpgsqlTypes;

namespace SecondBrain.Core.Entities;

/// <summary>
/// Represents a historical version of a note using PostgreSQL 18's temporal features.
/// The valid_period column with WITHOUT OVERLAPS constraint ensures no overlapping versions
/// for the same note exist.
/// </summary>
[Table("note_versions")]
public class NoteVersion
{
    /// <summary>
    /// Unique identifier for EF Core tracking.
    /// The database uses (note_id, valid_period) as the temporal primary key.
    /// </summary>
    [Key]
    [Column("id")]
    public string Id { get; set; } = Guid.CreateVersion7().ToString();

    /// <summary>
    /// Reference to the original note.
    /// Part of the composite temporal primary key in the database.
    /// </summary>
    [Column("note_id")]
    public string NoteId { get; set; } = string.Empty;

    /// <summary>
    /// The time range during which this version was/is valid.
    /// Uses PostgreSQL tstzrange with [) bounds (inclusive start, exclusive end).
    /// Current versions have an unbounded (null) upper limit.
    /// Part of the composite temporal primary key.
    /// </summary>
    [Column("valid_period")]
    public NpgsqlRange<DateTime> ValidPeriod { get; set; }

    /// <summary>
    /// Note title at this version.
    /// </summary>
    [Column("title")]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Note content at this version.
    /// </summary>
    [Column("content")]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Tags associated with this version.
    /// </summary>
    [Column("tags", TypeName = "text[]")]
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Whether the note was archived at this version.
    /// </summary>
    [Column("is_archived")]
    public bool IsArchived { get; set; }

    /// <summary>
    /// Folder/category at this version.
    /// </summary>
    [Column("folder")]
    [MaxLength(256)]
    public string? Folder { get; set; }

    /// <summary>
    /// User who made this version change.
    /// </summary>
    [Column("modified_by")]
    [MaxLength(128)]
    public string ModifiedBy { get; set; } = string.Empty;

    /// <summary>
    /// Sequential version number for this note.
    /// </summary>
    [Column("version_number")]
    public int VersionNumber { get; set; } = 1;

    /// <summary>
    /// Optional description of what changed in this version.
    /// </summary>
    [Column("change_summary")]
    [MaxLength(500)]
    public string? ChangeSummary { get; set; }

    /// <summary>
    /// When this version record was created.
    /// </summary>
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [ForeignKey("NoteId")]
    public Note? Note { get; set; }

    // Computed properties for convenience

    /// <summary>
    /// Gets the start time of this version's validity period.
    /// </summary>
    [NotMapped]
    public DateTime ValidFrom => ValidPeriod.LowerBound;

    /// <summary>
    /// Gets the end time of this version's validity period.
    /// Null indicates this is the current version.
    /// </summary>
    [NotMapped]
    public DateTime? ValidTo => IsCurrent ? null : ValidPeriod.UpperBound;

    /// <summary>
    /// Returns true if this is the current (active) version.
    /// Current versions have an unbounded upper limit (DateTime.MaxValue or infinite).
    /// </summary>
    [NotMapped]
    public bool IsCurrent => ValidPeriod.UpperBoundInfinite || ValidPeriod.UpperBound >= DateTime.MaxValue.AddYears(-1);

    /// <summary>
    /// Creates a new NoteVersion from a Note entity.
    /// </summary>
    public static NoteVersion FromNote(Note note, string modifiedBy, int versionNumber, string? changeSummary = null)
    {
        return new NoteVersion
        {
            Id = Guid.CreateVersion7().ToString(),
            NoteId = note.Id,
            ValidPeriod = CreateOpenEndedRange(DateTime.UtcNow),
            Title = note.Title,
            Content = note.Content,
            Tags = new List<string>(note.Tags),
            IsArchived = note.IsArchived,
            Folder = note.Folder,
            ModifiedBy = modifiedBy,
            VersionNumber = versionNumber,
            ChangeSummary = changeSummary,
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Creates an open-ended range (starting at given time, no end).
    /// For PostgreSQL this represents [start, infinity).
    /// </summary>
    private static NpgsqlRange<DateTime> CreateOpenEndedRange(DateTime start)
    {
        // Use DateTime.MaxValue as a sentinel for "unbounded"
        // The database handles actual infinity via tstzrange(start, NULL, '[)')
        return new NpgsqlRange<DateTime>(start, DateTime.MaxValue);
    }

    /// <summary>
    /// Creates a closed range (with both start and end).
    /// </summary>
    public static NpgsqlRange<DateTime> CreateClosedRange(DateTime start, DateTime end)
    {
        return new NpgsqlRange<DateTime>(start, end);
    }
}
