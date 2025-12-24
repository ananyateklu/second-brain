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
/// </summary>
public class NotesPlugin : IAgentPlugin
{
    private readonly NoteCrudPlugin _crudPlugin;
    private readonly NoteSearchPlugin _searchPlugin;
    private readonly NoteOrganizationPlugin _organizationPlugin;
    private readonly NoteAnalysisPlugin _analysisPlugin;

    private string _currentUserId = string.Empty;
    private bool _agentRagEnabled = true;

    public NotesPlugin(
        IParallelNoteRepository noteRepository,
        IRagService? ragService = null,
        RagSettings? ragSettings = null,
        IStructuredOutputService? structuredOutputService = null,
        INoteOperationService? noteOperationService = null)
    {
        // NoteCrudPlugin uses INoteOperationService for mutations (Create, Update, Delete, Append, Duplicate)
        _crudPlugin = new NoteCrudPlugin(noteRepository, ragService, ragSettings, structuredOutputService, noteOperationService);

        // Other plugins only do reads, so they don't need the operation service
        _searchPlugin = new NoteSearchPlugin(noteRepository, ragService, ragSettings, structuredOutputService);
        _organizationPlugin = new NoteOrganizationPlugin(noteRepository, ragService, ragSettings, structuredOutputService);
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
    }

    public void SetAgentRagEnabled(bool enabled)
    {
        _agentRagEnabled = enabled;
        _crudPlugin.SetAgentRagEnabled(enabled);
        _searchPlugin.SetAgentRagEnabled(enabled);
        _organizationPlugin.SetAgentRagEnabled(enabled);
        _analysisPlugin.SetAgentRagEnabled(enabled);
    }

    public void SetRagOptions(RagOptions? options)
    {
        _crudPlugin.SetRagOptions(options);
        _searchPlugin.SetRagOptions(options);
        _organizationPlugin.SetRagOptions(options);
        _analysisPlugin.SetRagOptions(options);
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

        return basePrompt
            + _searchPlugin.GetSystemPromptAddition()
            + _crudPlugin.GetSystemPromptAddition()
            + _organizationPlugin.GetSystemPromptAddition()
            + _analysisPlugin.GetSystemPromptAddition();
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

    #endregion

    #region Search Operations (delegated to NoteSearchPlugin)

    [KernelFunction("SearchNotes")]
    [Description("Searches for notes matching the query in titles, content, or tags. Use this to find existing notes or information the user has saved.")]
    public Task<string> SearchNotesAsync(
        [Description("The search query to find notes")] string query,
        [Description("Maximum number of results to return (default: 5)")] int maxResults = 5)
        => _searchPlugin.SearchNotesAsync(query, maxResults);

    [KernelFunction("SemanticSearch")]
    [Description("Searches for notes using semantic/meaning-based search powered by AI embeddings. This finds notes that are conceptually related to the query even if they don't contain the exact keywords.")]
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
}
