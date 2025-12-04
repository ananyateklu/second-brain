using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Plugins;

public class NotesPlugin : IAgentPlugin
{
    private readonly INoteRepository _noteRepository;
    private readonly IRagService? _ragService;
    private readonly RagSettings? _ragSettings;
    private string _currentUserId = string.Empty;
    private bool _agentRagEnabled = true;

    // Maximum length for content preview in list operations
    private const int MaxPreviewLength = 200;

    public NotesPlugin(INoteRepository noteRepository, IRagService? ragService = null, RagSettings? ragSettings = null)
    {
        _noteRepository = noteRepository;
        _ragService = ragService;
        _ragSettings = ragSettings;
    }

    /// <summary>
    /// Extracts a preview from note content - first paragraph limited to MaxPreviewLength characters.
    /// Use GetNote tool to read full content.
    /// </summary>
    private static string GetContentPreview(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return string.Empty;

        // Find the first paragraph (split by double newline or single newline)
        var paragraphBreaks = new[] { "\n\n", "\r\n\r\n", "\n", "\r\n" };
        var firstParagraph = content;

        foreach (var separator in paragraphBreaks)
        {
            var index = content.IndexOf(separator, StringComparison.Ordinal);
            if (index > 0 && index < firstParagraph.Length)
            {
                firstParagraph = content.Substring(0, index);
                break;
            }
        }

        // Trim and limit length
        firstParagraph = firstParagraph.Trim();

        if (firstParagraph.Length <= MaxPreviewLength)
            return firstParagraph;

        // Truncate at word boundary if possible
        var truncated = firstParagraph.Substring(0, MaxPreviewLength);
        var lastSpace = truncated.LastIndexOf(' ');

        if (lastSpace > MaxPreviewLength * 0.7) // Only use word boundary if it's not too far back
            truncated = truncated.Substring(0, lastSpace);

        return truncated + "...";
    }

    #region IAgentPlugin Implementation

    public string CapabilityId => "notes";
    public string DisplayName => "Notes";
    public string Description => "Create, search, update, and manage notes with semantic search capabilities";

    public void SetCurrentUserId(string userId)
    {
        _currentUserId = userId;
    }

    public void SetAgentRagEnabled(bool enabled)
    {
        _agentRagEnabled = enabled;
    }

    public object GetPluginInstance() => this;

    public string GetPluginName() => "Notes";

