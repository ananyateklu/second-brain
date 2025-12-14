using SecondBrain.Application.DTOs;
using SecondBrain.Core.Enums;

namespace SecondBrain.Application.Services.Notes.Models;

/// <summary>
/// Request to create a new note.
/// </summary>
public sealed record CreateNoteOperationRequest
{
    /// <summary>
    /// User ID of the note owner.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Note title (required, max 500 characters).
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Note content (required, markdown format for search and display).
    /// </summary>
    public required string Content { get; init; }

    /// <summary>
    /// TipTap/ProseMirror JSON representation of the note content.
    /// This is the canonical format for UI editing - provides consistent
    /// formatting and eliminates lossy conversions between formats.
    /// </summary>
    public string? ContentJson { get; init; }

    /// <summary>
    /// Tags for categorization.
    /// </summary>
    public List<string> Tags { get; init; } = new();

    /// <summary>
    /// Optional folder/category.
    /// </summary>
    public string? Folder { get; init; }

    /// <summary>
    /// Whether the note starts as archived.
    /// </summary>
    public bool IsArchived { get; init; }

    /// <summary>
    /// Source of the operation (required for audit trail).
    /// </summary>
    public required NoteSource Source { get; init; }

    /// <summary>
    /// External ID for imported notes (iOS Notes, etc.).
    /// Used to detect duplicates during import.
    /// </summary>
    public string? ExternalId { get; init; }

    /// <summary>
    /// Optional images to attach to the note.
    /// </summary>
    public List<NoteImageDto>? Images { get; init; }

    /// <summary>
    /// Custom creation timestamp for imports.
    /// If not set, uses DateTime.UtcNow.
    /// </summary>
    public DateTime? CreatedAt { get; init; }

    /// <summary>
    /// Custom update timestamp for imports.
    /// If not set, uses DateTime.UtcNow.
    /// </summary>
    public DateTime? UpdatedAt { get; init; }
}

/// <summary>
/// Request to update an existing note.
/// Only provided fields are updated.
/// </summary>
public sealed record UpdateNoteOperationRequest
{
    /// <summary>
    /// ID of the note to update.
    /// </summary>
    public required string NoteId { get; init; }

    /// <summary>
    /// User ID for ownership verification.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Source of the operation (required for audit trail).
    /// </summary>
    public required NoteSource Source { get; init; }

    /// <summary>
    /// New title (null = no change).
    /// </summary>
    public string? Title { get; init; }

    /// <summary>
    /// New content (null = no change, markdown format for search and display).
    /// </summary>
    public string? Content { get; init; }

    /// <summary>
    /// TipTap/ProseMirror JSON representation of the note content (null = no change).
    /// This is the canonical format for UI editing - provides consistent
    /// formatting and eliminates lossy conversions between formats.
    /// </summary>
    public string? ContentJson { get; init; }

    /// <summary>
    /// If true, the ContentJson value is applied even if null.
    /// If false and ContentJson is null, no contentJson change occurs.
    /// </summary>
    public bool UpdateContentJson { get; init; }

    /// <summary>
    /// New tags list (null = no change).
    /// </summary>
    public List<string>? Tags { get; init; }

    /// <summary>
    /// New folder (null depends on UpdateFolder flag).
    /// </summary>
    public string? Folder { get; init; }

    /// <summary>
    /// If true, the Folder value is applied even if null (clears folder).
    /// If false and Folder is null, no folder change occurs.
    /// </summary>
    public bool UpdateFolder { get; init; }

    /// <summary>
    /// New archived status (null = no change).
    /// </summary>
    public bool? IsArchived { get; init; }

    /// <summary>
    /// New images to add.
    /// </summary>
    public List<NoteImageDto>? Images { get; init; }

    /// <summary>
    /// IDs of images to delete.
    /// </summary>
    public List<string>? DeletedImageIds { get; init; }
}

/// <summary>
/// Request to append content to a note.
/// </summary>
public sealed record AppendToNoteOperationRequest
{
    /// <summary>
    /// ID of the note to append to.
    /// </summary>
    public required string NoteId { get; init; }

    /// <summary>
    /// User ID for ownership verification.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Content to append.
    /// </summary>
    public required string ContentToAppend { get; init; }

    /// <summary>
    /// Source of the operation (required for audit trail).
    /// </summary>
    public required NoteSource Source { get; init; }

    /// <summary>
    /// Whether to add a newline before the appended content.
    /// </summary>
    public bool AddNewline { get; init; } = true;
}

/// <summary>
/// Request to delete a note.
/// </summary>
public sealed record DeleteNoteOperationRequest
{
    /// <summary>
    /// ID of the note to delete.
    /// </summary>
    public required string NoteId { get; init; }

    /// <summary>
    /// User ID for ownership verification.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Source of the operation (required for audit trail).
    /// </summary>
    public required NoteSource Source { get; init; }

    /// <summary>
    /// If true, soft delete (can be restored). If false, permanent hard delete.
    /// </summary>
    public bool SoftDelete { get; init; } = true;
}

/// <summary>
/// Request to restore a note to a previous version.
/// </summary>
public sealed record RestoreVersionOperationRequest
{
    /// <summary>
    /// ID of the note to restore.
    /// </summary>
    public required string NoteId { get; init; }

    /// <summary>
    /// User ID for ownership verification.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Version number to restore to.
    /// </summary>
    public required int TargetVersionNumber { get; init; }
}

/// <summary>
/// Request to duplicate a note.
/// </summary>
public sealed record DuplicateNoteOperationRequest
{
    /// <summary>
    /// ID of the note to duplicate.
    /// </summary>
    public required string SourceNoteId { get; init; }

    /// <summary>
    /// User ID for ownership verification.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Title for the duplicated note. If null, uses "Copy of {original title}".
    /// </summary>
    public string? NewTitle { get; init; }

    /// <summary>
    /// Source of the operation (required for audit trail).
    /// </summary>
    public required NoteSource Source { get; init; }
}

/// <summary>
/// Request to archive or unarchive a note.
/// </summary>
public sealed record SetArchivedOperationRequest
{
    /// <summary>
    /// ID of the note to archive/unarchive.
    /// </summary>
    public required string NoteId { get; init; }

    /// <summary>
    /// User ID for ownership verification.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// True to archive, false to unarchive.
    /// </summary>
    public required bool IsArchived { get; init; }

    /// <summary>
    /// Source of the operation (required for audit trail).
    /// </summary>
    public required NoteSource Source { get; init; }
}

/// <summary>
/// Request to move a note to a different folder.
/// </summary>
public sealed record MoveToFolderOperationRequest
{
    /// <summary>
    /// ID of the note to move.
    /// </summary>
    public required string NoteId { get; init; }

    /// <summary>
    /// User ID for ownership verification.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Target folder. Null to remove from all folders.
    /// </summary>
    public string? Folder { get; init; }

    /// <summary>
    /// Source of the operation (required for audit trail).
    /// </summary>
    public required NoteSource Source { get; init; }
}

/// <summary>
/// Request to bulk delete multiple notes.
/// </summary>
public sealed record BulkDeleteNotesOperationRequest
{
    /// <summary>
    /// IDs of notes to delete.
    /// </summary>
    public required IReadOnlyCollection<string> NoteIds { get; init; }

    /// <summary>
    /// User ID for ownership verification.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Source of the operation (required for audit trail).
    /// </summary>
    public required NoteSource Source { get; init; }

    /// <summary>
    /// If true, soft delete (can be restored). If false, permanent hard delete.
    /// </summary>
    public bool SoftDelete { get; init; } = true;
}
