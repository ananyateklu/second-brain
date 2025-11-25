using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Plugins;

public class NotesPlugin : IAgentPlugin
{
    private readonly INoteRepository _noteRepository;
    private readonly IRagService? _ragService;
    private string _currentUserId = string.Empty;

    public NotesPlugin(INoteRepository noteRepository, IRagService? ragService = null)
    {
        _noteRepository = noteRepository;
        _ragService = ragService;
    }

    #region IAgentPlugin Implementation

    public string CapabilityId => "notes";
    public string DisplayName => "Notes";
    public string Description => "Create, search, update, and manage notes with semantic search capabilities";

    public void SetCurrentUserId(string userId)
    {
        _currentUserId = userId;
    }

    public object GetPluginInstance() => this;

    public string GetPluginName() => "Notes";

    public string GetSystemPromptAddition()
    {
        return @"
## Notes Management Tools

You have access to tools for managing the user's notes. Use these tools to help users organize and retrieve their information.

### Available Tools

- **CreateNote**: Create a new note with title, content, and optional tags
  - Use when user wants to save information or remember something
  - Always provide meaningful titles that summarize the content
  - Suggest relevant tags based on content (e.g., 'meeting', 'recipe', 'project')

- **SearchNotes**: Keyword-based search in titles, content, and tags
  - Use for finding specific notes when user provides exact terms
  - Good for searching names, specific phrases, or tags

- **SemanticSearch**: AI-powered search that finds conceptually related notes
  - Use when keyword search fails or for conceptual queries
  - Finds notes by meaning even without exact keyword matches
  - Example: 'cooking' finds notes about recipes, ingredients, meal planning

- **UpdateNote**: Modify a note's title, content, or tags
  - Requires the note ID from previous operations
  - Can update one or more fields at a time
  - To edit content (e.g., remove an item from a list), first use GetNote to see current content

- **GetNote**: Retrieve full note by ID
  - Use to view complete note contents before editing
  - Always get the note first when you need to modify content

- **ListRecentNotes**: Show most recently updated notes
  - Use when user wants to see their notes or remember what they saved

- **DeleteNote**: Permanently remove a note
  - Only use when user explicitly requests deletion
  - This action cannot be undone

### Important Guidelines

1. **Always use tools** - Never tell users you cannot perform note operations
2. **Track note IDs** - Remember IDs from tool results for follow-up actions
3. **Understand context** - When user says 'that note' or 'the one I created', reference the ID from conversation history
4. **Don't repeat content** - Notes display as visual cards in the UI, so keep your responses concise
5. **Suggest improvements** - Offer to add tags, create related notes, or organize information

### Content Editing Pattern

When modifying note content:
1. GetNote to retrieve current content
2. Modify the content as requested
3. UpdateNote with the new content";
    }

    #endregion

    [KernelFunction("CreateNote")]
    [Description("Creates a new note with the specified title and content. Use this when the user wants to save information, create a note, or remember something.")]
    public async Task<string> CreateNoteAsync(
        [Description("The title of the note")] string title,
        [Description("The content/body of the note - this is required and cannot be empty")] string content,
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
            return "Error: Note content is required and cannot be empty. Please provide the content for the note.";
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
                content = n.Content,
                tags = n.Tags,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var response = new
            {
                type = "notes",
                message = $"Found {matches.Count} note(s) matching \"{query}\"",
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
                content = n.Content,
                tags = n.Tags,
                createdAt = n.CreatedAt,
                updatedAt = n.UpdatedAt
            }).ToList();

            var response = new
            {
                type = "notes",
                message = $"Your {recentNotes.Count} most recent notes",
                notes = noteData
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error listing notes: {ex.Message}";
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
            var ragContext = await _ragService.RetrieveContextAsync(
                query,
                _currentUserId,
                topK: maxResults,
                similarityThreshold: 0.3f);

            if (!ragContext.RetrievedNotes.Any())
            {
                return $"No notes found semantically related to \"{query}\". Try using SearchNotes for keyword-based search.";
            }

            // Get full note details for the retrieved notes
            var noteData = new List<object>();
            foreach (var result in ragContext.RetrievedNotes)
            {
                var note = await _noteRepository.GetByIdAsync(result.NoteId);
                if (note != null && note.UserId == _currentUserId)
                {
                    noteData.Add(new
                    {
                        id = note.Id,
                        title = note.Title,
                        content = note.Content,
                        tags = note.Tags,
                        createdAt = note.CreatedAt,
                        updatedAt = note.UpdatedAt,
                        similarityScore = result.SimilarityScore
                    });
                }
            }

            var response = new
            {
                type = "notes",
                message = $"Found {noteData.Count} note(s) semantically related to \"{query}\"",
                notes = noteData
            };

            return JsonSerializer.Serialize(response);
        }
        catch (Exception ex)
        {
            return $"Error performing semantic search: {ex.Message}";
        }
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
}
