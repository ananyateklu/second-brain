using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Enums;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Plugin handling core CRUD operations for notes:
/// Create, Get, Update, Delete, Append, Duplicate.
/// Uses INoteOperationService for all mutations to ensure consistent version tracking.
/// </summary>
public class NoteCrudPlugin : NotePluginBase
{
    public NoteCrudPlugin(
        IParallelNoteRepository noteRepository,
        IRagService? ragService = null,
        RagSettings? ragSettings = null,
        IStructuredOutputService? structuredOutputService = null,
        INoteOperationService? noteOperationService = null)
        : base(noteRepository, ragService, ragSettings, structuredOutputService, noteOperationService)
    {
    }

    public override string CapabilityId => "notes-crud";
    public override string DisplayName => "Notes CRUD";
    public override string Description => "Create, read, update, and delete notes";

    public override string GetPluginName() => "NotesCrud";

    public override string GetSystemPromptAddition() => @"
### Core Note Operations

- **CreateNote**: Create a new note with title and content (BOTH REQUIRED)
  - IMPORTANT: You MUST provide BOTH 'title' AND 'content' parameters - content cannot be empty
  - If you have a lot of content, include all of it in the 'content' parameter - do not truncate
  - Use when user wants to save information or remember something
  - Always provide meaningful titles that summarize the content
  - Suggest relevant tags based on content (e.g., 'meeting', 'recipe', 'project')

- **GetNote**: Retrieve FULL note content by ID
  - **REQUIRED** to view complete note contents
  - Always use this before editing or when user needs to see full content
  - List/search operations only return previews - use GetNote for full content

- **UpdateNote**: Modify a note's title, content, or tags
  - Requires the note ID from previous operations
  - Can update one or more fields at a time
  - **Always use GetNote first** to see current content before editing

- **AppendToNote**: Add content to the end of an existing note
  - Use for adding items to lists, appending new information
  - Much simpler than GetNote + UpdateNote when just adding content
  - Example: 'add milk to my grocery list'

- **DeleteNote**: Permanently remove a note
  - Only use when user explicitly requests deletion
  - This action cannot be undone

- **DuplicateNote**: Create a copy of an existing note
  - Use when user wants to use a note as a template
  - Can optionally specify a new title for the copy

### Large Content Strategy (IMPORTANT)

When creating notes with substantial content (multiple sections, paragraphs, or lists):

**Step 1: Plan and Announce**
- Before creating, state: ""I'll create this note in X sections: [list sections briefly]""

**Step 2: Create with Initial Content**
- Use CreateNote with the title and FIRST section only
- Keep initial content moderate (1-3 paragraphs max)

**Step 3: Capture the Note ID**
- The CreateNote response includes the note ID
- Explicitly acknowledge: ""Note created with ID: xxx""

**Step 4: Append Remaining Sections**
- Use AppendToNote for each additional section
- Reference the note ID from Step 3

### Content Editing Pattern

When modifying note content:
1. **GetNote** to retrieve FULL current content (required!)
2. Modify the content as requested
3. UpdateNote with the new content

For simple additions, use AppendToNote instead.";

    [KernelFunction("CreateNote")]
    [Description("Creates a new note with title and content. IMPORTANT: Both parameters are REQUIRED. For notes with multiple sections, create with the first section only, then use AppendToNote for remaining sections.")]
    public async Task<string> CreateNoteAsync(
        [Description("The title of the note (required)")] string title,
        [Description("The full text content of the note - REQUIRED, must not be empty or omitted")] string content,
        [Description("Comma-separated tags for categorizing the note (optional)")] string? tags = null)
    {
        var userError = ValidateUserContext("create note");
        if (userError != null) return userError;

        if (string.IsNullOrWhiteSpace(title))
        {
            return "Error: Note title is required and cannot be empty.";
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            return "Error: The 'content' parameter is required but was not provided. You must call CreateNote with BOTH 'title' AND 'content' parameters in the same tool call. Please retry with: {\"title\": \"your title\", \"content\": \"your note content here\"}";
        }

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            var request = new CreateNoteOperationRequest
            {
                UserId = CurrentUserId,
                Title = title.Trim(),
                Content = content.Trim(),
                Tags = ParseTags(tags),
                Source = NoteSource.Agent // Agent operations always use Agent source
            };

            var result = await NoteOperationService.CreateAsync(request);

            return result.Match(
                onSuccess: op =>
                {
                    var tagInfo = op.Note.Tags.Any()
                        ? $" with tags: {string.Join(", ", op.Note.Tags)}"
                        : "";
                    return $"Successfully created note \"{op.Note.Title}\" (ID: {op.Note.Id}){tagInfo}. Remember this note ID for future reference in this conversation.";
                },
                onFailure: error => $"Error creating note: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("creating note", ex.Message);
        }
    }

    [KernelFunction("GetNote")]
    [Description("Retrieves a specific note by its ID. Use this when you need to read the full content of a note.")]
    public async Task<string> GetNoteAsync(
        [Description("The ID of the note to retrieve")] string noteId)
    {
        var userError = ValidateUserContext("get note");
        if (userError != null) return userError;

        try
        {
            var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to access it.";
            }

            var response = new
            {
                type = "notes",
                message = $"Retrieved note \"{note.Title}\"",
                notes = new[] { MapToDetail(note) }
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("getting note", ex.Message);
        }
    }

