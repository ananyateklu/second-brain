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

- **AppendToNote**: Add content to the end of an existing note
  - Use for adding items to lists, appending new information
  - Much simpler than GetNote + UpdateNote when just adding content
  - Example: 'add milk to my grocery list'

- **PrependToNote**: Add content to the beginning of an existing note
  - Use for adding headers, introductions, or priority items at the top
  - Example: 'add URGENT header to meeting notes'

- **ReplaceInNote**: Find and replace specific text within a note (surgical edit)
  - Use for precise edits: fixing typos, renaming terms, updating specific phrases
  - Requires exact text match (case-sensitive, whitespace-sensitive)
  - By default, fails if text appears multiple times (safety feature)
  - Set allowMultiple=true to replace all occurrences
  - Use empty newText to delete text entirely
  - Example: 'change all instances of 2024 to 2025'

- **InsertInNote**: Insert text at a specific line number
  - Line 0 = insert at the very beginning
  - Line N = insert after line N
  - Lines beyond note length append at end
  - Use for inserting content in the middle of a note
  - Example: 'add a new item between line 3 and 4'

- **DeleteNote**: Permanently remove a note
  - Only use when user explicitly requests deletion
  - This action cannot be undone

- **DuplicateNote**: Create a copy of an existing note
  - Use when user wants to use a note as a template
  - Can optionally specify a new title for the copy

### Choosing the Right Edit Tool

