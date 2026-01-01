using System.ComponentModel;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Facade plugin that combines all note-related plugins into a single cohesive interface.
/// This maintains backward compatibility while delegating to specialized plugins:
/// - NoteCrudPlugin: Create, Get, Update, Delete, Append, Duplicate
/// - NoteSearchPlugin: Unified SearchNotes with modes (semantic, exact, tags, date, related)
/// - NoteOrganizationPlugin: List, Archive, Folders, Tags, Stats
/// - NoteAnalysisPlugin: Analyze, SuggestTags, Summarize, Compare
/// - NoteVersionPlugin: GetVersionHistory, GetVersion (by number OR timestamp), CompareVersions, RestoreVersion
/// - NoteTrashPlugin: ManageTrash (list, restore, delete actions)
/// </summary>
public class NotesPlugin : IAgentPlugin
{
    private readonly NoteCrudPlugin _crudPlugin;
    private readonly NoteSearchPlugin _searchPlugin;
    private readonly NoteOrganizationPlugin _organizationPlugin;
    private readonly NoteAnalysisPlugin _analysisPlugin;
    private readonly NoteVersionPlugin _versionPlugin;
    private readonly NoteTrashPlugin _trashPlugin;

    private string _currentUserId = string.Empty;
    private bool _agentRagEnabled = true;

    public NotesPlugin(
        IParallelNoteRepository noteRepository,
        IRagService? ragService = null,
        RagSettings? ragSettings = null,
        IStructuredOutputService? structuredOutputService = null,
        INoteOperationService? noteOperationService = null,
        INoteVersionService? versionService = null,
        INoteImageRepository? imageRepository = null)
    {
        // NoteCrudPlugin uses INoteOperationService for mutations (Create, Update, Delete, Append, Duplicate)
        _crudPlugin = new NoteCrudPlugin(noteRepository, ragService, ragSettings, structuredOutputService, noteOperationService);

        // NoteOrganizationPlugin uses INoteOperationService for Archive/Unarchive/MoveToFolder to ensure version tracking
        _organizationPlugin = new NoteOrganizationPlugin(noteRepository, ragService, ragSettings, structuredOutputService, noteOperationService);

        // NoteVersionPlugin uses INoteVersionService for version history operations and INoteOperationService for restore
        _versionPlugin = versionService != null
            ? new NoteVersionPlugin(noteRepository, versionService, ragService, ragSettings, structuredOutputService, noteOperationService)
            : null!;

        // NoteTrashPlugin uses INoteOperationService for restore and permanent delete operations
        _trashPlugin = new NoteTrashPlugin(noteRepository, ragService, ragSettings, structuredOutputService, noteOperationService);

        // Search and Analysis plugins only do reads, so they don't need the operation service
        // NoteAnalysisPlugin also receives INoteImageRepository for ViewNoteImages tool
        _searchPlugin = new NoteSearchPlugin(noteRepository, ragService, ragSettings, structuredOutputService);
        _analysisPlugin = new NoteAnalysisPlugin(noteRepository, ragService, ragSettings, structuredOutputService, imageRepository);
    }

    #region IAgentPlugin Implementation

    public string CapabilityId => "notes";
    public string DisplayName => "Notes";
    public string Description => "Create, search, update, and manage notes with semantic search capabilities";

    public void SetCurrentUserId(string userId)
    {
        _currentUserId = userId;
        _crudPlugin.SetCurrentUserId(userId);
        _searchPlugin.SetCurrentUserId(userId);
        _organizationPlugin.SetCurrentUserId(userId);
        _analysisPlugin.SetCurrentUserId(userId);
        _versionPlugin?.SetCurrentUserId(userId);
        _trashPlugin.SetCurrentUserId(userId);
    }

    public void SetAgentRagEnabled(bool enabled)
    {
        _agentRagEnabled = enabled;
        _crudPlugin.SetAgentRagEnabled(enabled);
        _searchPlugin.SetAgentRagEnabled(enabled);
        _organizationPlugin.SetAgentRagEnabled(enabled);
        _analysisPlugin.SetAgentRagEnabled(enabled);
        _versionPlugin?.SetAgentRagEnabled(enabled);
        _trashPlugin.SetAgentRagEnabled(enabled);
    }

