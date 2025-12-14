namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response DTO for a note version.
/// </summary>
public class NoteVersionResponse
{
    /// <summary>
    /// The note ID this version belongs to.
    /// </summary>
    public string NoteId { get; set; } = string.Empty;

    /// <summary>
    /// Sequential version number.
    /// </summary>
    public int VersionNumber { get; set; }

    /// <summary>
    /// Whether this is the current (active) version.
    /// </summary>
    public bool IsCurrent { get; set; }

    /// <summary>
    /// When this version became valid.
    /// </summary>
    public DateTime ValidFrom { get; set; }

    /// <summary>
    /// When this version was superseded. Null for current version.
    /// </summary>
    public DateTime? ValidTo { get; set; }

    /// <summary>
    /// Note title at this version.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Note content at this version.
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Tags at this version.
    /// </summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Whether the note was archived at this version.
    /// </summary>
    public bool IsArchived { get; set; }

    /// <summary>
    /// Folder at this version.
    /// </summary>
    public string? Folder { get; set; }

    /// <summary>
    /// User who created this version.
    /// </summary>
    public string ModifiedBy { get; set; } = string.Empty;

    /// <summary>
    /// Description of changes in this version.
    /// </summary>
    public string? ChangeSummary { get; set; }

    /// <summary>
    /// Source of the change (e.g., "web", "agent", "ios_notes", "import").
    /// </summary>
    public string Source { get; set; } = "web";

    /// <summary>
    /// When this version record was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Response DTO for version history listing.
/// </summary>
public class NoteVersionHistoryResponse
{
    /// <summary>
    /// The note ID.
    /// </summary>
    public string NoteId { get; set; } = string.Empty;

    /// <summary>
    /// Total number of versions.
    /// </summary>
    public int TotalVersions { get; set; }

    /// <summary>
    /// Current version number.
    /// </summary>
    public int CurrentVersion { get; set; }

    /// <summary>
    /// List of versions (may be paginated).
    /// </summary>
    public List<NoteVersionResponse> Versions { get; set; } = new();
}

/// <summary>
/// Response DTO for version diff comparison.
/// </summary>
public class NoteVersionDiffResponse
{
    /// <summary>
    /// The note ID.
    /// </summary>
    public string NoteId { get; set; } = string.Empty;

    /// <summary>
    /// The earlier version being compared.
    /// </summary>
    public NoteVersionResponse FromVersion { get; set; } = null!;

    /// <summary>
    /// The later version being compared.
    /// </summary>
    public NoteVersionResponse ToVersion { get; set; } = null!;

    /// <summary>
    /// Whether the title changed.
    /// </summary>
    public bool TitleChanged { get; set; }

    /// <summary>
    /// Whether the content changed.
    /// </summary>
    public bool ContentChanged { get; set; }

    /// <summary>
    /// Whether the tags changed.
    /// </summary>
    public bool TagsChanged { get; set; }

    /// <summary>
    /// Whether the archived status changed.
    /// </summary>
    public bool ArchivedChanged { get; set; }

    /// <summary>
    /// Whether the folder changed.
    /// </summary>
    public bool FolderChanged { get; set; }

    /// <summary>
    /// Tags that were added.
    /// </summary>
    public List<string> TagsAdded { get; set; } = new();

    /// <summary>
    /// Tags that were removed.
    /// </summary>
    public List<string> TagsRemoved { get; set; } = new();
}

/// <summary>
/// Request DTO for restoring a version.
/// </summary>
public class RestoreVersionRequest
{
    /// <summary>
    /// The version number to restore.
    /// </summary>
    public int TargetVersion { get; set; }
}
