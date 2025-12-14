namespace SecondBrain.Core.Enums;

/// <summary>
/// Defines the source/origin of a note operation.
/// Used for version history tracking, analytics, and audit trails.
/// </summary>
/// <remarks>
/// This enum provides type-safe source tracking instead of magic strings.
/// All note mutations must specify a source for complete audit history.
/// </remarks>
public enum NoteSource
{
    /// <summary>
    /// Created or modified via web UI.
    /// The primary user interface for direct note editing.
    /// </summary>
    Web = 0,

    /// <summary>
    /// Created or modified by an AI agent.
    /// Includes operations from CreateNote, UpdateNote, AppendToNote tools.
    /// </summary>
    Agent = 1,

    /// <summary>
    /// Imported from iOS Notes app via Apple Shortcuts.
    /// Uses the iOS import pipeline with ExternalId tracking.
    /// </summary>
    IosNotes = 2,

    /// <summary>
    /// Generic import from external sources.
    /// Used for bulk imports, data migrations, or other import workflows.
    /// </summary>
    Import = 3,

    /// <summary>
    /// System-generated operation.
    /// Used for migrations, maintenance tasks, or automated cleanup.
    /// </summary>
    System = 4,

    /// <summary>
    /// Restored from version history.
    /// When a user restores a note to a previous version.
    /// </summary>
    Restored = 5,

    /// <summary>
    /// API-based operation.
    /// Direct API calls not from web UI (external integrations, CLI tools).
    /// </summary>
    Api = 6
}

/// <summary>
/// Extension methods for NoteSource enum.
/// </summary>
public static class NoteSourceExtensions
{
    /// <summary>
    /// Converts the enum to its database string representation.
    /// </summary>
    /// <param name="source">The note source.</param>
    /// <returns>Lowercase string for database storage.</returns>
    public static string ToDbValue(this NoteSource source) => source switch
    {
        NoteSource.Web => "web",
        NoteSource.Agent => "agent",
        NoteSource.IosNotes => "ios_notes",
        NoteSource.Import => "import",
        NoteSource.System => "system",
        NoteSource.Restored => "restored",
        NoteSource.Api => "api",
        _ => "web"
    };

    /// <summary>
    /// Parses a database string to a NoteSource enum.
    /// </summary>
    /// <param name="value">The database string value.</param>
    /// <returns>The corresponding NoteSource, defaulting to Web if unknown.</returns>
    public static NoteSource ParseNoteSource(string? value) => value?.ToLowerInvariant() switch
    {
        "web" => NoteSource.Web,
        "agent" => NoteSource.Agent,
        "ios_notes" => NoteSource.IosNotes,
        "import" => NoteSource.Import,
        "system" => NoteSource.System,
        "restored" => NoteSource.Restored,
        "api" => NoteSource.Api,
        _ => NoteSource.Web
    };

    /// <summary>
    /// Gets a human-readable display name for the source.
    /// </summary>
    /// <param name="source">The note source.</param>
    /// <returns>Display-friendly name.</returns>
    public static string ToDisplayName(this NoteSource source) => source switch
    {
        NoteSource.Web => "Web UI",
        NoteSource.Agent => "AI Agent",
        NoteSource.IosNotes => "iOS Notes Import",
        NoteSource.Import => "Import",
        NoteSource.System => "System",
        NoteSource.Restored => "Restored Version",
        NoteSource.Api => "API",
        _ => "Unknown"
    };

    /// <summary>
    /// Returns whether this source represents a user-initiated action.
    /// </summary>
    /// <param name="source">The note source.</param>
    /// <returns>True if user-initiated, false for automated sources.</returns>
    public static bool IsUserInitiated(this NoteSource source) => source switch
    {
        NoteSource.Web => true,
        NoteSource.Api => true,
        NoteSource.Restored => true,
        _ => false
    };

    /// <summary>
    /// Returns whether this source represents an AI/automated action.
    /// </summary>
    /// <param name="source">The note source.</param>
    /// <returns>True if automated, false for user-initiated sources.</returns>
    public static bool IsAutomated(this NoteSource source) => source switch
    {
        NoteSource.Agent => true,
        NoteSource.System => true,
        _ => false
    };

    /// <summary>
    /// Returns whether this source represents an import operation.
    /// </summary>
    /// <param name="source">The note source.</param>
    /// <returns>True if import-related source.</returns>
    public static bool IsImport(this NoteSource source) => source switch
    {
        NoteSource.IosNotes => true,
        NoteSource.Import => true,
        _ => false
    };
}
