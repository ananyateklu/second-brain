namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model for comprehensive note statistics.
/// Used by the sidebar, directory page, and dashboard for accurate counts and insights.
/// </summary>
public sealed class NoteStatsResponse
{
    // ============================================
    // Count Statistics
    // ============================================

    /// <summary>
    /// Total number of non-deleted notes
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Number of active (non-archived) notes
    /// </summary>
    public int ActiveCount { get; set; }

    /// <summary>
    /// Number of archived notes
    /// </summary>
    public int ArchivedCount { get; set; }

    /// <summary>
    /// Number of notes without a folder (unfiled)
    /// </summary>
    public int UnfiledCount { get; set; }

    /// <summary>
    /// Number of notes in trash (soft-deleted)
    /// </summary>
    public int TrashCount { get; set; }

    // ============================================
    // Organization Statistics
    // ============================================

    /// <summary>
    /// Count of active (non-archived) notes per folder
    /// </summary>
    public Dictionary<string, int> FolderCounts { get; set; } = new();

    /// <summary>
    /// All unique tags across all notes (sorted alphabetically)
    /// </summary>
    public List<string> AllTags { get; set; } = [];

    /// <summary>
    /// Total number of unique folders
    /// </summary>
    public int FolderCount { get; set; }

    /// <summary>
    /// Total number of unique tags
    /// </summary>
    public int TagCount { get; set; }

    // ============================================
    // Activity Statistics
    // ============================================

    /// <summary>
    /// Number of notes created in the last 7 days
    /// </summary>
    public int CreatedThisWeek { get; set; }

    /// <summary>
    /// Number of notes created in the last 30 days
    /// </summary>
    public int CreatedThisMonth { get; set; }

    /// <summary>
    /// Number of notes updated in the last 7 days
    /// </summary>
    public int UpdatedThisWeek { get; set; }

    /// <summary>
    /// Number of notes updated in the last 30 days
    /// </summary>
    public int UpdatedThisMonth { get; set; }

    /// <summary>
    /// Date of the most recently created note
    /// </summary>
    public DateTime? LastCreatedAt { get; set; }

    /// <summary>
    /// Date of the most recently updated note
    /// </summary>
    public DateTime? LastUpdatedAt { get; set; }

    // ============================================
    // Content Statistics
    // ============================================

    /// <summary>
    /// Number of notes that have images attached
    /// </summary>
    public int NotesWithImages { get; set; }

    /// <summary>
    /// Number of notes that have AI-generated summaries
    /// </summary>
    public int NotesWithSummaries { get; set; }

    // ============================================
    // Chart Data (for dashboard/insights)
    // ============================================

    /// <summary>
    /// Daily note creation counts for the last 365 days.
    /// Key: date in yyyy-MM-dd format, Value: count of notes created
    /// </summary>
    public Dictionary<string, int> DailyNoteCounts { get; set; } = [];
}
