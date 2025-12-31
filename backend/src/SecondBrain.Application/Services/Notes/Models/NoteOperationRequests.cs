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
    /// AI provider name when created by an agent (e.g., "Anthropic", "Google", "OpenAI").
    /// </summary>
    public string? AiProvider { get; init; }

    /// <summary>
    /// AI model identifier when created by an agent (e.g., "claude-3-5-sonnet", "gemini-2.0-flash").
    /// </summary>
    public string? AiModel { get; init; }

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
    /// AI provider name when updated by an agent (e.g., "Anthropic", "Google", "OpenAI").
    /// </summary>
    public string? AiProvider { get; init; }

    /// <summary>
    /// AI model identifier when updated by an agent (e.g., "claude-3-5-sonnet", "gemini-2.0-flash").
    /// </summary>
    public string? AiModel { get; init; }

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
    /// AI provider name when appended by an agent (e.g., "Anthropic", "Google", "OpenAI").
    /// </summary>
    public string? AiProvider { get; init; }

    /// <summary>
    /// AI model identifier when appended by an agent (e.g., "claude-3-5-sonnet", "gemini-2.0-flash").
    /// </summary>
    public string? AiModel { get; init; }

    /// <summary>
    /// Whether to add a newline before the appended content.
    /// </summary>
    public bool AddNewline { get; init; } = true;
}

/// <summary>
/// Request to replace a specific string in a note's content.
/// Inspired by Anthropic's str_replace text editor tool pattern.
/// </summary>
public sealed record ReplaceInNoteOperationRequest
{
    /// <summary>
    /// ID of the note to modify.
    /// </summary>
    public required string NoteId { get; init; }

    /// <summary>
    /// User ID for ownership verification.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Exact text to find and replace (must match exactly, including whitespace).
    /// </summary>
    public required string OldText { get; init; }

    /// <summary>
    /// Text to replace OldText with. Empty string removes the text.
    /// </summary>
    public required string NewText { get; init; }

    /// <summary>
    /// Source of the operation (required for audit trail).
    /// </summary>
    public required NoteSource Source { get; init; }

    /// <summary>
    /// AI provider name when modified by an agent.
    /// </summary>
    public string? AiProvider { get; init; }

    /// <summary>
    /// AI model identifier when modified by an agent.
    /// </summary>
    public string? AiModel { get; init; }

    /// <summary>
    /// If true, allows replacement of multiple occurrences. Default is false (single match only).
    /// </summary>
    public bool AllowMultiple { get; init; } = false;
}

/// <summary>
/// Request to insert text at a specific line number in a note.
/// Inspired by Anthropic's insert text editor tool pattern.
/// </summary>
public sealed record InsertInNoteOperationRequest
{
    /// <summary>
    /// ID of the note to modify.
    /// </summary>
    public required string NoteId { get; init; }

    /// <summary>
    /// User ID for ownership verification.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Line number after which to insert the text (0 = beginning of note, 1 = after first line).
    /// </summary>
    public required int LineNumber { get; init; }

    /// <summary>
    /// Text to insert.
    /// </summary>
    public required string TextToInsert { get; init; }

    /// <summary>
    /// Source of the operation (required for audit trail).
    /// </summary>
    public required NoteSource Source { get; init; }

    /// <summary>
    /// AI provider name when modified by an agent.
    /// </summary>
    public string? AiProvider { get; init; }

    /// <summary>
    /// AI model identifier when modified by an agent.
    /// </summary>
    public string? AiModel { get; init; }
}

/// <summary>
/// Request to prepend content to the beginning of a note.
/// </summary>
public sealed record PrependToNoteOperationRequest
{
    /// <summary>
    /// ID of the note to modify.
    /// </summary>
    public required string NoteId { get; init; }

    /// <summary>
    /// User ID for ownership verification.
    /// </summary>
    public required string UserId { get; init; }

    /// <summary>
    /// Content to prepend to the note.
    /// </summary>
    public required string ContentToPrepend { get; init; }

    /// <summary>
    /// Source of the operation (required for audit trail).
    /// </summary>
    public required NoteSource Source { get; init; }

    /// <summary>
    /// AI provider name when prepended by an agent.
    /// </summary>
    public string? AiProvider { get; init; }

    /// <summary>
    /// AI model identifier when prepended by an agent.
    /// </summary>
    public string? AiModel { get; init; }

    /// <summary>
    /// Whether to add a newline after the prepended content.
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

    /// <summary>
    /// AI provider name when duplicated by an agent (e.g., "Anthropic", "Google", "OpenAI").
    /// </summary>
    public string? AiProvider { get; init; }

    /// <summary>
    /// AI model identifier when duplicated by an agent (e.g., "claude-3-5-sonnet", "gemini-2.0-flash").
    /// </summary>
    public string? AiModel { get; init; }
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
