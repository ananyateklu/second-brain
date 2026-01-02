using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.DTOs;
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

- **UpdateNote**: Modify a note's title, content, or tags (full content replacement)
  - Requires the note ID from previous operations
  - Can update one or more fields at a time
  - **Always use GetNote first** to see current content before editing
  - Use for complete rewrites or when changing multiple fields

- **EditNote**: Surgical edit with 4 operations in one tool
  - **operation='append'**: Add content to END of note (for lists, new sections)
  - **operation='prepend'**: Add content to BEGINNING of note (for headers, priority items)
  - **operation='insert'**: Insert at specific line number (lineNumber required)
  - **operation='replace'**: Find and replace text (oldText required, case-sensitive)
  - Does NOT require GetNote first (except for 'replace' to find exact text)
  - Examples:
    - 'add milk to list' -> EditNote with operation='append'
    - 'add URGENT at top' -> EditNote with operation='prepend'
    - 'fix typo X to Y' -> EditNote with operation='replace', oldText='X', content='Y'
    - 'insert after line 3' -> EditNote with operation='insert', lineNumber=3

- **DeleteNote**: Permanently remove a note
  - Only use when user explicitly requests deletion
  - This action cannot be undone

- **DuplicateNote**: Create a copy of an existing note
  - Use when user wants to use a note as a template
  - Can optionally specify a new title for the copy

### Choosing the Right Edit Approach

| Task | Tool & Operation |
|------|------------------|
| Fix a typo or specific word | EditNote operation='replace' |
| Rename a term throughout | EditNote operation='replace' allowMultiple=true |
| Add to end of note/list | EditNote operation='append' |
| Add at beginning of note | EditNote operation='prepend' |
| Insert in middle of note | EditNote operation='insert' lineNumber=N |
| Rewrite entire note | UpdateNote |
| Remove specific text | EditNote operation='replace' content='' |
| Change multiple fields | UpdateNote |

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

For precise edits (recommended):
1. **GetNote** to retrieve FULL current content
2. Identify the exact text to change
3. Use **ReplaceInNote** with exact oldText and newText

For additions:
- End of note: **AppendToNote**
- Beginning of note: **PrependToNote**
- Middle of note: **InsertInNote**

For complete rewrites:
1. **GetNote** to retrieve current content
2. **UpdateNote** with the new content

### Image Management (ManageContextImages)

Use **ManageContextImages** to handle images attached to the current message:

- **action='list'**: See available images (img1, img2, etc.)
  - Always call this first to see what images are available

- **action='create'**: Create a new note with image(s) attached
  - Requires: title, content, imageReferences (e.g., 'img1' or 'img1,img2')
  - Use when: 'save this image as a note', 'create a note with this image'

- **action='attach'**: Attach image(s) to an existing note
  - Requires: noteId, imageReferences
  - Use after 'find' action or when user provides note ID

- **action='find'**: Semantic search for note to attach images to
  - Requires: searchQuery
  - Returns: best match with confidence score
  - If score >= 80%: Proceed with 'attach' action
  - If score < 80%: Ask user to confirm the match first

### Image Workflow Examples

**Scenario: 'Save this image as a note'**
1. ManageContextImages(action='list') -> see available images
2. ManageContextImages(action='create', title='...', content='...', imageReferences='img1')

**Scenario: 'Attach this to my meeting notes'**
1. ManageContextImages(action='list') -> see available images
2. ManageContextImages(action='find', searchQuery='meeting notes')
3. If high confidence: ManageContextImages(action='attach', noteId='...', imageReferences='img1')
4. If low confidence: Ask user to confirm before attaching