    public void SetRagOptions(RagOptions? options)
    {
        _crudPlugin.SetRagOptions(options);
        _searchPlugin.SetRagOptions(options);
        _organizationPlugin.SetRagOptions(options);
        _analysisPlugin.SetRagOptions(options);
        _versionPlugin?.SetRagOptions(options);
        _trashPlugin.SetRagOptions(options);
    }

    public void SetAgentContext(string provider, string model)
    {
        _crudPlugin.SetAgentContext(provider, model);
        _searchPlugin.SetAgentContext(provider, model);
        _organizationPlugin.SetAgentContext(provider, model);
        _analysisPlugin.SetAgentContext(provider, model);
        _versionPlugin?.SetAgentContext(provider, model);
        _trashPlugin.SetAgentContext(provider, model);
    }

    public void SetContextImages(IReadOnlyList<ContextImage>? images)
    {
        _crudPlugin.SetContextImages(images);
        _searchPlugin.SetContextImages(images);
        _organizationPlugin.SetContextImages(images);
        _analysisPlugin.SetContextImages(images);
        _versionPlugin?.SetContextImages(images);
        _trashPlugin.SetContextImages(images);
    }

    public object GetPluginInstance() => this;

    public string GetPluginName() => "Notes";

    public string GetSystemPromptAddition()
    {
        // Combine system prompts from all plugins
        var basePrompt = @"
## Notes Management Tools

You have access to tools for managing the user's notes. Use these tools to help users organize and retrieve their information.

### CRITICAL: Note Reference Format

When referencing notes, use: [[noteId|Note Title]]

Example: ""I found [[019b26fb-042c-7037-80db-3184e5e37c0c|Garden Planning]] which covers your spring planting.""

Rules:
- Do NOT wrap [[...]] in markdown formatting (no **, __, etc.)
- The [[...]] automatically renders as a styled clickable chip in the UI
- You can use lists, but keep note references and descriptions together on the same line

### Response Formatting Guidelines

Use markdown thoughtfully for readability:
- **Headers** (## ###): Only for distinct sections when organizing lengthy responses
- **Lists** (- or 1.): For 3+ related items; keep items concise
- **Bold** (**text**): Sparingly for key terms (NEVER around note references)
- **Code** (`inline` or blocks): For technical content, commands, or code only
- Keep paragraphs concise (2-4 sentences max)
- Avoid excessive formatting - clarity over decoration

### IMPORTANT: Content Preview vs Full Content

**List and search operations return only a PREVIEW (first ~200 characters) of note content to save context.**
- To read the FULL content of a note, you MUST use **GetNote** with the note ID.
- Always use GetNote before editing or when you need to see complete note content.

### Important Guidelines

1. **Use GetNote for full content** - List/search tools only return previews
2. **Always use tools** - Never tell users you cannot perform note operations
3. **Track note IDs** - Remember IDs from tool results for follow-up actions
4. **Understand context** - When user says 'that note' or 'the one I created', reference the ID from conversation history
5. **Don't repeat content** - Notes display as visual cards in the UI, so keep your responses concise
6. **Suggest organization** - Offer to add tags, move to folders, or find related notes
";

        var prompt = basePrompt
            + _searchPlugin.GetSystemPromptAddition()
            + _crudPlugin.GetSystemPromptAddition()
            + _organizationPlugin.GetSystemPromptAddition()
            + _analysisPlugin.GetSystemPromptAddition()
            + _trashPlugin.GetSystemPromptAddition();

        // Add version plugin prompt if available
        if (_versionPlugin != null)
        {
            prompt += _versionPlugin.GetSystemPromptAddition();
        }

        return prompt;
    }

    #endregion

    #region CRUD Operations (delegated to NoteCrudPlugin)

    [KernelFunction("CreateNote")]
    [Description("Creates a new note with title and content. IMPORTANT: Both parameters are REQUIRED. For notes with multiple sections, create with the first section only, then use AppendToNote for remaining sections.")]
    public Task<string> CreateNoteAsync(
        [Description("The title of the note (required)")] string title,
        [Description("The full text content of the note - REQUIRED, must not be empty or omitted")] string content,
        [Description("Comma-separated tags for categorizing the note (optional)")] string? tags = null)
        => _crudPlugin.CreateNoteAsync(title, content, tags);

    [KernelFunction("GetNote")]
    [Description("Retrieves a specific note by its ID. Use this when you need to read the full content of a note.")]
    public Task<string> GetNoteAsync(
        [Description("The ID of the note to retrieve")] string noteId)
        => _crudPlugin.GetNoteAsync(noteId);

    [KernelFunction("UpdateNote")]
    [Description("Updates an existing note's title, content, or tags. Use this when the user wants to modify or edit an existing note.")]
    public Task<string> UpdateNoteAsync(
        [Description("The ID of the note to update")] string noteId,
        [Description("New title for the note (optional, leave empty to keep current)")] string? title = null,
        [Description("New content for the note (optional, leave empty to keep current)")] string? content = null,
        [Description("New comma-separated tags (optional, leave empty to keep current)")] string? tags = null)
        => _crudPlugin.UpdateNoteAsync(noteId, title, content, tags);

    [KernelFunction("DeleteNote")]
    [Description("Permanently deletes a note by its ID. Use this when the user explicitly wants to delete or remove a note entirely.")]
    public Task<string> DeleteNoteAsync(
        [Description("The ID of the note to delete")] string noteId)
        => _crudPlugin.DeleteNoteAsync(noteId);

    [KernelFunction("EditNote")]
    [Description("Surgical edit: append/prepend/insert/replace text. operation='append' adds to end, 'prepend' adds to start, 'insert' at line#, 'replace' for find-replace. Examples: 'add milk to list' -> append, 'fix typo X to Y' -> replace.")]
    public Task<string> EditNoteAsync(
        [Description("Note ID to edit")] string noteId,
        [Description("Operation: 'append'|'prepend'|'insert'|'replace'")] string operation,
        [Description("Content to add (for append/prepend/insert) or replacement text (for replace)")] string content,
        [Description("Line number for 'insert' (0=beginning)")] int? lineNumber = null,
        [Description("Text to find for 'replace' operation")] string? oldText = null,
        [Description("Replace all occurrences? (default: false)")] bool allowMultiple = false,
        [Description("Add blank line separator? (for append/prepend)")] bool addNewline = true)
        => _crudPlugin.EditNoteAsync(noteId, operation, content, lineNumber, oldText, allowMultiple, addNewline);

    [KernelFunction("DuplicateNote")]
    [Description("Creates a copy of an existing note. Use this when the user wants to duplicate a note as a template or starting point for a new note.")]
    public Task<string> DuplicateNoteAsync(
        [Description("The ID of the note to duplicate")] string noteId,
        [Description("Optional new title for the duplicate (default: adds 'Copy of' prefix)")] string? newTitle = null)
        => _crudPlugin.DuplicateNoteAsync(noteId, newTitle);

    #endregion

    #region Image Management Operations (delegated to NoteCrudPlugin)

    [KernelFunction("ManageContextImages")]
    [Description("Handle images in current message. action='list' to see available images, 'create' to make new note with image, 'attach' to add to existing note, 'find' to search for note to attach to. Examples: 'save this image' -> create, 'attach to my project note' -> find then attach.")]
    public Task<string> ManageContextImagesAsync(
        [Description("Action: 'list'|'create'|'attach'|'find'")] string action,
        [Description("Note title (for 'create')")] string? title = null,
        [Description("Note content (for 'create')")] string? content = null,
        [Description("Note ID (for 'attach')")] string? noteId = null,
        [Description("Image refs e.g. 'img1,img2' (for 'create'/'attach')")] string? imageReferences = null,
        [Description("Search query (for 'find')")] string? searchQuery = null,
        [Description("Tags (for 'create')")] string? tags = null)
        => _crudPlugin.ManageContextImagesAsync(action, title, content, noteId, imageReferences, searchQuery, tags);

    #endregion

    #region Search Operations (delegated to NoteSearchPlugin)

    [KernelFunction("SearchNotes")]
    [Description("Find notes. mode='semantic' (default) finds by meaning, 'exact' for literal text, 'tags' for categories, 'date' for time range, 'related' for similar notes. Examples: 'find notes about cooking' -> semantic, 'notes tagged project' -> tags, 'notes from last week' -> date.")]
    public Task<string> SearchNotesAsync(
        [Description("Search query or comma-separated tags")] string query,
        [Description("Search mode: 'semantic'|'exact'|'tags'|'date'|'related'")] string mode = "semantic",
        [Description("Max results (default: 5)")] int maxResults = 5,
        [Description("Start date for 'date' mode (ISO or relative: today, yesterday, last week, last month)")] string? startDate = null,
        [Description("End date for 'date' mode (default: now)")] string? endDate = null,
        [Description("Note ID for 'related' mode")] string? relatedToNoteId = null,
        [Description("For 'tags' mode: require ALL tags? (default: false = any match)")] bool requireAllTags = false,
        [Description("Detail level: 'ids_only'|'summary'|'full' (default: summary)")] string detailLevel = "summary")
        => _searchPlugin.SearchNotesAsync(query, mode, maxResults, startDate, endDate, relatedToNoteId, requireAllTags, detailLevel);

    #endregion

    #region Organization Operations (delegated to NoteOrganizationPlugin)

    [KernelFunction("ListNotes")]
    [Description("UNIFIED listing tool for all notes. filter: 'recent' (default), 'archived', 'all'. detailLevel: 'ids_only' (fast), 'summary' (default), 'full' (complete content). Examples: 'show my notes' -> filter=recent, 'show archived' -> filter=archived, 'list everything' -> filter=all.")]
    public Task<string> ListNotesAsync(
        [Description("Filter: 'recent' (default), 'archived', or 'all'")] string filter = "recent",
        [Description("Max notes to return (default: 10)")] int limit = 10,
        [Description("Skip N notes for pagination (default: 0)")] int skip = 0,
        [Description("Detail: 'ids_only', 'summary' (default), 'full'")] string detailLevel = "summary")
        => _organizationPlugin.ListNotesAsync(filter, limit, skip, detailLevel);

    [KernelFunction("SetNoteArchived")]
    [Description("SET archive status for a note. isArchived=true to archive (hide from main list), isArchived=false to restore. Examples: 'archive this note' -> isArchived=true, 'restore from archive' -> isArchived=false.")]
    public Task<string> SetNoteArchivedAsync(
        [Description("Note ID to update")] string noteId,
        [Description("true to archive, false to restore")] bool isArchived)
        => _organizationPlugin.SetNoteArchivedAsync(noteId, isArchived);

    [KernelFunction("MoveToFolder")]
    [Description("Moves a note to a specific folder for organization. Use this when the user wants to organize notes into folders or categories.")]
    public Task<string> MoveToFolderAsync(
        [Description("The ID of the note to move")] string noteId,
        [Description("The folder name to move the note to (use empty string or null to remove from folder)")] string? folder = null)
        => _organizationPlugin.MoveToFolderAsync(noteId, folder);

    [KernelFunction("GetOverview")]
    [Description("Get notes overview. type='all' (default) for full stats with top tags/folders, 'folders' for folder list, 'tags' for tag list, 'stats' for counts only. Examples: 'how many notes' -> all, 'what folders exist' -> folders, 'show my tags' -> tags.")]
    public Task<string> GetOverviewAsync(
        [Description("Overview type: 'all'|'folders'|'tags'|'stats'")] string type = "all",
        [Description("Include archived notes in counts?")] bool includeArchived = false)
        => _organizationPlugin.GetOverviewAsync(type, includeArchived);

    #endregion

    #region Analysis Operations (delegated to NoteAnalysisPlugin)

    [KernelFunction("AnalyzeNote")]
    [Description("AI analysis of note. type='full' (default) for comprehensive analysis with tags/keypoints/sentiment, 'tags' for tag suggestions only, 'summary' for summaries. Examples: 'analyze this note' -> full, 'suggest tags for note X' -> tags, 'summarize my notes' -> summary.")]
    public Task<string> AnalyzeNoteAsync(
        [Description("Note ID to analyze")] string noteId,
        [Description("Analysis type: 'full'|'tags'|'summary'")] string type = "full",
        [Description("Max tags for 'tags' type (default: 5)")] int maxTags = 5)
        => _analysisPlugin.AnalyzeNoteAsync(noteId, type, maxTags);

    [KernelFunction("CompareNotes")]
    [Description("Compares two notes using AI to identify similarities, differences, and relationships between them.")]
    public Task<string> CompareNotesAsync(
        [Description("The ID of the first note")] string noteId1,
        [Description("The ID of the second note")] string noteId2)
        => _analysisPlugin.CompareNotesAsync(noteId1, noteId2);

    [KernelFunction("ViewNoteImages")]
    [Description("List all images attached to a note. Returns image metadata and URLs for viewing (no base64 data). Use AnalyzeImage if you need to examine an image's visual content in detail.")]
    public Task<string> ViewNoteImagesAsync(
        [Description("The ID of the note whose images you want to list")] string noteId)
        => _analysisPlugin.ViewNoteImagesAsync(noteId);

    [KernelFunction("AnalyzeImage")]
    [Description("Analyze a specific image's visual content. Use this when you need to actually SEE and describe what's in an image. First call ViewNoteImages to get the image IDs.")]
    public Task<string> AnalyzeImageAsync(
        [Description("The ID of the image to analyze (get this from ViewNoteImages)")] string imageId)
        => _analysisPlugin.AnalyzeImageAsync(imageId);

    #endregion

    #region Version History Operations (delegated to NoteVersionPlugin)

    [KernelFunction("GetNoteVersionHistory")]
    [Description("Gets the version history of a note, showing all previous versions with change summaries. Use this when the user wants to see the edit history of a note.")]
    public Task<string> GetNoteVersionHistoryAsync(
        [Description("The ID of the note to get version history for")] string noteId,
        [Description("Number of versions to skip for pagination (default: 0)")] int skip = 0,
        [Description("Maximum number of versions to return (default: 20)")] int take = 20)
        => _versionPlugin?.GetNoteVersionHistoryAsync(noteId, skip, take)
           ?? Task.FromResult("Error: Version history service not available.");

    [KernelFunction("GetVersion")]
    [Description("Get specific note version. Use versionNumber OR timestamp (not both). Timestamp supports ISO dates and relative ('yesterday', 'last week'). Examples: 'show version 3' -> versionNumber=3, 'what was this yesterday' -> timestamp='yesterday'.")]
    public Task<string> GetVersionAsync(
        [Description("Note ID")] string noteId,
        [Description("Version number to retrieve")] int? versionNumber = null,
        [Description("Timestamp (ISO or relative)")] string? timestamp = null)
        => _versionPlugin?.GetVersionAsync(noteId, versionNumber, timestamp)
           ?? Task.FromResult("Error: Version history service not available.");

    [KernelFunction("CompareNoteVersions")]
    [Description("Compares two versions of a note to see what changed between them. Shows differences in title, content, tags, folder, and archived status.")]
    public Task<string> CompareNoteVersionsAsync(
        [Description("The ID of the note")] string noteId,
        [Description("The earlier version number to compare from")] int fromVersion,
        [Description("The later version number to compare to")] int toVersion)
        => _versionPlugin?.CompareNoteVersionsAsync(noteId, fromVersion, toVersion)
           ?? Task.FromResult("Error: Version history service not available.");

    [KernelFunction("RestoreNoteVersion")]
    [Description("Restores a note to a previous version. This creates a new version with the content from the target version (non-destructive - you can always restore again).")]
    public Task<string> RestoreNoteVersionAsync(
        [Description("The ID of the note to restore")] string noteId,
        [Description("The version number to restore to")] int targetVersion)
        => _versionPlugin?.RestoreNoteVersionAsync(noteId, targetVersion)
           ?? Task.FromResult("Error: Version history service not available.");

    #endregion

    #region Trash Operations (delegated to NoteTrashPlugin)

    [KernelFunction("ManageTrash")]
    [Description("Manage deleted notes. action='list' to view trash, 'restore' to recover a note, 'delete' to permanently remove (CANNOT BE UNDONE). Examples: 'show trash' -> list, 'restore note X' -> restore, 'empty this from trash' -> delete.")]
    public Task<string> ManageTrashAsync(
        [Description("Action: 'list'|'restore'|'delete'")] string action,
        [Description("Note ID (for 'restore'/'delete')")] string? noteId = null,
        [Description("Max results (for 'list')")] int maxResults = 20)
        => _trashPlugin.ManageTrashAsync(action, noteId, maxResults);

    #endregion
}