    public string GetSystemPromptAddition()
    {
        var contextInstructions = _agentRagEnabled
            ? @"
### Using Automatically Retrieved Context

When you see ""---RELEVANT NOTES CONTEXT---"" in the system context:
- This contains notes automatically retrieved based on the user's query using semantic search
- **Use this information to answer directly** WITHOUT calling search tools first
- The context includes note titles, previews, tags, and relevance scores
- If the provided context is sufficient, answer immediately from it
- If you need MORE information or the FULL content of a specific note, THEN use the **GetNote** tool with the note ID
- If the context is NOT relevant to the user's question, ignore it and use your tools as normal
- **Reference specific notes by title** when citing information from the context
"
            : @"
### Proactive Search Strategy

Automatic context retrieval is disabled for this conversation. You should:
- **Proactively use search tools** when the user asks questions about their notes
- Use **SemanticSearch** for conceptual/meaning-based queries
- Use **SearchNotes** for keyword-based searches
- Use **SearchByTags** when looking for notes by category
- Always search before answering questions that might relate to the user's notes
";

        return @"
## Notes Management Tools

You have access to tools for managing the user's notes. Use these tools to help users organize and retrieve their information.
" + contextInstructions + @"
### IMPORTANT: Content Preview vs Full Content

**List and search operations return only a PREVIEW (first ~200 characters) of note content to save context.**
- To read the FULL content of a note, you MUST use **GetNote** with the note ID.
- Always use GetNote before editing or when you need to see complete note content.

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

### Search Tools (Return Previews Only)

- **SearchNotes**: Keyword-based search in titles, content, and tags
  - Returns preview only - use GetNote for full content
  - Use for finding specific notes when user provides exact terms

- **SemanticSearch**: AI-powered search that finds conceptually related notes
  - Returns preview only - use GetNote for full content
  - Finds notes by meaning even without exact keyword matches

- **SearchByTags**: Find notes by their tags
  - Returns preview only - use GetNote for full content
  - Can require all tags or any of the specified tags

- **GetNotesByDateRange**: Find notes by creation or update date
  - Returns preview only - use GetNote for full content
  - Supports relative dates: 'today', 'yesterday', 'last week', 'last month'

- **FindRelatedNotes**: Find notes similar to a given note
  - Returns preview only - use GetNote for full content
  - Uses semantic search to find conceptually related notes

### Organization Tools (Return Previews Only)

- **ListAllNotes**: Show all notes (with optional pagination)
  - Returns preview only - use GetNote for full content
  - Use when user wants to see their complete list of notes

- **ListRecentNotes**: Show most recently updated notes
  - Returns preview only - use GetNote for full content

- **ListArchivedNotes**: Show archived notes
  - Returns preview only - use GetNote for full content

- **ArchiveNote**: Archive a note (soft delete)
  - Hides note from main list without deleting

- **UnarchiveNote**: Restore an archived note
  - Brings archived note back to main list

- **MoveToFolder**: Organize note into a folder
  - Pass empty string to remove from folder

- **ListFolders**: Show all folders with note counts

- **ListAllTags**: Show all tags with usage counts

- **GetNoteStats**: Get notes statistics overview

### Important Guidelines

1. **Use GetNote for full content** - List/search tools only return previews
2. **Always use tools** - Never tell users you cannot perform note operations
3. **Track note IDs** - Remember IDs from tool results for follow-up actions
4. **Understand context** - When user says 'that note' or 'the one I created', reference the ID from conversation history
5. **Don't repeat content** - Notes display as visual cards in the UI, so keep your responses concise
6. **Suggest organization** - Offer to add tags, move to folders, or find related notes

### Large Content Strategy (IMPORTANT)

When creating notes with substantial content (multiple sections, paragraphs, or lists):

**Step 1: Plan and Announce**
- Before creating, state: ""I'll create this note in X sections: [list sections briefly]""
- This preserves context if the operation spans multiple tool calls

**Step 2: Create with Initial Content**
- Use CreateNote with the title and FIRST section only
- Include a meaningful introduction or the first major section
- Keep initial content moderate (1-3 paragraphs max)

**Step 3: Capture the Note ID**
- The CreateNote response includes the note ID
- Explicitly acknowledge: ""Note created with ID: xxx""

**Step 4: Append Remaining Sections**
- Use AppendToNote for each additional section
- Reference the note ID from Step 3
- Add one section at a time for best reliability

**Why This Pattern?**
- Prevents token limit truncation during large content generation
- Ensures no content is lost if generation is interrupted
- Maintains reliable context across the operation

**Example workflow for a multi-section note:**
1. ""Creating 'Meeting Notes' in 3 sections: Attendees, Discussion, Action Items""
2. CreateNote(title=""Meeting Notes"", content=""## Attendees\n- Alice\n- Bob..."")
3. ""Note created with ID: abc123. Adding remaining sections.""
4. AppendToNote(noteId=""abc123"", content=""\n\n## Discussion\n..."")
5. AppendToNote(noteId=""abc123"", content=""\n\n## Action Items\n..."")
6. ""Note complete with all 3 sections.""

### Content Editing Pattern

When modifying note content:
1. **GetNote** to retrieve FULL current content (required!)
2. Modify the content as requested
3. UpdateNote with the new content

For simple additions, use AppendToNote instead.";
    }

    #endregion

    [KernelFunction("CreateNote")]
    [Description("Creates a new note with title and content. IMPORTANT: Both parameters are REQUIRED. For notes with multiple sections, create with the first section only, then use AppendToNote for remaining sections. This prevents content truncation on large notes.")]
    public async Task<string> CreateNoteAsync(
        [Description("The title of the note (required)")] string title,
        [Description("The full text content of the note - REQUIRED, must not be empty or omitted")] string content,
        [Description("Comma-separated tags for categorizing the note (optional)")] string? tags = null)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot create note.";
        }

        // Validate required fields
        if (string.IsNullOrWhiteSpace(title))
        {
            return "Error: Note title is required and cannot be empty.";
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            return "Error: The 'content' parameter is required but was not provided. You must call CreateNote with BOTH 'title' AND 'content' parameters in the same tool call. Please retry with: {\"title\": \"your title\", \"content\": \"your note content here\"}";
        }

        try
        {
            var note = new Note
            {
                Id = Guid.NewGuid().ToString(),
                Title = title.Trim(),
                Content = content.Trim(),
                Tags = string.IsNullOrWhiteSpace(tags)
                    ? new List<string>()
                    : tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
                          .Select(t => t.Trim())
                          .Where(t => !string.IsNullOrEmpty(t))
                          .ToList(),
                UserId = _currentUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsArchived = false,
                Source = "agent"
            };

            var created = await _noteRepository.CreateAsync(note);

            var tagInfo = created.Tags.Any()
                ? $" with tags: {string.Join(", ", created.Tags)}"
                : "";

            // Return structured message with clearly identifiable note ID
            return $"Successfully created note \"{created.Title}\" (ID: {created.Id}){tagInfo}. Remember this note ID for future reference in this conversation.";
        }
        catch (Exception ex)
        {
            return $"Error creating note: {ex.Message}";
        }
    }

    [KernelFunction("SearchNotes")]
    [Description("Searches for notes matching the query in titles, content, or tags. Use this to find existing notes or information the user has saved.")]
    public async Task<string> SearchNotesAsync(
        [Description("The search query to find notes")] string query,
        [Description("Maximum number of results to return (default: 5)")] int maxResults = 5)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot search notes.";
        }