**Image References**: Use 'img1', 'img2', etc. (1-indexed).
**Multi-Attach**: Same image can be attached to multiple notes.";

    [KernelFunction("CreateNote")]
    [Description("CREATE a new note. Both 'title' AND 'content' are REQUIRED. Search first to avoid duplicates. For long content: create first section, then AppendToNote. Examples: 'save this as a note', 'create a note called X', 'remember this for later' -> CreateNote.")]
    public async Task<string> CreateNoteAsync(
        [Description("Note title (required, descriptive)")] string title,
        [Description("Note content (required, cannot be empty)")] string content,
        [Description("Comma-separated tags for categorization")] string? tags = null)
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
                Source = NoteSource.Agent, // Agent operations always use Agent source
                AiProvider = CurrentProvider,
                AiModel = CurrentModel
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
    [Description("GET full note content by ID. REQUIRED before editing (UpdateNote, ReplaceInNote). Search/list tools only return previews. Examples: 'show me that note', 'read note X', 'what does it say' -> GetNote.")]
    public async Task<string> GetNoteAsync(
        [Description("Note ID from search/list results")] string noteId)
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
    [Description("REPLACE note's title, content, or tags entirely. Use for full rewrites or changing multiple fields. GetNote FIRST to see current content. For small changes use ReplaceInNote/AppendToNote instead. Examples: 'rewrite this note', 'change the title to X', 'replace all content' -> UpdateNote.")]
    public async Task<string> UpdateNoteAsync(
        [Description("Note ID to update")] string noteId,
        [Description("New title (omit to keep current)")] string? title = null,
        [Description("New content - REPLACES all existing (omit to keep)")] string? content = null,
        [Description("New tags - REPLACES all existing (omit to keep)")] string? tags = null)
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
                Source = NoteSource.Agent,
                AiProvider = CurrentProvider,
                AiModel = CurrentModel
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
    [Description("Move note to TRASH (soft delete). Can be restored later. Only use when user explicitly requests deletion. Consider ArchiveNote to hide without deleting. Examples: 'delete this note', 'remove that note', 'trash it' -> DeleteNote.")]
    public async Task<string> DeleteNoteAsync(
        [Description("Note ID to delete")] string noteId)
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
                SoftDelete = true // Soft delete - can be restored from trash
            };

            var result = await NoteOperationService.DeleteAsync(request);

            return result.Match(
                onSuccess: _ => $"Successfully moved note \"{noteTitle}\" (ID: {noteId}) to trash. Use RestoreDeletedNote to recover it, or PermanentlyDeleteNote to remove permanently.",
                onFailure: error => $"Error deleting note: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("deleting note", ex.Message);
        }
    }

    [KernelFunction("DuplicateNote")]
    [Description("COPY a note to use as template. Creates new note with same content, tags, folder. Examples: 'make a copy of this', 'duplicate that note', 'use this as template' -> DuplicateNote.")]
    public async Task<string> DuplicateNoteAsync(
        [Description("Note ID to copy")] string noteId,
        [Description("Title for copy (default: 'Copy of [original]')")] string? newTitle = null)
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
                Source = NoteSource.Agent,
                AiProvider = CurrentProvider,
                AiModel = CurrentModel
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

    [KernelFunction("EditNote")]
    [Description("Surgical edit: append/prepend/insert/replace text. operation='append' adds to end, 'prepend' adds to start, 'insert' at line#, 'replace' for find-replace. Examples: 'add milk to list' -> append, 'fix typo X to Y' -> replace.")]
    public async Task<string> EditNoteAsync(
        [Description("Note ID to edit")] string noteId,
        [Description("Operation: 'append'|'prepend'|'insert'|'replace'")] string operation,
        [Description("Content to add (for append/prepend/insert) or replacement text (for replace)")] string content,
        [Description("Line number for 'insert' (0=beginning)")] int? lineNumber = null,
        [Description("Text to find for 'replace' operation")] string? oldText = null,
        [Description("Replace all occurrences? (default: false)")] bool allowMultiple = false,
        [Description("Add blank line separator? (for append/prepend)")] bool addNewline = true)
    {
        var userError = ValidateUserContext("edit note");
        if (userError != null) return userError;

        if (string.IsNullOrWhiteSpace(noteId))
        {
            return "Error: Note ID is required.";
        }

        if (string.IsNullOrWhiteSpace(operation))
        {
            return "Error: Operation is required. Use 'append', 'prepend', 'insert', or 'replace'.";
        }

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        // Normalize operation to lowercase for comparison
        var op = operation.Trim().ToLowerInvariant();

        switch (op)
        {
            case "append":
            {
                if (string.IsNullOrWhiteSpace(content))
                {
                    return "Error: Content to append cannot be empty.";
                }

                try
                {
                    var request = new AppendToNoteOperationRequest
                    {
                        NoteId = noteId,
                        UserId = CurrentUserId,
                        ContentToAppend = content.Trim(),
                        AddNewline = addNewline,
                        Source = NoteSource.Agent,
                        AiProvider = CurrentProvider,
                        AiModel = CurrentModel
                    };

                    var result = await NoteOperationService.AppendAsync(request);

                    return result.Match(
                        onSuccess: opResult => $"Successfully appended content to note \"{opResult.Note.Title}\" (ID: {noteId}). Note now contains {opResult.Note.Content.Length} characters.",
                        onFailure: error => $"Error appending to note: {error.Message}"
                    );
                }
                catch (Exception ex)
                {
                    return CreateErrorResponse("appending to note", ex.Message);
                }
            }

            case "prepend":
            {
                if (string.IsNullOrWhiteSpace(content))
                {
                    return "Error: Content to prepend cannot be empty.";
                }

                try
                {
                    var request = new PrependToNoteOperationRequest
                    {
                        NoteId = noteId,
                        UserId = CurrentUserId,
                        ContentToPrepend = content.Trim(),
                        AddNewline = addNewline,
                        Source = NoteSource.Agent,
                        AiProvider = CurrentProvider,
                        AiModel = CurrentModel
                    };

                    var result = await NoteOperationService.PrependAsync(request);

                    return result.Match(
                        onSuccess: opResult => $"Successfully prepended content to note \"{opResult.Note.Title}\" (ID: {noteId}). Note now contains {opResult.Note.Content.Length} characters.",
                        onFailure: error => $"Error prepending to note: {error.Message}"
                    );
                }
                catch (Exception ex)
                {
                    return CreateErrorResponse("prepending to note", ex.Message);
                }
            }

            case "insert":
            {
                if (string.IsNullOrWhiteSpace(content))
                {
                    return "Error: Content to insert cannot be empty.";
                }

                if (lineNumber == null)
                {
                    return "Error: lineNumber is required for 'insert' operation. Use 0 to insert at beginning.";
                }

                if (lineNumber < 0)
                {
                    return "Error: lineNumber must be 0 or greater (0 = insert at beginning).";
                }

                try
                {
                    var request = new InsertInNoteOperationRequest
                    {
                        NoteId = noteId,
                        UserId = CurrentUserId,
                        LineNumber = lineNumber.Value,
                        TextToInsert = content,
                        Source = NoteSource.Agent,
                        AiProvider = CurrentProvider,
                        AiModel = CurrentModel
                    };

                    var result = await NoteOperationService.InsertInAsync(request);

                    return result.Match(
                        onSuccess: opResult =>
                        {
                            var position = lineNumber == 0 ? "at the beginning" : $"after line {lineNumber}";
                            return $"Successfully inserted text {position} in note \"{opResult.Note.Title}\" (ID: {noteId}).";
                        },
                        onFailure: error => $"Error inserting text: {error.Message}"
                    );
                }
                catch (Exception ex)
                {
                    return CreateErrorResponse("inserting text in note", ex.Message);
                }
            }

            case "replace":
            {
                if (string.IsNullOrEmpty(oldText))
                {
                    return "Error: oldText is required for 'replace' operation - specify the exact text to replace.";
                }

                try
                {
                    var request = new ReplaceInNoteOperationRequest
                    {
                        NoteId = noteId,
                        UserId = CurrentUserId,
                        OldText = oldText,
                        NewText = content ?? string.Empty,
                        AllowMultiple = allowMultiple,
                        Source = NoteSource.Agent,
                        AiProvider = CurrentProvider,
                        AiModel = CurrentModel
                    };

                    var result = await NoteOperationService.ReplaceInAsync(request);

                    return result.Match(
                        onSuccess: opResult =>
                        {
                            var action = string.IsNullOrEmpty(content) ? "removed" : "replaced";
                            var multipleNote = allowMultiple ? " (all occurrences)" : "";
                            return $"Successfully {action} text in note \"{opResult.Note.Title}\" (ID: {noteId}){multipleNote}.";
                        },
                        onFailure: error => $"Error replacing text: {error.Message}"
                    );
                }
                catch (Exception ex)
                {
                    return CreateErrorResponse("replacing text in note", ex.Message);
                }
            }

            default:
                return $"Error: Unknown operation '{operation}'. Valid operations: 'append', 'prepend', 'insert', 'replace'.";
        }
    }

    #region Image Management Tool

    [KernelFunction("ManageContextImages")]
    [Description("Handle images in current message. action='list' to see available images, 'create' to make new note with image, 'attach' to add to existing note, 'find' to search for note to attach to. Examples: 'save this image' -> create, 'attach to my project note' -> find then attach.")]
    public async Task<string> ManageContextImagesAsync(
        [Description("Action: 'list'|'create'|'attach'|'find'")] string action,
        [Description("Note title (for 'create')")] string? title = null,
        [Description("Note content (for 'create')")] string? content = null,
        [Description("Note ID (for 'attach')")] string? noteId = null,
        [Description("Image refs e.g. 'img1,img2' (for 'create'/'attach')")] string? imageReferences = null,
        [Description("Search query (for 'find')")] string? searchQuery = null,
        [Description("Tags (for 'create')")] string? tags = null)
    {
        var userError = ValidateUserContext("manage context images");
        if (userError != null) return userError;

        if (string.IsNullOrWhiteSpace(action))
        {
            return "Error: Action is required. Use 'list', 'create', 'attach', or 'find'.";
        }

        var normalizedAction = action.Trim().ToLowerInvariant();

        switch (normalizedAction)
        {
            case "list":
            {
                if (ContextImages.Count == 0)
                {
                    return "No images attached to the current message. Ask the user to attach images first if they want to save images to notes.";
                }

                var listResponse = new
                {
                    type = "context_images",
                    message = $"Found {ContextImages.Count} image(s) in current message",
                    images = ContextImages.Select(i => new
                    {
                        reference = $"img{i.Index + 1}",
                        referenceId = i.ReferenceId,
                        fileName = i.FileName ?? "unnamed",
                        mediaType = i.MediaType,
                        isAttached = i.IsAttached,
                        status = i.IsAttached ? "already attached to a note" : "available"
                    }).ToList(),
                    usage = "Use these references (e.g., 'img1') with action='create' or action='attach'"
                };

                return JsonSerializer.Serialize(listResponse);
            }

            case "create":
            {
                if (string.IsNullOrWhiteSpace(title))
                    return "Error: Note title is required for 'create' action.";

                if (string.IsNullOrWhiteSpace(content))
                    return "Error: Note content is required for 'create' action.";

                if (string.IsNullOrWhiteSpace(imageReferences))
                    return $"Error: imageReferences is required for 'create' action. Available: {GetContextImagesSummary()}";

                if (NoteOperationService == null)
                    return "Error: Note operation service not available.";

                // Parse and validate image references
                var (images, parseError) = ParseImageReferences(imageReferences);
                if (parseError != null)
                    return $"Error: {parseError}";

                if (images.Count == 0)
                    return $"Error: No valid image references provided. Available: {GetContextImagesSummary()}";

                try
                {
                    // Convert context images to NoteImageDto
                    var imageDtos = images.Select(img => new NoteImageDto
                    {
                        Base64Data = img.Base64Data,
                        MediaType = img.MediaType,
                        FileName = img.FileName
                    }).ToList();

                    var createRequest = new CreateNoteOperationRequest
                    {
                        UserId = CurrentUserId,
                        Title = title.Trim(),
                        Content = content.Trim(),
                        Tags = ParseTags(tags),
                        Images = imageDtos,
                        Source = NoteSource.Agent,
                        AiProvider = CurrentProvider,
                        AiModel = CurrentModel
                    };

                    var createResult = await NoteOperationService.CreateAsync(createRequest);

                    return createResult.Match(
                        onSuccess: op =>
                        {
                            // Mark images as attached for multi-attach tracking
                            foreach (var img in images)
                            {
                                img.IsAttached = true;
                            }

                            var tagInfo = op.Note.Tags.Any()
                                ? $" with tags: {string.Join(", ", op.Note.Tags)}"
                                : "";
                            return $"Successfully created note \"{op.Note.Title}\" (ID: {op.Note.Id}) with {images.Count} image(s) attached{tagInfo}. The images will be processed for AI descriptions in the background.";
                        },
                        onFailure: error => $"Error creating note with image: {error.Message}"
                    );
                }
                catch (Exception ex)
                {
                    return CreateErrorResponse("creating note with image", ex.Message);
                }
            }

            case "attach":
            {
                if (string.IsNullOrWhiteSpace(noteId))
                    return "Error: noteId is required for 'attach' action.";

                if (string.IsNullOrWhiteSpace(imageReferences))
                    return $"Error: imageReferences is required for 'attach' action. Available: {GetContextImagesSummary()}";

                if (NoteOperationService == null)
                    return "Error: Note operation service not available.";

                // Verify note exists and user owns it
                var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);
                if (note == null)
                    return $"Note with ID '{noteId}' not found or you don't have permission.";

                // Parse and validate image references
                var (images, parseError) = ParseImageReferences(imageReferences);
                if (parseError != null)
                    return $"Error: {parseError}";

                if (images.Count == 0)
                    return $"Error: No valid image references provided. Available: {GetContextImagesSummary()}";

                try
                {
                    // Convert context images to NoteImageDto
                    var imageDtos = images.Select(img => new NoteImageDto
                    {
                        Base64Data = img.Base64Data,
                        MediaType = img.MediaType,
                        FileName = img.FileName
                    }).ToList();

                    var updateRequest = new UpdateNoteOperationRequest
                    {
                        NoteId = noteId,
                        UserId = CurrentUserId,
                        Images = imageDtos,
                        Source = NoteSource.Agent,
                        AiProvider = CurrentProvider,
                        AiModel = CurrentModel
                    };

                    var updateResult = await NoteOperationService.UpdateAsync(updateRequest);

                    return updateResult.Match(
                        onSuccess: op =>
                        {
                            // Mark images as attached for multi-attach tracking
                            foreach (var img in images)
                            {
                                img.IsAttached = true;
                            }

                            return $"Successfully attached {images.Count} image(s) to note \"{note.Title}\" (ID: {noteId}). The images will be processed for AI descriptions in the background.";
                        },
                        onFailure: error => $"Error attaching images: {error.Message}"
                    );
                }
                catch (Exception ex)
                {
                    return CreateErrorResponse("attaching image to note", ex.Message);
                }
            }

            case "find":
            {
                if (RagService == null)
                    return "Error: Search service not available.";

                if (string.IsNullOrWhiteSpace(searchQuery))
                    return "Error: searchQuery is required for 'find' action.";

                try
                {
                    // Use semantic search to find matching notes via RetrieveContextAsync
                    var ragContext = await RagService.RetrieveContextAsync(
                        query: searchQuery.Trim(),
                        userId: CurrentUserId,
                        topK: 3,
                        options: UserRagOptions);

                    if (ragContext.RetrievedNotes.Count == 0)
                    {
                        return JsonSerializer.Serialize(new
                        {
                            type = "note_search_result",
                            found = false,
                            message = "No matching notes found. Consider using action='create' to make a new note with the image instead.",
                            contextImages = GetContextImagesSummary()
                        });
                    }

                    var topResult = ragContext.RetrievedNotes[0];
                    var confidenceThreshold = 0.8f;
                    var isHighConfidence = topResult.SimilarityScore >= confidenceThreshold;

                    var findResponse = new
                    {
                        type = "note_search_result",
                        found = true,
                        topMatch = new
                        {
                            noteId = topResult.NoteId,
                            title = topResult.NoteTitle,
                            score = topResult.SimilarityScore,
                            scorePercent = $"{topResult.SimilarityScore:P0}",
                            preview = topResult.Content?.Length > 100
                                ? topResult.Content[..100] + "..."
                                : topResult.Content
                        },
                        isHighConfidence,
                        recommendation = isHighConfidence
                            ? $"High confidence match ({topResult.SimilarityScore:P0}). You can proceed with action='attach', noteId='{topResult.NoteId}'."
                            : $"Best match is \"{topResult.NoteTitle}\" but confidence is only {topResult.SimilarityScore:P0}. Ask the user to confirm before attaching.",
                        alternatives = ragContext.RetrievedNotes.Skip(1).Select(r => new
                        {
                            noteId = r.NoteId,
                            title = r.NoteTitle,
                            score = r.SimilarityScore,
                            scorePercent = $"{r.SimilarityScore:P0}"
                        }).ToList(),
                        contextImages = GetContextImagesSummary()
                    };

                    return JsonSerializer.Serialize(findResponse);
                }
                catch (Exception ex)
                {
                    return CreateErrorResponse("searching for note", ex.Message);
                }
            }

            default:
                return $"Error: Unknown action '{action}'. Valid actions: 'list', 'create', 'attach', 'find'.";
        }
    }

    #endregion
}
