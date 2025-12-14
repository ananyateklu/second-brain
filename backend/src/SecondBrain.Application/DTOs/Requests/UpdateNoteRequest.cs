using System.Text.Json;

namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for updating an existing note.
/// All properties are nullable to support partial updates - only provided fields will be updated.
/// </summary>
public sealed class UpdateNoteRequest
{
    /// <summary>
    /// Title of the note (null = don't update)
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Content/body of the note (null = don't update, markdown format for search and display)
    /// </summary>
    public string? Content { get; set; }

    /// <summary>
    /// TipTap/ProseMirror JSON representation of the note content (null = don't update).
    /// This is the canonical format for UI editing - provides consistent
    /// formatting and eliminates lossy conversions between formats.
    /// </summary>
    public JsonElement? ContentJson { get; set; }

    /// <summary>
    /// Flag to explicitly indicate ContentJson should be updated (to distinguish null from "clear ContentJson")
    /// </summary>
    public bool UpdateContentJson { get; set; }

    /// <summary>
    /// List of tags associated with the note (null = don't update)
    /// </summary>
    public List<string>? Tags { get; set; }

    /// <summary>
    /// Whether the note is archived (null = don't update)
    /// </summary>
    public bool? IsArchived { get; set; }

    /// <summary>
    /// Folder/category for the note (null = don't update, empty string = remove from folder)
    /// </summary>
    public string? Folder { get; set; }

    /// <summary>
    /// Flag to explicitly indicate folder should be updated (to distinguish null from "remove folder")
    /// </summary>
    public bool UpdateFolder { get; set; }

    /// <summary>
    /// New images to add to the note
    /// </summary>
    public List<NoteImageDto>? Images { get; set; }

    /// <summary>
    /// IDs of existing images to delete from the note
    /// </summary>
    public List<string>? DeletedImageIds { get; set; }
}