        try
        {
            var notes = await _noteRepository.GetByUserIdAsync(_currentUserId);

            var queryLower = query.ToLowerInvariant();
            var matches = notes
                .Where(n => !n.IsArchived &&
                    (n.Title.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                     n.Content.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                     n.Tags.Any(t => t.Contains(query, StringComparison.OrdinalIgnoreCase))))
                .OrderByDescending(n => n.UpdatedAt)
                .Take(maxResults)
                .ToList();

            if (!matches.Any())
            {
                return $"No notes found matching \"{query}\".";
            }

            var noteData = matches.Select(n => new
            {
                id = n.Id,
                title = n.Title,
                preview = GetContentPreview(n.Content),
                tags = n.Tags,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var response = new
            {
                type = "notes",
                message = $"Found {matches.Count} note(s) matching \"{query}\". Use GetNote with the note ID to read full content.",
                notes = noteData
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error searching notes: {ex.Message}";
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
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot update note.";
        }

        try
        {
            var note = await _noteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != _currentUserId)
            {
                return "Error: You don't have permission to update this note.";
            }

            var changes = new List<string>();
            var previousTags = new List<string>(note.Tags);

            if (!string.IsNullOrWhiteSpace(title) && title != note.Title)
            {
                note.Title = title;
                changes.Add("title");
            }

            if (!string.IsNullOrWhiteSpace(content) && content != note.Content)
            {
                note.Content = content;
                changes.Add("content");
            }

            if (tags != null)
            {
                note.Tags = tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(t => t.Trim())
                    .Where(t => !string.IsNullOrEmpty(t))
                    .ToList();
                changes.Add("tags");
            }

            if (!changes.Any())
            {
                return $"No changes made to note \"{note.Title}\" (ID: {noteId}).";
            }

            note.UpdatedAt = DateTime.UtcNow;
            await _noteRepository.UpdateAsync(noteId, note);

            // Provide detailed feedback about what changed, especially for tags
            var changeDetails = new List<string>();
            foreach (var change in changes)
            {
                if (change == "tags")
                {
                    var added = note.Tags.Except(previousTags).ToList();
                    var removed = previousTags.Except(note.Tags).ToList();

                    if (added.Any())
                        changeDetails.Add($"added tags: {string.Join(", ", added)}");
                    if (removed.Any())
                        changeDetails.Add($"removed tags: {string.Join(", ", removed)}");
                    if (!added.Any() && !removed.Any())
                        changeDetails.Add($"updated tags to: {string.Join(", ", note.Tags)}");
                }
                else
                {
                    changeDetails.Add($"updated {change}");
                }
            }

            return $"Successfully updated note \"{note.Title}\" (ID: {noteId}). Changes: {string.Join(", ", changeDetails)}.";
        }
        catch (Exception ex)
        {
            return $"Error updating note: {ex.Message}";
        }
    }

    [KernelFunction("GetNote")]
    [Description("Retrieves a specific note by its ID. Use this when you need to read the full content of a note.")]
    public async Task<string> GetNoteAsync(
        [Description("The ID of the note to retrieve")] string noteId)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot get note.";
        }

        try
        {
            var note = await _noteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != _currentUserId)
            {
                return "Error: You don't have permission to access this note.";
            }

