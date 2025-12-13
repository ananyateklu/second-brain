using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Plugins;

/// <summary>
/// Plugin handling search operations for notes:
/// SearchNotes, SemanticSearch, SearchByTags, GetNotesByDateRange, FindRelatedNotes.
/// </summary>
public class NoteSearchPlugin : NotePluginBase
{
    public NoteSearchPlugin(
        IParallelNoteRepository noteRepository,
        IRagService? ragService = null,
        RagSettings? ragSettings = null,
        IStructuredOutputService? structuredOutputService = null)
        : base(noteRepository, ragService, ragSettings, structuredOutputService)
    {
    }

    public override string CapabilityId => "notes-search";
    public override string DisplayName => "Notes Search";
    public override string Description => "Search and find notes using keywords, semantic search, tags, and date ranges";

    public override string GetPluginName() => "NotesSearch";

    public override string GetSystemPromptAddition()
    {
        var contextInstructions = AgentRagEnabled
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

        return contextInstructions + @"
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
  - Uses semantic search to find conceptually related notes";
    }

    [KernelFunction("SearchNotes")]
    [Description("Searches for notes matching the query in titles, content, or tags. Use this to find existing notes or information the user has saved.")]
    public async Task<string> SearchNotesAsync(
        [Description("The search query to find notes")] string query,
        [Description("Maximum number of results to return (default: 5)")] int maxResults = 5)
    {
        var userError = ValidateUserContext("search notes");
        if (userError != null) return userError;

        try
        {
            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);

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
            return CreateErrorResponse("searching notes", ex.Message);
        }
    }

    [KernelFunction("SemanticSearch")]
    [Description("Searches for notes using semantic/meaning-based search powered by AI embeddings. This finds notes that are conceptually related to the query even if they don't contain the exact keywords.")]
    public async Task<string> SemanticSearchAsync(
        [Description("The search query to find semantically related notes")] string query,
        [Description("Maximum number of results to return (default: 5)")] int maxResults = 5)
    {
        var userError = ValidateUserContext("search notes");
        if (userError != null) return userError;

        if (RagService == null)
        {
            return "Semantic search is not available. Please use the regular SearchNotes function instead.";
        }

        try
        {
            var similarityThreshold = RagSettings?.SimilarityThreshold ?? 0.3f;

            var ragContext = await RagService.RetrieveContextAsync(
                query,
                CurrentUserId,
                topK: maxResults,
                similarityThreshold: similarityThreshold);

            if (!ragContext.RetrievedNotes.Any())
            {
                return $"No notes found semantically related to \"{query}\". Try using SearchNotes for keyword-based search.";
            }

            // Deduplicate by NoteId, keeping the highest similarity score for each note
            var uniqueNoteResults = ragContext.RetrievedNotes
                .GroupBy(r => r.NoteId)
                .Select(g => g.OrderByDescending(r => r.SimilarityScore).First())
                .ToList();

            // Get note details with FULL matched chunk content
            var noteData = new List<object>();
            foreach (var result in uniqueNoteResults)
            {
                var note = await NoteRepository.GetByIdAsync(result.NoteId);
                if (note != null && note.UserId == CurrentUserId)
                {
                    var parsedChunk = Utilities.NoteContentParser.Parse(result.Content);
                    var chunkContent = parsedChunk.Content;
                    if (string.IsNullOrWhiteSpace(chunkContent))
                    {
                        chunkContent = ExtractContentFromChunk(result.Content);
                    }

                    float? rerankScore = null;
                    if (result.Metadata != null && result.Metadata.TryGetValue("rerankScore", out var rs) && rs is float rsFloat)
                    {
                        rerankScore = rsFloat;
                    }

                    noteData.Add(new
                    {
                        id = note.Id,
                        title = note.Title,
                        matchedContent = chunkContent,
                        preview = GetContentPreview(note.Content),
                        tags = note.Tags,
                        createdAt = note.CreatedAt,
                        updatedAt = note.UpdatedAt,
                        similarityScore = result.SimilarityScore,
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
            return CreateErrorResponse("performing semantic search", ex.Message);
        }
    }

    [KernelFunction("SearchByTags")]
    [Description("Finds notes that have one or more of the specified tags. Use this when the user wants to find notes by their tags or categories.")]
    public async Task<string> SearchByTagsAsync(
        [Description("Comma-separated list of tags to search for")] string tags,
        [Description("If true, notes must have ALL specified tags; if false, notes with ANY of the tags match (default: false)")] bool requireAll = false,
        [Description("Maximum number of results to return (default: 10)")] int maxResults = 10)
    {
        var userError = ValidateUserContext("search notes");
        if (userError != null) return userError;

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

            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);

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
            return CreateErrorResponse("searching notes by tags", ex.Message);
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
        var userError = ValidateUserContext("search notes");
        if (userError != null) return userError;

        try
        {
            var now = DateTime.UtcNow;
            DateTime start = ParseRelativeDate(startDate, now);
            DateTime end = string.IsNullOrWhiteSpace(endDate) ? now : ParseRelativeDate(endDate, now);

            // Ensure start is before end
            if (start > end)
            {
                (start, end) = (end, start);
            }

            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);
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
            return CreateErrorResponse("searching notes by date", ex.Message);
        }
    }

    [KernelFunction("FindRelatedNotes")]
    [Description("Finds notes that are semantically related to a specific note. Use this to discover connections between notes or find similar content.")]
    public async Task<string> FindRelatedNotesAsync(
        [Description("The ID of the note to find related notes for")] string noteId,
        [Description("Maximum number of related notes to return (default: 5)")] int maxResults = 5)
    {
        var userError = ValidateUserContext("find related notes");
        if (userError != null) return userError;

        try
        {
            var note = await NoteRepository.GetByIdAsync(noteId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found.";
            }

            if (note.UserId != CurrentUserId)
            {
                return "Error: You don't have permission to access this note.";
            }

            // If RAG service is available, use semantic search
            if (RagService != null)
            {
                var searchQuery = $"{note.Title} {note.Content}";
                var ragContext = await RagService.RetrieveContextAsync(
                    searchQuery,
                    CurrentUserId,
                    topK: maxResults + 1,
                    similarityThreshold: 0.3f);

                var uniqueNoteResults = ragContext.RetrievedNotes
                    .Where(r => r.NoteId != noteId)
                    .GroupBy(r => r.NoteId)
                    .Select(g => g.OrderByDescending(r => r.SimilarityScore).First())
                    .ToList();

                var relatedNotes = new List<object>();
                foreach (var result in uniqueNoteResults)
                {
                    var relatedNote = await NoteRepository.GetByIdAsync(result.NoteId);
                    if (relatedNote != null && relatedNote.UserId == CurrentUserId && !relatedNote.IsArchived)
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
            var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);
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
            return CreateErrorResponse("finding related notes", ex.Message);
        }
    }
}
