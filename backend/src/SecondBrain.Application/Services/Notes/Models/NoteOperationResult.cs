using SecondBrain.Core.Entities;
using SecondBrain.Core.Enums;

namespace SecondBrain.Application.Services.Notes.Models;

/// <summary>
/// Result of a note operation with detailed change tracking.
/// Provides comprehensive information about what was done for audit and UI feedback.
/// </summary>
public sealed record NoteOperationResult
{
    /// <summary>
    /// The note after the operation.
    /// </summary>
    public required Note Note { get; init; }

    /// <summary>
    /// The version number created by this operation.
    /// 0 if no new version was created (e.g., no changes detected).
    /// </summary>
    public required int VersionNumber { get; init; }

    /// <summary>
    /// The source that performed this operation.
    /// </summary>
    public required NoteSource Source { get; init; }

    /// <summary>
    /// List of fields that were changed.
    /// Possible values: "title", "content", "tags", "folder", "archived", "created", "restored", "deleted".
    /// </summary>
    public required IReadOnlyList<string> Changes { get; init; }

    /// <summary>
    /// Human-readable summary of the changes.
    /// e.g., "Updated: title, content ()"
    /// </summary>
    public string? ChangeSummary { get; init; }

    /// <summary>
    /// True if this was a new note creation.
    /// </summary>
    public bool IsNewNote { get; init; }

    /// <summary>
    /// True if changes were detected and persisted.
    /// False if the update request had no actual changes.
    /// </summary>
    public bool HasChanges => Changes.Count > 0;
}

/// <summary>
/// Result of a note deletion operation.
/// </summary>
public sealed record NoteDeleteResult
{
    /// <summary>
    /// True if the note was successfully deleted.
    /// </summary>
    public required bool Success { get; init; }

    /// <summary>
    /// ID of the deleted note.
    /// </summary>
    public required string NoteId { get; init; }

    /// <summary>
    /// The source that performed the deletion.
    /// </summary>
    public required NoteSource Source { get; init; }

    /// <summary>
    /// True if this was a soft delete (can be restored).
    /// False if this was a permanent hard delete.
    /// </summary>
    public required bool WasSoftDelete { get; init; }
}

/// <summary>
/// Result of a bulk delete operation.
/// </summary>
public sealed record BulkDeleteResult
{
    /// <summary>
    /// Number of notes successfully deleted.
    /// </summary>
    public required int DeletedCount { get; init; }

    /// <summary>
    /// IDs of successfully deleted notes.
    /// </summary>
    public required IReadOnlyList<string> DeletedIds { get; init; }

    /// <summary>
    /// IDs of notes that failed to delete (e.g., not found, permission denied).
    /// </summary>
    public IReadOnlyList<string> FailedIds { get; init; } = Array.Empty<string>();

    /// <summary>
    /// The source that performed the deletion.
    /// </summary>
    public required NoteSource Source { get; init; }

    /// <summary>
    /// True if this was a soft delete (can be restored).
    /// False if this was a permanent hard delete.
    /// </summary>
    public required bool WasSoftDelete { get; init; }
}

/// <summary>
/// Result of a version restore operation.
/// </summary>
public sealed record RestoreVersionResult
{
    /// <summary>
    /// The restored note (now at the new version).
    /// </summary>
    public required Note Note { get; init; }

    /// <summary>
    /// The version number that was restored from.
    /// </summary>
    public required int RestoredFromVersion { get; init; }

    /// <summary>
    /// The new version number created by the restore.
    /// </summary>
    public required int NewVersionNumber { get; init; }

    /// <summary>
    /// List of fields that changed during restore.
    /// </summary>
    public required IReadOnlyList<string> ChangedFields { get; init; }
}

/// <summary>
/// Provides static factory methods for creating operation results.
/// </summary>
public static class NoteOperationResultFactory
{
    /// <summary>
    /// Creates a result for a newly created note.
    /// </summary>
    public static NoteOperationResult Created(Note note, int versionNumber, NoteSource source)
    {
        return new NoteOperationResult
        {
            Note = note,
            VersionNumber = versionNumber,
            Source = source,
            Changes = new[] { "created" },
            ChangeSummary = BuildChangeSummary(new[] { "created" }, source),
            IsNewNote = true
        };
    }

    /// <summary>
    /// Creates a result for an updated note.
    /// </summary>
    public static NoteOperationResult Updated(Note note, int versionNumber, NoteSource source, IReadOnlyList<string> changes)
    {
        return new NoteOperationResult
        {
            Note = note,
            VersionNumber = versionNumber,
            Source = source,
            Changes = changes,
            ChangeSummary = changes.Count > 0 ? BuildChangeSummary(changes, source) : null,
            IsNewNote = false
        };
    }

    /// <summary>
    /// Creates a result when no changes were detected.
    /// </summary>
    public static NoteOperationResult NoChanges(Note note, NoteSource source)
    {
        return new NoteOperationResult
        {
            Note = note,
            VersionNumber = 0,
            Source = source,
            Changes = Array.Empty<string>(),
            ChangeSummary = null,
            IsNewNote = false
        };
    }

    /// <summary>
    /// Creates a result for a duplicated note.
    /// </summary>
    public static NoteOperationResult Duplicated(Note note, int versionNumber, NoteSource source, string originalNoteId)
    {
        return new NoteOperationResult
        {
            Note = note,
            VersionNumber = versionNumber,
            Source = source,
            Changes = new[] { "duplicated" },
            ChangeSummary = $"Duplicated from note {originalNoteId}{GetSourceSuffix(source)}",
            IsNewNote = true
        };
    }

    /// <summary>
    /// Creates a result for a restored version.
    /// </summary>
    public static NoteOperationResult Restored(Note note, int newVersionNumber, int restoredFromVersion, IReadOnlyList<string> changedFields)
    {
        return new NoteOperationResult
        {
            Note = note,
            VersionNumber = newVersionNumber,
            Source = NoteSource.Restored,
            Changes = changedFields,
            ChangeSummary = $"Restored from version {restoredFromVersion}",
            IsNewNote = false
        };
    }

    private static string BuildChangeSummary(IReadOnlyList<string> changes, NoteSource source)
    {
        if (changes.Count == 0)
            return string.Empty;

        var changeList = string.Join(", ", changes);
        var sourceLabel = GetSourceSuffix(source);

        if (changes.Contains("created"))
            return $"Initial version{sourceLabel}";

        return $"Updated: {changeList}{sourceLabel}";
    }

    private static string GetSourceSuffix(NoteSource source) => source switch
    {
        NoteSource.Agent => " (by Agent)",
        NoteSource.IosNotes => " (from iOS)",
        NoteSource.Import => " (from import)",
        NoteSource.System => " (system)",
        NoteSource.Api => " (via API)",
        _ => ""
    };
}