            var response = new
            {
                type = "notes",
                message = $"Retrieved note \"{note.Title}\"",
                notes = new[]
                {
                    new
                    {
                        id = note.Id,
                        title = note.Title,
                        content = note.Content,
                        tags = note.Tags,
                        createdAt = note.CreatedAt,
                        updatedAt = note.UpdatedAt
                    }
                }
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error getting note: {ex.Message}";
        }
    }

    [KernelFunction("ListRecentNotes")]
    [Description("Lists the user's most recent notes. Use this to show what notes exist or to help the user remember what they've saved.")]
    public async Task<string> ListRecentNotesAsync(
        [Description("Maximum number of notes to list (default: 10)")] int maxResults = 10)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot list notes.";
        }

        try
        {
            var notes = await _noteRepository.GetByUserIdAsync(_currentUserId);

            var recentNotes = notes
                .Where(n => !n.IsArchived)
                .OrderByDescending(n => n.UpdatedAt)
                .Take(maxResults)
                .ToList();

            if (!recentNotes.Any())
            {
                return "You don't have any notes yet.";
            }

            var noteData = recentNotes.Select(n => new
            {
                id = n.Id,
                title = n.Title,
                preview = GetContentPreview(n.Content),
                tags = n.Tags,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var response = new
            {
                type = "notes",
                message = $"Your {recentNotes.Count} most recent notes. Use GetNote with the note ID to read full content.",
                notes = noteData
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error listing notes: {ex.Message}";
        }
    }

    [KernelFunction("ListAllNotes")]
    [Description("Lists all of the user's notes. Use this when the user wants to see their complete list of notes, not just recent ones.")]
    public async Task<string> ListAllNotesAsync(
        [Description("Whether to include archived notes (default: false)")] bool includeArchived = false,
        [Description("Optional: Skip this many notes for pagination (default: 0)")] int skip = 0,
        [Description("Optional: Maximum number of notes to return. Use 0 or negative for all notes (default: 0 = all)")] int limit = 0)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot list notes.";
        }

        try
        {
            var notes = await _noteRepository.GetByUserIdAsync(_currentUserId);

            var filteredNotes = includeArchived
                ? notes.ToList()
                : notes.Where(n => !n.IsArchived).ToList();

            var totalCount = filteredNotes.Count;

            // Apply ordering
            var orderedNotes = filteredNotes
                .OrderByDescending(n => n.UpdatedAt)
                .Skip(skip);

            // Apply limit if specified
            if (limit > 0)
            {
                orderedNotes = orderedNotes.Take(limit);
            }

            var resultNotes = orderedNotes.ToList();

            if (!resultNotes.Any())
            {
                if (skip > 0)
                {
                    return $"No more notes to show (skipped {skip} notes, total: {totalCount}).";
                }
                return includeArchived
                    ? "You don't have any notes yet."
                    : "You don't have any active notes. You may have archived notes - try setting includeArchived to true.";
            }

            var noteData = resultNotes.Select(n => new
            {
                id = n.Id,
                title = n.Title,
                preview = GetContentPreview(n.Content),
                tags = n.Tags,
                folder = n.Folder,
                isArchived = n.IsArchived,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var paginationInfo = skip > 0 || limit > 0
                ? $" (showing {resultNotes.Count} of {totalCount}, skipped {skip})"
                : "";

            var response = new
            {
                type = "notes",
                message = $"Found {totalCount} total note(s){paginationInfo}. Use GetNote with the note ID to read full content.",
                notes = noteData,
                pagination = new
                {
                    total = totalCount,
                    returned = resultNotes.Count,
                    skipped = skip,
                    hasMore = skip + resultNotes.Count < totalCount
                }
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error listing all notes: {ex.Message}";
        }
    }

    [KernelFunction("SemanticSearch")]
    [Description("Searches for notes using semantic/meaning-based search powered by AI embeddings. This finds notes that are conceptually related to the query even if they don't contain the exact keywords. Use this for complex queries or when keyword search doesn't find what you need.")]
    public async Task<string> SemanticSearchAsync(
        [Description("The search query to find semantically related notes")] string query,
        [Description("Maximum number of results to return (default: 5)")] int maxResults = 5)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot search notes.";
        }

        if (_ragService == null)
        {
            return "Semantic search is not available. Please use the regular SearchNotes function instead.";
        }

        try
        {
            // Use configuration-based threshold for consistent quality with normal chat RAG
            var similarityThreshold = _ragSettings?.SimilarityThreshold ?? 0.3f;
            
            var ragContext = await _ragService.RetrieveContextAsync(
                query,
                _currentUserId,
                topK: maxResults,
                similarityThreshold: similarityThreshold);

            if (!ragContext.RetrievedNotes.Any())
            {
                return $"No notes found semantically related to \"{query}\". Try using SearchNotes for keyword-based search.";
            }

            // Deduplicate by NoteId, keeping the highest similarity score for each note
            // This prevents the same note from appearing multiple times when multiple chunks match
            var uniqueNoteResults = ragContext.RetrievedNotes
                .GroupBy(r => r.NoteId)
                .Select(g => g.OrderByDescending(r => r.SimilarityScore).First())
                .ToList();

            // Get note details with FULL matched chunk content (not just preview)
            var noteData = new List<object>();
            foreach (var result in uniqueNoteResults)
            {
                var note = await _noteRepository.GetByIdAsync(result.NoteId);
                if (note != null && note.UserId == _currentUserId)
                {
                    // Parse the chunk content to extract meaningful information
                    var parsedChunk = SecondBrain.Application.Utilities.NoteContentParser.Parse(result.Content);
                    
                    // Use chunk content that was actually matched by RAG (not generic preview)
                    var chunkContent = parsedChunk.Content;
                    if (string.IsNullOrWhiteSpace(chunkContent))
                    {
                        // Fallback: extract content from raw chunk
                        chunkContent = ExtractContentFromChunk(result.Content);
                    }

                    // Build score information
                    var scoreInfo = result.SimilarityScore;
                    float? rerankScore = null;
                    if (result.Metadata != null && result.Metadata.TryGetValue("rerankScore", out var rs) && rs is float rsFloat)
                    {
                        rerankScore = rsFloat;
                    }

                    noteData.Add(new
                    {
                        id = note.Id,
                        title = note.Title,
                        // Include the matched chunk content for context (this is what was actually found)
                        matchedContent = chunkContent,
                        // Also include a short preview for display
                        preview = GetContentPreview(note.Content),
                        tags = note.Tags,
                        createdAt = note.CreatedAt,
                        updatedAt = note.UpdatedAt,
                        similarityScore = scoreInfo,
                        rerankScore = rerankScore,
                        chunkIndex = result.ChunkIndex
                    });
                }
            }

            var response = new
            {
                type = "notes",
                message = $"Found {noteData.Count} note(s) semantically related to \"{query}\". The 'matchedContent' field contains the relevant portion that matched your query.",
                notes = noteData
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error performing semantic search: {ex.Message}";
        }
    }

    /// <summary>
    /// Extracts meaningful content from a raw chunk, skipping metadata lines.
    /// </summary>
    private static string ExtractContentFromChunk(string? rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
            return string.Empty;

        var lines = rawContent.Split('\n');
        var contentLines = new List<string>();

        foreach (var line in lines)
        {
            var trimmedLine = line.Trim();

            // Skip metadata lines we already display separately
            if (trimmedLine.StartsWith("Title:") ||
                trimmedLine.StartsWith("Tags:") ||
                trimmedLine.StartsWith("Created:") ||
                trimmedLine.StartsWith("Last Updated:") ||
                trimmedLine == "Content:")
            {
                continue;
            }

            // Add any other non-empty lines as content
            if (!string.IsNullOrWhiteSpace(trimmedLine))
            {
                contentLines.Add(trimmedLine);
            }
        }

        return string.Join("\n", contentLines).Trim();
    }

    [KernelFunction("DeleteNote")]
    [Description("Permanently deletes a note by its ID. Use this when the user explicitly wants to delete or remove a note entirely.")]
    public async Task<string> DeleteNoteAsync(
        [Description("The ID of the note to delete")] string noteId)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot delete note.";
        }

        try
        {
            var note = await _noteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != _currentUserId)
            {
                return "Error: You don't have permission to delete this note.";
            }

            var noteTitle = note.Title;
            await _noteRepository.DeleteAsync(noteId);

            return $"Successfully deleted note \"{noteTitle}\" (ID: {noteId}).";
        }
        catch (Exception ex)
        {
            return $"Error deleting note: {ex.Message}";
        }
    }

    [KernelFunction("ArchiveNote")]
    [Description("Archives a note, hiding it from the main list while preserving it. Use this when the user wants to hide a note without permanently deleting it.")]
    public async Task<string> ArchiveNoteAsync(
        [Description("The ID of the note to archive")] string noteId)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot archive note.";
        }

        try
        {
            var note = await _noteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != _currentUserId)
            {
                return "Error: You don't have permission to archive this note.";
            }

            if (note.IsArchived)
            {
                return $"Note \"{note.Title}\" (ID: {noteId}) is already archived.";
            }

            note.IsArchived = true;
            note.Folder = "Archived"; // Move to Archived folder
            note.UpdatedAt = DateTime.UtcNow;
            await _noteRepository.UpdateAsync(noteId, note);

            return $"Successfully archived note \"{note.Title}\" (ID: {noteId}) and moved it to the Archived folder. Use UnarchiveNote to restore it.";
        }
        catch (Exception ex)
        {
            return $"Error archiving note: {ex.Message}";
        }
    }

    [KernelFunction("UnarchiveNote")]
    [Description("Restores an archived note back to the main list. Use this when the user wants to bring back a previously archived note.")]
    public async Task<string> UnarchiveNoteAsync(
        [Description("The ID of the note to unarchive")] string noteId)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot unarchive note.";
        }

        try
        {
            var note = await _noteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != _currentUserId)
            {
                return "Error: You don't have permission to unarchive this note.";
            }

            if (!note.IsArchived)
            {
                return $"Note \"{note.Title}\" (ID: {noteId}) is not archived.";
            }

            note.IsArchived = false;
            // Remove from Archived folder (only if currently in Archived folder)
            if (note.Folder == "Archived")
            {
                note.Folder = null;
            }
            note.UpdatedAt = DateTime.UtcNow;
            await _noteRepository.UpdateAsync(noteId, note);

            return $"Successfully restored note \"{note.Title}\" (ID: {noteId}) from archive.";
        }
        catch (Exception ex)
        {
            return $"Error unarchiving note: {ex.Message}";
        }
    }

    [KernelFunction("ListArchivedNotes")]
    [Description("Lists all archived notes. Use this when the user wants to see notes they have previously archived.")]
    public async Task<string> ListArchivedNotesAsync(
        [Description("Maximum number of archived notes to list (default: 10)")] int maxResults = 10)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot list archived notes.";
        }

        try
        {
            var notes = await _noteRepository.GetByUserIdAsync(_currentUserId);

            var archivedNotes = notes
                .Where(n => n.IsArchived)
                .OrderByDescending(n => n.UpdatedAt)
                .Take(maxResults)
                .ToList();

            if (!archivedNotes.Any())
            {
                return "You don't have any archived notes.";
            }

            var noteData = archivedNotes.Select(n => new
            {
                id = n.Id,
                title = n.Title,
                preview = GetContentPreview(n.Content),
                tags = n.Tags,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var response = new
            {
                type = "notes",
                message = $"Found {archivedNotes.Count} archived note(s). Use GetNote with the note ID to read full content.",
                notes = noteData
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error listing archived notes: {ex.Message}";
        }
    }

    [KernelFunction("AppendToNote")]
    [Description("Appends content to the end of an existing note. Use this when the user wants to add something to an existing note, like adding items to a list or adding new information.")]
    public async Task<string> AppendToNoteAsync(
        [Description("The ID of the note to append to")] string noteId,
        [Description("The content to append to the note")] string contentToAppend,
        [Description("Whether to add a newline before the appended content (default: true)")] bool addNewline = true)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot append to note.";
        }

        if (string.IsNullOrWhiteSpace(contentToAppend))
        {
            return "Error: Content to append cannot be empty.";
        }

        try
        {
            var note = await _noteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != _currentUserId)
            {
                return "Error: You don't have permission to modify this note.";
            }

            var separator = addNewline ? "\n" : "";
            note.Content = note.Content + separator + contentToAppend.Trim();
            note.UpdatedAt = DateTime.UtcNow;
            await _noteRepository.UpdateAsync(noteId, note);

            return $"Successfully appended content to note \"{note.Title}\" (ID: {noteId}). Note now contains {note.Content.Length} characters. Continue with additional AppendToNote calls if more sections remain.";
        }
        catch (Exception ex)
        {
            return $"Error appending to note: {ex.Message}";
        }
    }

    [KernelFunction("SearchByTags")]
    [Description("Finds notes that have one or more of the specified tags. Use this when the user wants to find notes by their tags or categories.")]
    public async Task<string> SearchByTagsAsync(
        [Description("Comma-separated list of tags to search for")] string tags,
        [Description("If true, notes must have ALL specified tags; if false, notes with ANY of the tags match (default: false)")] bool requireAll = false,
        [Description("Maximum number of results to return (default: 10)")] int maxResults = 10)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot search notes.";
        }

        if (string.IsNullOrWhiteSpace(tags))
        {
            return "Error: Please specify at least one tag to search for.";
        }

        try
        {
            var searchTags = tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(t => t.Trim().ToLowerInvariant())
                .Where(t => !string.IsNullOrEmpty(t))
                .ToList();

            if (!searchTags.Any())
            {
                return "Error: Please specify at least one valid tag to search for.";
            }

            var notes = await _noteRepository.GetByUserIdAsync(_currentUserId);

            var matches = notes
                .Where(n => !n.IsArchived)
                .Where(n =>
                {
                    var noteTags = n.Tags.Select(t => t.ToLowerInvariant()).ToList();
                    return requireAll
                        ? searchTags.All(st => noteTags.Contains(st))
                        : searchTags.Any(st => noteTags.Contains(st));
                })
                .OrderByDescending(n => n.UpdatedAt)
                .Take(maxResults)
                .ToList();

            if (!matches.Any())
            {
                var tagList = string.Join(", ", searchTags);
                return requireAll
                    ? $"No notes found with all of these tags: {tagList}."
                    : $"No notes found with any of these tags: {tagList}.";
            }

            var noteData = matches.Select(n => new
            {
                id = n.Id,
                title = n.Title,
                preview = GetContentPreview(n.Content),
                tags = n.Tags,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var response = new
            {
                type = "notes",
                message = $"Found {matches.Count} note(s) with {(requireAll ? "all" : "any")} of the tags: {string.Join(", ", searchTags)}. Use GetNote with the note ID to read full content.",
                notes = noteData
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error searching notes by tags: {ex.Message}";
        }
    }

    [KernelFunction("ListAllTags")]
    [Description("Lists all unique tags used across the user's notes, with counts showing how many notes use each tag. Use this to help the user understand how their notes are organized.")]
    public async Task<string> ListAllTagsAsync(
        [Description("Whether to include archived notes in the tag counts (default: false)")] bool includeArchived = false)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot list tags.";
        }

        try
        {
            var notes = await _noteRepository.GetByUserIdAsync(_currentUserId);

            var filteredNotes = includeArchived
                ? notes
                : notes.Where(n => !n.IsArchived);

            var tagCounts = filteredNotes
                .SelectMany(n => n.Tags)
                .GroupBy(t => t.ToLowerInvariant())
                .Select(g => new { tag = g.First(), count = g.Count() })
                .OrderByDescending(x => x.count)
                .ThenBy(x => x.tag)
                .ToList();

            if (!tagCounts.Any())
            {
                return "You don't have any tags yet. Add tags to your notes to organize them.";
            }

            var response = new
            {
                type = "tags",
                message = $"Found {tagCounts.Count} unique tag(s) across your notes",
                tags = tagCounts.Select(tc => new { name = tc.tag, noteCount = tc.count }).ToList(),
                totalNotesWithTags = filteredNotes.Count(n => n.Tags.Any()),
                totalNotes = filteredNotes.Count()
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error listing tags: {ex.Message}";
        }
    }

    [KernelFunction("MoveToFolder")]
    [Description("Moves a note to a specific folder for organization. Use this when the user wants to organize notes into folders or categories.")]
    public async Task<string> MoveToFolderAsync(
        [Description("The ID of the note to move")] string noteId,
        [Description("The folder name to move the note to (use empty string or null to remove from folder)")] string? folder = null)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot move note.";
        }

        try
        {
            var note = await _noteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != _currentUserId)
            {
                return "Error: You don't have permission to move this note.";
            }

            var previousFolder = note.Folder;
            var newFolder = string.IsNullOrWhiteSpace(folder) ? null : folder.Trim();

            note.Folder = newFolder;
            note.UpdatedAt = DateTime.UtcNow;
            await _noteRepository.UpdateAsync(noteId, note);

            if (string.IsNullOrEmpty(newFolder))
            {
                return previousFolder != null
                    ? $"Removed note \"{note.Title}\" (ID: {noteId}) from folder \"{previousFolder}\"."
                    : $"Note \"{note.Title}\" (ID: {noteId}) is not in any folder.";
            }

            return previousFolder != null
                ? $"Moved note \"{note.Title}\" (ID: {noteId}) from folder \"{previousFolder}\" to \"{newFolder}\"."
                : $"Moved note \"{note.Title}\" (ID: {noteId}) to folder \"{newFolder}\".";
        }
        catch (Exception ex)
        {
            return $"Error moving note: {ex.Message}";
        }
    }

    [KernelFunction("ListFolders")]
    [Description("Lists all folders used to organize notes, with counts showing how many notes are in each folder. Use this to help the user understand their folder organization.")]
    public async Task<string> ListFoldersAsync(
        [Description("Whether to include archived notes in the folder counts (default: false)")] bool includeArchived = false)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot list folders.";
        }

        try
        {
            var notes = await _noteRepository.GetByUserIdAsync(_currentUserId);
            var allNotes = notes.ToList();

            var activeNotes = allNotes.Where(n => !n.IsArchived).ToList();
            var archivedNotes = allNotes.Where(n => n.IsArchived).ToList();
            var filteredNotes = includeArchived ? allNotes : activeNotes;

            // Calculate folder counts from filtered notes
            var folderCountsDict = filteredNotes
                .Where(n => !string.IsNullOrEmpty(n.Folder))
                .GroupBy(n => n.Folder!)
                .ToDictionary(g => g.Key, g => g.Count());

            // Always include the "Archived" folder if there are archived notes (it's a system-managed folder)
            if (archivedNotes.Any() && !folderCountsDict.ContainsKey("Archived"))
            {
                folderCountsDict["Archived"] = archivedNotes.Count;
            }

            var folderCounts = folderCountsDict
                .Select(kvp => new { name = kvp.Key, noteCount = kvp.Value })
                .OrderByDescending(x => x.noteCount)
                .ThenBy(x => x.name)
                .ToList();

            var notesWithoutFolder = filteredNotes.Count(n => string.IsNullOrEmpty(n.Folder));
            var totalNotesCount = filteredNotes.Count + (includeArchived ? 0 : archivedNotes.Count);

            if (!folderCounts.Any() && notesWithoutFolder == 0 && !archivedNotes.Any())
            {
                return "You don't have any notes yet.";
            }

            var response = new
            {
                type = "folders",
                message = folderCounts.Any()
                    ? $"Found {folderCounts.Count} folder(s)"
                    : "No folders found. All notes are unfiled.",
                folders = folderCounts,
                unfiledNotes = notesWithoutFolder,
                totalNotes = totalNotesCount
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error listing folders: {ex.Message}";
        }
    }

    [KernelFunction("GetNoteStats")]
    [Description("Gets statistics about the user's notes, including total counts, tag distribution, and folder organization. Use this to give the user an overview of their notes.")]
    public async Task<string> GetNoteStatsAsync(
        [Description("Whether to include archived notes in the statistics (default: false)")] bool includeArchived = false)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot get statistics.";
        }

        try
        {
            var notes = await _noteRepository.GetByUserIdAsync(_currentUserId);
            var allNotes = notes.ToList();

            var activeNotes = allNotes.Where(n => !n.IsArchived).ToList();
            var archivedNotes = allNotes.Where(n => n.IsArchived).ToList();
            var notesForStats = includeArchived ? allNotes : activeNotes;

            // Tag statistics
            var tagCounts = notesForStats
                .SelectMany(n => n.Tags)
                .GroupBy(t => t.ToLowerInvariant())
                .Select(g => new { tag = g.First(), count = g.Count() })
                .OrderByDescending(x => x.count)
                .Take(10)
                .ToList();

            // Folder statistics - calculate from notesForStats first
            var folderCountsDict = notesForStats
                .Where(n => !string.IsNullOrEmpty(n.Folder))
                .GroupBy(n => n.Folder!)
                .ToDictionary(g => g.Key, g => g.Count());

            // Always include the "Archived" folder if there are archived notes (it's a system-managed folder)
            // This ensures users can see their archived notes count in folder statistics
            if (archivedNotes.Any() && !folderCountsDict.ContainsKey("Archived"))
            {
                folderCountsDict["Archived"] = archivedNotes.Count;
            }

            var topFolders = folderCountsDict
                .Select(kvp => new { name = kvp.Key, count = kvp.Value })
                .OrderByDescending(x => x.count)
                .ThenBy(x => x.name)
                .Take(10)
                .ToList();

            // Calculate notes in folders - include archived notes since they're in the Archived folder
            var notesInFoldersCount = notesForStats.Count(n => !string.IsNullOrEmpty(n.Folder));
            if (!includeArchived && archivedNotes.Any())
            {
                // Add archived notes count since they're all in the Archived folder
                notesInFoldersCount += archivedNotes.Count;
            }

            // Date statistics
            var now = DateTime.UtcNow;
            var notesThisWeek = notesForStats.Count(n => n.CreatedAt >= now.AddDays(-7));
            var notesThisMonth = notesForStats.Count(n => n.CreatedAt >= now.AddDays(-30));

            var response = new
            {
                type = "stats",
                message = "Notes statistics",
                statistics = new
                {
                    totalNotes = allNotes.Count,
                    activeNotes = activeNotes.Count,
                    archivedNotes = archivedNotes.Count,
                    notesCreatedThisWeek = notesThisWeek,
                    notesCreatedThisMonth = notesThisMonth,
                    notesWithTags = notesForStats.Count(n => n.Tags.Any()),
                    notesInFolders = notesInFoldersCount,
                    uniqueTagCount = tagCounts.Count,
                    uniqueFolderCount = folderCountsDict.Count,
                    topTags = tagCounts.Select(tc => new { name = tc.tag, count = tc.count }).ToList(),
                    topFolders = topFolders
                }
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error getting note statistics: {ex.Message}";
        }
    }

    [KernelFunction("GetNotesByDateRange")]
    [Description("Finds notes created or updated within a specific date range. Use this when the user wants to find notes from a particular time period.")]
    public async Task<string> GetNotesByDateRangeAsync(
        [Description("Start date in ISO format (e.g., '2024-01-01') or relative like 'today', 'yesterday', 'last week', 'last month'")] string startDate,
        [Description("End date in ISO format (e.g., '2024-12-31') or relative like 'today', 'now' (optional, defaults to now)")] string? endDate = null,
        [Description("Whether to search by 'created' or 'updated' date (default: 'created')")] string dateField = "created",
        [Description("Maximum number of results to return (default: 10)")] int maxResults = 10)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot search notes.";
        }

        try
        {
            var now = DateTime.UtcNow;
            DateTime start;
            DateTime end = now;

            // Parse start date
            start = ParseRelativeDate(startDate, now);

            // Parse end date if provided
            if (!string.IsNullOrWhiteSpace(endDate))
            {
                end = ParseRelativeDate(endDate, now);
            }

            // Ensure start is before end
            if (start > end)
            {
                (start, end) = (end, start);
            }

            var notes = await _noteRepository.GetByUserIdAsync(_currentUserId);

            var useCreatedDate = dateField.Equals("created", StringComparison.OrdinalIgnoreCase);

            var matches = notes
                .Where(n => !n.IsArchived)
                .Where(n =>
                {
                    var dateToCheck = useCreatedDate ? n.CreatedAt : n.UpdatedAt;
                    return dateToCheck >= start && dateToCheck <= end;
                })
                .OrderByDescending(n => useCreatedDate ? n.CreatedAt : n.UpdatedAt)
                .Take(maxResults)
                .ToList();

            if (!matches.Any())
            {
                return $"No notes found {(useCreatedDate ? "created" : "updated")} between {start:yyyy-MM-dd} and {end:yyyy-MM-dd}.";
            }

            var noteData = matches.Select(n => new
            {
                id = n.Id,
                title = n.Title,
                preview = GetContentPreview(n.Content),
                tags = n.Tags,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var response = new
            {
                type = "notes",
                message = $"Found {matches.Count} note(s) {(useCreatedDate ? "created" : "updated")} between {start:yyyy-MM-dd} and {end:yyyy-MM-dd}. Use GetNote with the note ID to read full content.",
                notes = noteData
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error searching notes by date: {ex.Message}";
        }
    }

    private static DateTime ParseRelativeDate(string dateStr, DateTime now)
    {
        var lower = dateStr.Trim().ToLowerInvariant();

        return lower switch
        {
            "today" or "now" => now,
            "yesterday" => now.AddDays(-1),
            "last week" or "week ago" => now.AddDays(-7),
            "last month" or "month ago" => now.AddMonths(-1),
            "last year" or "year ago" => now.AddYears(-1),
            _ => DateTime.TryParse(dateStr, out var parsed) ? parsed : now
        };
    }

    [KernelFunction("FindRelatedNotes")]
    [Description("Finds notes that are semantically related to a specific note. Use this to discover connections between notes or find similar content.")]
    public async Task<string> FindRelatedNotesAsync(
        [Description("The ID of the note to find related notes for")] string noteId,
        [Description("Maximum number of related notes to return (default: 5)")] int maxResults = 5)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot find related notes.";
        }

        try
        {
            var note = await _noteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != _currentUserId)
            {
                return "Error: You don't have permission to access this note.";
            }

            // If RAG service is available, use semantic search
            if (_ragService != null)
            {
                var searchQuery = $"{note.Title} {note.Content}";
                var ragContext = await _ragService.RetrieveContextAsync(
                    searchQuery,
                    _currentUserId,
                    topK: maxResults + 1, // +1 because the note itself might be returned
                    similarityThreshold: 0.3f);

                // Deduplicate by NoteId, keeping the highest similarity score for each note
                // This prevents the same note from appearing multiple times when multiple chunks match
                var uniqueNoteResults = ragContext.RetrievedNotes
                    .Where(r => r.NoteId != noteId) // Skip the source note
                    .GroupBy(r => r.NoteId)
                    .Select(g => g.OrderByDescending(r => r.SimilarityScore).First())
                    .ToList();

                var relatedNotes = new List<object>();
                foreach (var result in uniqueNoteResults)
                {
                    var relatedNote = await _noteRepository.GetByIdAsync(result.NoteId);
                    if (relatedNote != null && relatedNote.UserId == _currentUserId && !relatedNote.IsArchived)
                    {
                        relatedNotes.Add(new
                        {
                            id = relatedNote.Id,
                            title = relatedNote.Title,
                            preview = GetContentPreview(relatedNote.Content),
                            tags = relatedNote.Tags,
                            createdAt = relatedNote.CreatedAt,
                            updatedAt = relatedNote.UpdatedAt,
                            similarityScore = result.SimilarityScore
                        });

                        if (relatedNotes.Count >= maxResults) break;
                    }
                }

                if (!relatedNotes.Any())
                {
                    return $"No related notes found for \"{note.Title}\".";
                }

                var response = new
                {
                    type = "notes",
                    message = $"Found {relatedNotes.Count} note(s) related to \"{note.Title}\". Use GetNote with the note ID to read full content.",
                    sourceNote = new { id = note.Id, title = note.Title },
                    notes = relatedNotes
                };

                return JsonSerializer.Serialize(response);
            }

            // Fallback: Use tag-based similarity
            var notes = await _noteRepository.GetByUserIdAsync(_currentUserId);
            var similarNotes = notes
                .Where(n => !n.IsArchived && n.Id != noteId)
                .Select(n => new
                {
                    note = n,
                    commonTags = n.Tags.Intersect(note.Tags, StringComparer.OrdinalIgnoreCase).Count()
                })
                .Where(x => x.commonTags > 0)
                .OrderByDescending(x => x.commonTags)
                .Take(maxResults)
                .ToList();

            if (!similarNotes.Any())
            {
                return $"No related notes found for \"{note.Title}\". Try adding tags to find connections.";
            }

            var fallbackResponse = new
            {
                type = "notes",
                message = $"Found {similarNotes.Count} note(s) with similar tags to \"{note.Title}\". Use GetNote with the note ID to read full content.",
                sourceNote = new { id = note.Id, title = note.Title },
                notes = similarNotes.Select(x => new
                {
                    id = x.note.Id,
                    title = x.note.Title,
                    preview = GetContentPreview(x.note.Content),
                    tags = x.note.Tags,
                    createdAt = x.note.CreatedAt,
                    updatedAt = x.note.UpdatedAt,
                    commonTags = x.commonTags
                }).ToList()
            };

            return JsonSerializer.Serialize(fallbackResponse);
        }
        catch (Exception ex)
        {
            return $"Error finding related notes: {ex.Message}";
        }
    }

    [KernelFunction("DuplicateNote")]
    [Description("Creates a copy of an existing note. Use this when the user wants to duplicate a note as a template or starting point for a new note.")]
    public async Task<string> DuplicateNoteAsync(
        [Description("The ID of the note to duplicate")] string noteId,
        [Description("Optional new title for the duplicate (default: adds 'Copy of' prefix)")] string? newTitle = null)
    {
        if (string.IsNullOrEmpty(_currentUserId))
        {
            return "Error: User context not set. Cannot duplicate note.";
        }

        try
        {
            var sourceNote = await _noteRepository.GetByIdAsync(noteId);

            if (sourceNote == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (sourceNote.UserId != _currentUserId)
            {
                return "Error: You don't have permission to duplicate this note.";
            }

            var duplicateTitle = string.IsNullOrWhiteSpace(newTitle)
                ? $"Copy of {sourceNote.Title}"
                : newTitle.Trim();

            var duplicateNote = new Note
            {
                Id = Guid.NewGuid().ToString(),
                Title = duplicateTitle,
                Content = sourceNote.Content,
                Tags = new List<string>(sourceNote.Tags),
                Folder = sourceNote.Folder,
                UserId = _currentUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsArchived = false,
                Source = "agent"
            };

            var created = await _noteRepository.CreateAsync(duplicateNote);

            var tagInfo = created.Tags.Any()
                ? $" with tags: {string.Join(", ", created.Tags)}"
                : "";

            var folderInfo = !string.IsNullOrEmpty(created.Folder)
                ? $" in folder \"{created.Folder}\""
                : "";

            return $"Successfully duplicated note \"{sourceNote.Title}\" as \"{created.Title}\" (ID: {created.Id}){tagInfo}{folderInfo}.";
        }
        catch (Exception ex)
        {
            return $"Error duplicating note: {ex.Message}";
        }
    }
}