    [KernelFunction("UpdateNote")]
    [Description("Updates an existing note's title, content, or tags. Use this when the user wants to modify or edit an existing note.")]
    public async Task<string> UpdateNoteAsync(
        [Description("The ID of the note to update")] string noteId,
        [Description("New title for the note (optional, leave empty to keep current)")] string? title = null,
        [Description("New content for the note (optional, leave empty to keep current)")] string? content = null,
        [Description("New comma-separated tags (optional, leave empty to keep current)")] string? tags = null)
    {
        var userError = ValidateUserContext("update note");
        if (userError != null) return userError;

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            // First get the note to verify it exists and get current state for feedback
            var existingNote = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);
            if (existingNote == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to update it.";
            }

            var previousTags = existingNote.Tags.ToList();

            var request = new UpdateNoteOperationRequest
            {
                NoteId = noteId,
                UserId = CurrentUserId,
                Title = string.IsNullOrWhiteSpace(title) ? null : title.Trim(),
                Content = string.IsNullOrWhiteSpace(content) ? null : content.Trim(),
                Tags = tags != null ? ParseTags(tags) : null,
                Source = NoteSource.Agent
            };

            var result = await NoteOperationService.UpdateAsync(request);

            return result.Match(
                onSuccess: op =>
                {
                    if (!op.HasChanges)
                    {
                        return $"No changes made to note \"{op.Note.Title}\" (ID: {noteId}).";
                    }

                    // Build detailed feedback about changes
                    var changeDetails = new List<string>();
                    foreach (var change in op.Changes)
                    {
                        if (change == "tags")
                        {
                            var added = op.Note.Tags.Except(previousTags).ToList();
                            var removed = previousTags.Except(op.Note.Tags).ToList();

                            if (added.Any())
                                changeDetails.Add($"added tags: {string.Join(", ", added)}");
                            if (removed.Any())
                                changeDetails.Add($"removed tags: {string.Join(", ", removed)}");
                            if (!added.Any() && !removed.Any())
                                changeDetails.Add($"updated tags to: {string.Join(", ", op.Note.Tags)}");
                        }
                        else
                        {
                            changeDetails.Add($"updated {change}");
                        }
                    }

                    return $"Successfully updated note \"{op.Note.Title}\" (ID: {noteId}). Changes: {string.Join(", ", changeDetails)}.";
                },
                onFailure: error => $"Error updating note: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("updating note", ex.Message);
        }
    }

    [KernelFunction("DeleteNote")]
    [Description("Permanently deletes a note by its ID. Use this when the user explicitly wants to delete or remove a note entirely.")]
    public async Task<string> DeleteNoteAsync(
        [Description("The ID of the note to delete")] string noteId)
    {
        var userError = ValidateUserContext("delete note");
        if (userError != null) return userError;

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            // Get note first to capture title for feedback
            var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);
            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to delete it.";
            }

            var noteTitle = note.Title;

            var request = new DeleteNoteOperationRequest
            {
                NoteId = noteId,
                UserId = CurrentUserId,
                Source = NoteSource.Agent,
                SoftDelete = false // Agent deletes are permanent
            };

            var result = await NoteOperationService.DeleteAsync(request);

            return result.Match(
                onSuccess: _ => $"Successfully deleted note \"{noteTitle}\" (ID: {noteId}).",
                onFailure: error => $"Error deleting note: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("deleting note", ex.Message);
        }
    }

    [KernelFunction("AppendToNote")]
    [Description("Appends content to the end of an existing note. Use this when the user wants to add something to an existing note, like adding items to a list or adding new information.")]
    public async Task<string> AppendToNoteAsync(
        [Description("The ID of the note to append to")] string noteId,
        [Description("The content to append to the note")] string contentToAppend,
        [Description("Whether to add a newline before the appended content (default: true)")] bool addNewline = true)
    {
        var userError = ValidateUserContext("append to note");
        if (userError != null) return userError;

        if (string.IsNullOrWhiteSpace(contentToAppend))
        {
            return "Error: Content to append cannot be empty.";
        }

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            var request = new AppendToNoteOperationRequest
            {
                NoteId = noteId,
                UserId = CurrentUserId,
                ContentToAppend = contentToAppend.Trim(),
                AddNewline = addNewline,
                Source = NoteSource.Agent
            };

            var result = await NoteOperationService.AppendAsync(request);

            return result.Match(
                onSuccess: op => $"Successfully appended content to note \"{op.Note.Title}\" (ID: {noteId}). Note now contains {op.Note.Content.Length} characters. Continue with additional AppendToNote calls if more sections remain.",
                onFailure: error => $"Error appending to note: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("appending to note", ex.Message);
        }
    }

    [KernelFunction("DuplicateNote")]
    [Description("Creates a copy of an existing note. Use this when the user wants to duplicate a note as a template or starting point for a new note.")]
    public async Task<string> DuplicateNoteAsync(
        [Description("The ID of the note to duplicate")] string noteId,
        [Description("Optional new title for the duplicate (default: adds 'Copy of' prefix)")] string? newTitle = null)
    {
        var userError = ValidateUserContext("duplicate note");
        if (userError != null) return userError;

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            var request = new DuplicateNoteOperationRequest
            {
                SourceNoteId = noteId,
                UserId = CurrentUserId,
                NewTitle = newTitle,
                Source = NoteSource.Agent
            };

            var result = await NoteOperationService.DuplicateAsync(request);

            return result.Match(
                onSuccess: op =>
                {
                    var tagInfo = op.Note.Tags.Any()
                        ? $" with tags: {string.Join(", ", op.Note.Tags)}"
                        : "";
                    var folderInfo = !string.IsNullOrEmpty(op.Note.Folder)
                        ? $" in folder \"{op.Note.Folder}\""
                        : "";
                    return $"Successfully duplicated note as \"{op.Note.Title}\" (ID: {op.Note.Id}){tagInfo}{folderInfo}.";
                },
                onFailure: error => $"Error duplicating note: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("duplicating note", ex.Message);
        }
    }
}