| Task | Best Tool |
|------|-----------|
| Fix a typo or specific word | ReplaceInNote |
| Rename a term throughout | ReplaceInNote with allowMultiple=true |
| Add to end of note/list | AppendToNote |
| Add at beginning of note | PrependToNote |
| Insert in middle of note | InsertInNote |
| Rewrite entire note | UpdateNote |
| Remove specific text | ReplaceInNote with newText="""" |
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

### Image Attachment Tools

When the user attaches images to their message, you can save them to notes:

- **ListContextImages**: See what images are available in the current message
  - Returns image references (img1, img2, etc.) for use in other tools
  - Always call this first to see available images

- **CreateNoteWithImage**: Create a new note with image(s) attached
  - Use when user says 'save this image as a note' or 'create a note with this image'
  - Requires title, content, and image references (e.g., 'img1' or 'img1,img2')

- **AttachImageToNote**: Attach image(s) to an existing note
  - Use when user says 'attach this to my X note' or 'add this image to note Y'
  - Use FindNoteForImageAttachment first if user doesn't provide exact note ID

- **FindNoteForImageAttachment**: Search for a note to attach images to
  - Uses semantic search with confidence score
  - If score >= 80%: Proceed with AttachImageToNote automatically
  - If score < 80%: Ask user to confirm the match before attaching

### Image Attachment Workflow

**Scenario: 'Save this image as a note'**
1. Call **ListContextImages** to see available images
2. Call **CreateNoteWithImage** with title, content, and 'img1' (or multiple like 'img1,img2')

**Scenario: 'Attach this to my meeting notes'**
1. Call **ListContextImages** to see available images
2. Call **FindNoteForImageAttachment** with 'meeting notes'
3. If high confidence (>=80%): Call **AttachImageToNote** with the noteId
4. If low confidence (<80%): Show the match and ask user to confirm

**Image Reference Format**: Use 'img1', 'img2', etc. to reference images (1-indexed).

**Multi-Attach**: The same image can be attached to multiple notes. After attaching, the image will show as '[attached]' in ListContextImages but can still be used again.";

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

    [KernelFunction("AppendToNote")]
    [Description("ADD text to END of note. Does NOT replace existing content. Does NOT require GetNote first. Use for adding list items, new sections, logging info. Examples: 'add milk to grocery list', 'append these notes', 'put this at the end' -> AppendToNote.")]
    public async Task<string> AppendToNoteAsync(
        [Description("Note ID to append to")] string noteId,
        [Description("Text to ADD at end (existing content preserved)")] string contentToAppend,
        [Description("Add blank line before new content (default: true)")] bool addNewline = true)
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
                Source = NoteSource.Agent,
                AiProvider = CurrentProvider,
                AiModel = CurrentModel
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

    [KernelFunction("ReplaceInNote")]
    [Description("FIND and REPLACE specific text. Use for typo fixes, term updates, removing text. Requires EXACT match (case-sensitive). Use GetNote first to find exact text. Use newText='' to delete. Examples: 'fix typo X to Y', 'change 2024 to 2025', 'remove the word draft' -> ReplaceInNote.")]
    public async Task<string> ReplaceInNoteAsync(
        [Description("Note ID to modify")] string noteId,
        [Description("EXACT text to find (case-sensitive, include spaces)")] string oldText,
        [Description("Replacement text (empty '' to delete)")] string newText,
        [Description("Replace ALL matches? (default: false = fail if multiple)")] bool allowMultiple = false)
    {
        var userError = ValidateUserContext("replace in note");
        if (userError != null) return userError;

        if (string.IsNullOrEmpty(oldText))
        {
            return "Error: oldText cannot be empty - specify the exact text to replace.";
        }

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            var request = new ReplaceInNoteOperationRequest
            {
                NoteId = noteId,
                UserId = CurrentUserId,
                OldText = oldText,
                NewText = newText ?? string.Empty,
                AllowMultiple = allowMultiple,
                Source = NoteSource.Agent,
                AiProvider = CurrentProvider,
                AiModel = CurrentModel
            };

            var result = await NoteOperationService.ReplaceInAsync(request);

            return result.Match(
                onSuccess: op =>
                {
                    var action = string.IsNullOrEmpty(newText) ? "removed" : "replaced";
                    var multipleNote = allowMultiple ? " (all occurrences)" : "";
                    return $"Successfully {action} text in note \"{op.Note.Title}\" (ID: {noteId}){multipleNote}.";
                },
                onFailure: error => $"Error replacing text: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("replacing text in note", ex.Message);
        }
    }

    [KernelFunction("InsertInNote")]
    [Description("INSERT text at specific LINE NUMBER. Line 0 = very beginning, line N = after line N. Use for adding content in the middle of a note. For end use AppendToNote, for beginning use PrependToNote. Examples: 'add a line after line 3', 'insert between X and Y' -> InsertInNote.")]
    public async Task<string> InsertInNoteAsync(
        [Description("Note ID to modify")] string noteId,
        [Description("Line number to insert AFTER (0 = at start)")] int lineNumber,
        [Description("Text to insert")] string textToInsert)
    {
        var userError = ValidateUserContext("insert in note");
        if (userError != null) return userError;

        if (string.IsNullOrEmpty(textToInsert))
        {
            return "Error: textToInsert cannot be empty.";
        }

        if (lineNumber < 0)
        {
            return "Error: lineNumber must be 0 or greater (0 = insert at beginning).";
        }

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            var request = new InsertInNoteOperationRequest
            {
                NoteId = noteId,
                UserId = CurrentUserId,
                LineNumber = lineNumber,
                TextToInsert = textToInsert,
                Source = NoteSource.Agent,
                AiProvider = CurrentProvider,
                AiModel = CurrentModel
            };

            var result = await NoteOperationService.InsertInAsync(request);

            return result.Match(
                onSuccess: op =>
                {
                    var position = lineNumber == 0 ? "at the beginning" : $"after line {lineNumber}";
                    return $"Successfully inserted text {position} in note \"{op.Note.Title}\" (ID: {noteId}).";
                },
                onFailure: error => $"Error inserting text: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("inserting text in note", ex.Message);
        }
    }

    [KernelFunction("PrependToNote")]
    [Description("ADD text to BEGINNING of note. Does NOT replace existing content. Does NOT require GetNote first. Use for adding headers, warnings, priority items at top. Examples: 'add URGENT at top', 'put this at the beginning', 'add a header' -> PrependToNote.")]
    public async Task<string> PrependToNoteAsync(
        [Description("Note ID to prepend to")] string noteId,
        [Description("Text to ADD at beginning (existing content preserved)")] string contentToPrepend,
        [Description("Add blank line after new content (default: true)")] bool addNewline = true)
    {
        var userError = ValidateUserContext("prepend to note");
        if (userError != null) return userError;

        if (string.IsNullOrWhiteSpace(contentToPrepend))
        {
            return "Error: Content to prepend cannot be empty.";
        }

        if (NoteOperationService == null)
        {
            return "Error: Note operation service not available.";
        }

        try
        {
            var request = new PrependToNoteOperationRequest
            {
                NoteId = noteId,
                UserId = CurrentUserId,
                ContentToPrepend = contentToPrepend.Trim(),
                AddNewline = addNewline,
                Source = NoteSource.Agent,
                AiProvider = CurrentProvider,
                AiModel = CurrentModel
            };

            var result = await NoteOperationService.PrependAsync(request);

            return result.Match(
                onSuccess: op => $"Successfully prepended content to note \"{op.Note.Title}\" (ID: {noteId}). Note now contains {op.Note.Content.Length} characters.",
                onFailure: error => $"Error prepending to note: {error.Message}"
            );
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("prepending to note", ex.Message);
        }
    }

    #region Image Attachment Tools

    [KernelFunction("ListContextImages")]
    [Description("LIST images attached to the current message. Use to see available images before CreateNoteWithImage or AttachImageToNote. Returns image references (img1, img2, etc.) for use in other tools.")]
    public Task<string> ListContextImagesAsync()
    {
        var userError = ValidateUserContext("list context images");
        if (userError != null) return Task.FromResult(userError);

        if (ContextImages.Count == 0)
        {
            return Task.FromResult("No images attached to the current message. Ask the user to attach images first if they want to save images to notes.");
        }

        var response = new
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
            usage = "Use these references (e.g., 'img1') with CreateNoteWithImage or AttachImageToNote"
        };

        return Task.FromResult(JsonSerializer.Serialize(response));
    }

    [KernelFunction("CreateNoteWithImage")]
    [Description("CREATE a new note with image(s) attached. Use when user says 'save this image as a note' or 'create a note with this image'. Requires images in current message (check with ListContextImages first).")]
    public async Task<string> CreateNoteWithImageAsync(
        [Description("Note title (required, descriptive)")] string title,
        [Description("Note content (required, describes the image context)")] string content,
        [Description("Image references to attach, comma-separated (e.g., 'img1' or 'img1,img2')")] string imageReferences,
        [Description("Comma-separated tags for categorization")] string? tags = null)
    {
        var userError = ValidateUserContext("create note with image");
        if (userError != null) return userError;

        if (string.IsNullOrWhiteSpace(title))
            return "Error: Note title is required.";

        if (string.IsNullOrWhiteSpace(content))
            return "Error: Note content is required.";

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

            var request = new CreateNoteOperationRequest
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

            var result = await NoteOperationService.CreateAsync(request);

            return result.Match(
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

    [KernelFunction("AttachImageToNote")]
    [Description("ATTACH image(s) to an existing note. Use when user says 'attach this image to my X note' or 'add this image to note Y'. Use FindNoteForImageAttachment first if user doesn't provide exact note ID.")]
    public async Task<string> AttachImageToNoteAsync(
        [Description("Note ID to attach images to")] string noteId,
        [Description("Image references to attach (e.g., 'img1' or 'img1,img2')")] string imageReferences)
    {
        var userError = ValidateUserContext("attach image to note");
        if (userError != null) return userError;

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

            var request = new UpdateNoteOperationRequest
            {
                NoteId = noteId,
                UserId = CurrentUserId,
                Images = imageDtos,
                Source = NoteSource.Agent,
                AiProvider = CurrentProvider,
                AiModel = CurrentModel
            };

            var result = await NoteOperationService.UpdateAsync(request);

            return result.Match(
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

    [KernelFunction("FindNoteForImageAttachment")]
    [Description("SEARCH for a note to attach images to using semantic search. Returns best match with confidence score. If score > 0.8, you can proceed with AttachImageToNote. If score < 0.8, ask user to confirm the match first.")]
    public async Task<string> FindNoteForImageAttachmentAsync(
        [Description("Search query describing the note (e.g., 'meeting notes', 'project plan')")] string query)
    {
        var userError = ValidateUserContext("find note for image");
        if (userError != null) return userError;

        if (RagService == null)
            return "Error: Search service not available.";

        if (string.IsNullOrWhiteSpace(query))
            return "Error: Search query is required.";

        try
        {
            // Use semantic search to find matching notes via RetrieveContextAsync
            var ragContext = await RagService.RetrieveContextAsync(
                query: query.Trim(),
                userId: CurrentUserId,
                topK: 3,
                options: UserRagOptions);

            if (ragContext.RetrievedNotes.Count == 0)
            {
                return JsonSerializer.Serialize(new
                {
                    type = "note_search_result",
                    found = false,
                    message = "No matching notes found. Consider creating a new note with the image using CreateNoteWithImage instead.",
                    contextImages = GetContextImagesSummary()
                });
            }

            var topResult = ragContext.RetrievedNotes[0];
            var confidenceThreshold = 0.8f;
            var isHighConfidence = topResult.SimilarityScore >= confidenceThreshold;

            var response = new
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
                    ? $"High confidence match ({topResult.SimilarityScore:P0}). You can proceed with AttachImageToNote using noteId '{topResult.NoteId}'."
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

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return CreateErrorResponse("searching for note", ex.Message);
        }
    }

    #endregion
}
