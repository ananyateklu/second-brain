using System.ComponentModel;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
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
/// - NoteSearchPlugin: Search, SemanticSearch, SearchByTags, DateRange, FindRelated
/// - NoteOrganizationPlugin: List, Archive, Folders, Tags, Stats
/// - NoteAnalysisPlugin: Analyze, SuggestTags, Summarize, Compare
/// - NoteVersionPlugin: GetVersionHistory, GetVersion, GetVersionAtTime, CompareVersions, RestoreVersion
/// - NoteTrashPlugin: ListDeleted, RestoreDeleted, PermanentlyDelete
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
        INoteVersionService? versionService = null)
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
        _searchPlugin = new NoteSearchPlugin(noteRepository, ragService, ragSettings, structuredOutputService);
        _analysisPlugin = new NoteAnalysisPlugin(noteRepository, ragService, ragSettings, structuredOutputService);
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

    [KernelFunction("AppendToNote")]
    [Description("Appends content to the end of an existing note. Use this when the user wants to add something to an existing note, like adding items to a list or adding new information.")]
    public Task<string> AppendToNoteAsync(
        [Description("The ID of the note to append to")] string noteId,
        [Description("The content to append to the note")] string contentToAppend,
        [Description("Whether to add a newline before the appended content (default: true)")] bool addNewline = true)
        => _crudPlugin.AppendToNoteAsync(noteId, contentToAppend, addNewline);

    [KernelFunction("DuplicateNote")]
    [Description("Creates a copy of an existing note. Use this when the user wants to duplicate a note as a template or starting point for a new note.")]
    public Task<string> DuplicateNoteAsync(
        [Description("The ID of the note to duplicate")] string noteId,
        [Description("Optional new title for the duplicate (default: adds 'Copy of' prefix)")] string? newTitle = null)
        => _crudPlugin.DuplicateNoteAsync(noteId, newTitle);

    [KernelFunction("ReplaceInNote")]
    [Description("Find and replace specific text within a note. Use for surgical edits like fixing typos, renaming terms, or updating specific phrases. By default, fails if the text appears multiple times (safety feature). Set allowMultiple=true to replace all occurrences.")]
    public Task<string> ReplaceInNoteAsync(
        [Description("The ID of the note to modify")] string noteId,
        [Description("The exact text to find and replace (case-sensitive, whitespace-sensitive)")] string oldText,
        [Description("The text to replace it with (use empty string to delete the text)")] string newText,
        [Description("Set to true to replace ALL occurrences. If false (default), fails when multiple matches exist.")] bool allowMultiple = false)
        => _crudPlugin.ReplaceInNoteAsync(noteId, oldText, newText, allowMultiple);

    [KernelFunction("InsertInNote")]
    [Description("Insert text at a specific line number in a note. Line 0 inserts at the very beginning, line N inserts after line N. Lines beyond the note length append at the end.")]
    public Task<string> InsertInNoteAsync(
        [Description("The ID of the note to modify")] string noteId,
        [Description("Line number to insert after (0 = beginning, 1 = after first line, etc.)")] int lineNumber,
        [Description("The text to insert")] string textToInsert)
        => _crudPlugin.InsertInNoteAsync(noteId, lineNumber, textToInsert);

    [KernelFunction("PrependToNote")]
    [Description("Add content to the beginning of an existing note. Use for adding headers, introductions, or priority items at the top.")]
    public Task<string> PrependToNoteAsync(
        [Description("The ID of the note to prepend to")] string noteId,
        [Description("The content to add at the beginning of the note")] string contentToPrepend,
        [Description("Whether to add a newline after the prepended content (default: true)")] bool addNewline = true)
        => _crudPlugin.PrependToNoteAsync(noteId, contentToPrepend, addNewline);

    #endregion

    #region Search Operations (delegated to NoteSearchPlugin)

    [KernelFunction("SearchNotes")]
    [Description("Exact keyword/phrase search in note titles, content, and tags. Only use when you need literal text matching. For general note finding, use SemanticSearch instead - it's more effective at finding relevant notes.")]
    public Task<string> SearchNotesAsync(
        [Description("The search query to find notes")] string query,
        [Description("Maximum number of results to return (default: 5)")] int maxResults = 5)
        => _searchPlugin.SearchNotesAsync(query, maxResults);

    [KernelFunction("SemanticSearch")]
    [Description("PRIMARY SEARCH TOOL - AI-powered search that finds notes by meaning and context. Use this as your first choice when looking for notes. Finds relevant notes even with different wording, synonyms, or related concepts (e.g., 'sambusa' finds 'samosa recipes').")]
    public Task<string> SemanticSearchAsync(
        [Description("The search query to find semantically related notes")] string query,
        [Description("Maximum number of results to return (default: 5)")] int maxResults = 5)
        => _searchPlugin.SemanticSearchAsync(query, maxResults);

    [KernelFunction("SearchByTags")]
    [Description("Finds notes that have one or more of the specified tags. Use this when the user wants to find notes by their tags or categories.")]
    public Task<string> SearchByTagsAsync(
        [Description("Comma-separated list of tags to search for")] string tags,
        [Description("If true, notes must have ALL specified tags; if false, notes with ANY of the tags match (default: false)")] bool requireAll = false,
        [Description("Maximum number of results to return (default: 10)")] int maxResults = 10)
        => _searchPlugin.SearchByTagsAsync(tags, requireAll, maxResults);

    [KernelFunction("GetNotesByDateRange")]
    [Description("Finds notes created or updated within a specific date range. Use this when the user wants to find notes from a particular time period.")]
    public Task<string> GetNotesByDateRangeAsync(
        [Description("Start date in ISO format (e.g., '2024-01-01') or relative like 'today', 'yesterday', 'last week', 'last month'")] string startDate,
        [Description("End date in ISO format (e.g., '2024-12-31') or relative like 'today', 'now' (optional, defaults to now)")] string? endDate = null,
        [Description("Whether to search by 'created' or 'updated' date (default: 'created')")] string dateField = "created",
        [Description("Maximum number of results to return (default: 10)")] int maxResults = 10)
        => _searchPlugin.GetNotesByDateRangeAsync(startDate, endDate, dateField, maxResults);

    [KernelFunction("FindRelatedNotes")]
    [Description("Finds notes that are semantically related to a specific note. Use this to discover connections between notes or find similar content.")]
    public Task<string> FindRelatedNotesAsync(
        [Description("The ID of the note to find related notes for")] string noteId,
        [Description("Maximum number of related notes to return (default: 5)")] int maxResults = 5)
        => _searchPlugin.FindRelatedNotesAsync(noteId, maxResults);

    #endregion

    #region Organization Operations (delegated to NoteOrganizationPlugin)

    [KernelFunction("ListAllNotes")]
    [Description("Lists all of the user's notes. Use this when the user wants to see their complete list of notes, not just recent ones.")]
    public Task<string> ListAllNotesAsync(
        [Description("Whether to include archived notes (default: false)")] bool includeArchived = false,
        [Description("Optional: Skip this many notes for pagination (default: 0)")] int skip = 0,
        [Description("Optional: Maximum number of notes to return. Use 0 or negative for all notes (default: 0 = all)")] int limit = 0)
        => _organizationPlugin.ListAllNotesAsync(includeArchived, skip, limit);

    [KernelFunction("ListRecentNotes")]
    [Description("Lists the user's most recent notes. Use this to show what notes exist or to help the user remember what they've saved.")]
    public Task<string> ListRecentNotesAsync(
        [Description("Maximum number of notes to list (default: 10)")] int maxResults = 10)
        => _organizationPlugin.ListRecentNotesAsync(maxResults);

    [KernelFunction("ListArchivedNotes")]
    [Description("Lists all archived notes. Use this when the user wants to see notes they have previously archived.")]
    public Task<string> ListArchivedNotesAsync(
        [Description("Maximum number of archived notes to list (default: 10)")] int maxResults = 10)
        => _organizationPlugin.ListArchivedNotesAsync(maxResults);

    [KernelFunction("ArchiveNote")]
    [Description("Archives a note, hiding it from the main list while preserving it. Use this when the user wants to hide a note without permanently deleting it.")]
    public Task<string> ArchiveNoteAsync(
        [Description("The ID of the note to archive")] string noteId)
        => _organizationPlugin.ArchiveNoteAsync(noteId);

    [KernelFunction("UnarchiveNote")]
    [Description("Restores an archived note back to the main list. Use this when the user wants to bring back a previously archived note.")]
    public Task<string> UnarchiveNoteAsync(
        [Description("The ID of the note to unarchive")] string noteId)
        => _organizationPlugin.UnarchiveNoteAsync(noteId);

    [KernelFunction("MoveToFolder")]
    [Description("Moves a note to a specific folder for organization. Use this when the user wants to organize notes into folders or categories.")]
    public Task<string> MoveToFolderAsync(
        [Description("The ID of the note to move")] string noteId,
        [Description("The folder name to move the note to (use empty string or null to remove from folder)")] string? folder = null)
        => _organizationPlugin.MoveToFolderAsync(noteId, folder);

    [KernelFunction("ListFolders")]
    [Description("Lists all folders used to organize notes, with counts showing how many notes are in each folder.")]
    public Task<string> ListFoldersAsync(
        [Description("Whether to include archived notes in the folder counts (default: false)")] bool includeArchived = false)
        => _organizationPlugin.ListFoldersAsync(includeArchived);

    [KernelFunction("ListAllTags")]
    [Description("Lists all unique tags used across the user's notes, with counts showing how many notes use each tag.")]
    public Task<string> ListAllTagsAsync(
        [Description("Whether to include archived notes in the tag counts (default: false)")] bool includeArchived = false)
        => _organizationPlugin.ListAllTagsAsync(includeArchived);

    [KernelFunction("GetNoteStats")]
    [Description("Gets statistics about the user's notes, including total counts, tag distribution, and folder organization.")]
    public Task<string> GetNoteStatsAsync(
        [Description("Whether to include archived notes in the statistics (default: false)")] bool includeArchived = false)
        => _organizationPlugin.GetNoteStatsAsync(includeArchived);

    #endregion

    #region Analysis Operations (delegated to NoteAnalysisPlugin)

    [KernelFunction("AnalyzeNote")]
    [Description("Analyzes a note using AI to extract key information, suggest tags, identify key points, and determine sentiment. Requires AI structured output service to be available.")]
    public Task<string> AnalyzeNoteAsync(
        [Description("The ID of the note to analyze")] string noteId)
        => _analysisPlugin.AnalyzeNoteAsync(noteId);

    [KernelFunction("SuggestTags")]
    [Description("Uses AI to suggest relevant tags for a note based on its content. Helpful for organizing and categorizing notes.")]
    public Task<string> SuggestTagsAsync(
        [Description("The ID of the note to suggest tags for")] string noteId,
        [Description("Maximum number of tags to suggest (default: 5)")] int maxTags = 5)
        => _analysisPlugin.SuggestTagsAsync(noteId, maxTags);

    [KernelFunction("SummarizeNote")]
    [Description("Generates a comprehensive summary of a note using AI, including a one-liner, short summary, and key takeaways.")]
    public Task<string> SummarizeNoteAsync(
        [Description("The ID of the note to summarize")] string noteId)
        => _analysisPlugin.SummarizeNoteAsync(noteId);

    [KernelFunction("CompareNotes")]
    [Description("Compares two notes using AI to identify similarities, differences, and relationships between them.")]
    public Task<string> CompareNotesAsync(
        [Description("The ID of the first note")] string noteId1,
        [Description("The ID of the second note")] string noteId2)
        => _analysisPlugin.CompareNotesAsync(noteId1, noteId2);

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

    [KernelFunction("GetNoteVersion")]
    [Description("Gets a specific version of a note by version number. Use this when the user wants to see the content of a particular version.")]
    public Task<string> GetNoteVersionAsync(
        [Description("The ID of the note")] string noteId,
        [Description("The version number to retrieve")] int versionNumber)
        => _versionPlugin?.GetNoteVersionAsync(noteId, versionNumber)
           ?? Task.FromResult("Error: Version history service not available.");

    [KernelFunction("GetVersionAtTime")]
    [Description("Gets a note's content as it was at a specific point in time. Supports ISO dates (2024-12-25) and relative dates (yesterday, last week, 3 days ago).")]
    public Task<string> GetVersionAtTimeAsync(
        [Description("The ID of the note")] string noteId,
        [Description("The timestamp - ISO format (2024-12-25T10:30:00) or relative (yesterday, last week, 3 days ago)")] string timestamp)
        => _versionPlugin?.GetVersionAtTimeAsync(noteId, timestamp)
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

    [KernelFunction("ListDeletedNotes")]
    [Description("Lists all notes in the trash (soft-deleted notes). These notes can be restored or permanently deleted.")]
    public Task<string> ListDeletedNotesAsync(
        [Description("Maximum number of deleted notes to list (default: 20)")] int maxResults = 20)
        => _trashPlugin.ListDeletedNotesAsync(maxResults);

    [KernelFunction("RestoreDeletedNote")]
    [Description("Restores a soft-deleted note from the trash back to active notes. Use this when the user wants to recover a deleted note.")]
    public Task<string> RestoreDeletedNoteAsync(
        [Description("The ID of the deleted note to restore")] string noteId)
        => _trashPlugin.RestoreDeletedNoteAsync(noteId);

    [KernelFunction("PermanentlyDeleteNote")]
    [Description("Permanently deletes a note from the trash. WARNING: This action cannot be undone. Only use when the user explicitly confirms permanent deletion.")]
    public Task<string> PermanentlyDeleteNoteAsync(
        [Description("The ID of the deleted note to permanently remove")] string noteId)
        => _trashPlugin.PermanentlyDeleteNoteAsync(noteId);

    #endregion
}
