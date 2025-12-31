using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Enums;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Plugin handling trash/soft-delete operations for notes:
/// ListDeletedNotes, RestoreDeletedNote, PermanentlyDeleteNote.
/// </summary>
public class NoteTrashPlugin : NotePluginBase
{
    public NoteTrashPlugin(
        IParallelNoteRepository noteRepository,
        IRagService? ragService = null,
        RagSettings? ragSettings = null,
        IStructuredOutputService? structuredOutputService = null,
        INoteOperationService? noteOperationService = null)
        : base(noteRepository, ragService, ragSettings, structuredOutputService, noteOperationService)
    {
    }

    public override string CapabilityId => "notes-trash";
    public override string DisplayName => "Notes Trash";
    public override string Description => "Manage soft-deleted notes in the trash";

    public override string GetPluginName() => "NotesTrash";

    public override string GetSystemPromptAddition() => @"
### Trash Management Tools

- **ListDeletedNotes**: View notes in the trash
  - Shows soft-deleted notes that can be restored
  - Use when user asks ""show trash"" or ""show deleted notes""

- **RestoreDeletedNote**: Restore a note from trash
  - Brings the note back to active notes
  - Use when user asks ""restore this note"" or ""undelete""

- **PermanentlyDeleteNote**: Permanently delete a note from trash
  - This action cannot be undone - the note is gone forever
  - Only use when user explicitly confirms permanent deletion";

    [KernelFunction("ListDeletedNotes")]
    [Description("Lists all notes in the trash (soft-deleted notes). These notes can be restored or permanently deleted.")]
    public async Task<string> ListDeletedNotesAsync(
        [Description("Maximum number of deleted notes to list (default: 20)")] int maxResults = 20)
    {
        var userError = ValidateUserContext("list deleted notes");
        if (userError != null) return userError;

        try
        {
            var deletedNotes = await NoteRepository.GetDeletedByUserIdAsync(CurrentUserId);
            var notesList = deletedNotes
                .OrderByDescending(n => n.DeletedAt)
                .Take(maxResults)
                .ToList();

            if (!notesList.Any())
            {
                return "Your trash is empty. No deleted notes found.";
            }

            var noteData = notesList.Select(n => new
            {
                id = n.Id,
                title = n.Title,
                preview = GetContentPreview(n.Content),
                tags = n.Tags,
                folder = n.Folder,
                deletedAt = n.DeletedAt,
                deletedBy = n.DeletedBy,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var response = new
            {
                type = "deletedNotes",
                message = $"Found {notesList.Count} deleted note(s) in trash",
                notes = noteData,
                hint = "Use RestoreDeletedNote to restore a note, or PermanentlyDeleteNote to remove it forever."
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("listing deleted notes", ex.Message);
        }
    }

    [KernelFunction("RestoreDeletedNote")]
    [Description("Restores a soft-deleted note from the trash back to active notes. Use this when the user wants to recover a deleted note.")]
    public async Task<string> RestoreDeletedNoteAsync(
        [Description("The ID of the deleted note to restore")] string noteId)
    {
        var userError = ValidateUserContext("restore deleted note");
        if (userError != null) return userError;

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            // Get the deleted notes to verify the note exists in trash
            var deletedNotes = await NoteRepository.GetDeletedByUserIdAsync(CurrentUserId);
            var deletedNote = deletedNotes.FirstOrDefault(n => n.Id == noteId);

            if (deletedNote == null)
            {
                return $"Note with ID \"{noteId}\" not found in trash. It may have already been restored or permanently deleted.";
            }

            var noteTitle = deletedNote.Title;

            var result = await NoteOperationService.RestoreDeletedAsync(noteId, CurrentUserId, NoteSource.Agent);

            return result.Match(
                onSuccess: op =>
                {
                    var response = new
                    {
                        type = "noteRestored",
                        message = $"Successfully restored note \"{noteTitle}\" from trash",
                        noteId = op.Note.Id,
                        noteTitle = op.Note.Title,
                        restoredNote = new
                        {
                            id = op.Note.Id,
                            title = op.Note.Title,
                            preview = GetContentPreview(op.Note.Content),
                            tags = op.Note.Tags,
                            folder = op.Note.Folder,
                            isArchived = op.Note.IsArchived
                        }
                    };
                    return JsonSerializer.Serialize(response);
                },
                onFailure: error => $"Error restoring note: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("restoring deleted note", ex.Message);
        }
    }

    [KernelFunction("PermanentlyDeleteNote")]
    [Description("Permanently deletes a note from the trash. WARNING: This action cannot be undone. Only use when the user explicitly confirms permanent deletion.")]
    public async Task<string> PermanentlyDeleteNoteAsync(
        [Description("The ID of the deleted note to permanently remove")] string noteId)
    {
        var userError = ValidateUserContext("permanently delete note");
        if (userError != null) return userError;

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            // Get the deleted notes to verify the note exists in trash
            var deletedNotes = await NoteRepository.GetDeletedByUserIdAsync(CurrentUserId);
            var deletedNote = deletedNotes.FirstOrDefault(n => n.Id == noteId);

            if (deletedNote == null)
            {
                return $"Note with ID \"{noteId}\" not found in trash. It may have already been permanently deleted or was never in the trash.";
            }

            var noteTitle = deletedNote.Title;

            var result = await NoteOperationService.PermanentDeleteAsync(noteId, CurrentUserId);

            return result.Match(
                onSuccess: success =>
                {
                    if (success)
                    {
                        return $"Permanently deleted note \"{noteTitle}\" (ID: {noteId}). This action cannot be undone.";
                    }
                    return $"Failed to permanently delete note \"{noteTitle}\".";
                },
                onFailure: error => $"Error permanently deleting note: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("permanently deleting note", ex.Message);
        }
    }
}
