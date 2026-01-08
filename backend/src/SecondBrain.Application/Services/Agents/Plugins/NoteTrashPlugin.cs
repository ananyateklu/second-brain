using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Enums;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Plugin handling trash/soft-delete operations for notes:
/// ManageTrash (list, restore, delete actions).
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

- **ManageTrash**: Unified trash management (action: 'list'|'restore'|'delete')
  - action='list': View deleted notes in trash (use when user asks ""show trash"")
  - action='restore': Recover a deleted note (use when user asks ""restore this note"")
  - action='delete': Permanently remove a note - CANNOT BE UNDONE (only when user explicitly confirms)
  - Examples: ""show trash"" -> action='list', ""restore note X"" -> action='restore' + noteId, ""empty this from trash"" -> action='delete' + noteId";

    [KernelFunction("ManageTrash")]
    [Description("Manage deleted notes. action='list' to view trash, 'restore' to recover a note, 'delete' to permanently remove (CANNOT BE UNDONE). Examples: 'show trash' -> list, 'restore note X' -> restore, 'empty this from trash' -> delete.")]
    public async Task<string> ManageTrashAsync(
        [Description("Action: 'list'|'restore'|'delete'")] string action,
        [Description("Note ID (for 'restore'/'delete')")] string? noteId = null,
        [Description("Max results (for 'list')")] int maxResults = 20)
    {
        var userError = ValidateUserContext("manage trash");
        if (userError != null) return userError;

        var normalizedAction = action.ToLowerInvariant();

        // Handle "list" action
        if (normalizedAction == "list")
        {
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

                return JsonSerializer.Serialize(new
                {
                    type = "deletedNotes",
                    message = $"Found {notesList.Count} deleted note(s) in trash",
                    notes = noteData,
                    hint = "Use action='restore' with noteId to restore a note, or action='delete' with noteId to remove it forever."
                });
            }
            catch (Exception ex)
            {
                return CreateErrorResponse("listing deleted notes", ex.Message);
            }
        }

        // Handle "restore" action
        if (normalizedAction == "restore")
        {
            if (string.IsNullOrWhiteSpace(noteId))
            {
                return "Note ID is required for 'restore' action.";
            }

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
                        return JsonSerializer.Serialize(new
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
                        });
                    },
                    onFailure: error => $"Error restoring note: {error.Message}"
                );
            }
            catch (Exception ex)
            {
                return CreateErrorResponse("restoring deleted note", ex.Message);
            }
        }

        // Handle "delete" action
        if (normalizedAction == "delete")
        {
            if (string.IsNullOrWhiteSpace(noteId))
            {
                return "Note ID is required for 'delete' action.";
            }

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

        return $"Unknown action '{action}'. Valid actions are: 'list', 'restore', 'delete'.";
    }

    /// <summary>
    /// Check if the ManageTrash operation requires confirmation.
    /// Returns details for the confirmation dialog if action='delete' (permanent delete).
    /// </summary>
    public async Task<ToolConfirmationDetails?> GetConfirmationDetailsAsync(string action, string? noteId)
    {
        // Only require confirmation for permanent delete
        if (action.ToLowerInvariant() != "delete" || string.IsNullOrWhiteSpace(noteId))
        {
            return null;
        }

        var userError = ValidateUserContext("check confirmation");
        if (userError != null)
        {
            return null;
        }

        try
        {
            var deletedNotes = await NoteRepository.GetDeletedByUserIdAsync(CurrentUserId);
            var note = deletedNotes.FirstOrDefault(n => n.Id == noteId);

            if (note == null)
            {
                return null;
            }

            return new ToolConfirmationDetails
            {
                Operation = "permanent_delete",
                ItemId = noteId,
                ItemTitle = note.Title,
                WarningMessage = $"This will permanently delete \"{note.Title}\". This action cannot be undone."
            };
        }
        catch
        {
            return null;
        }
    }
}
