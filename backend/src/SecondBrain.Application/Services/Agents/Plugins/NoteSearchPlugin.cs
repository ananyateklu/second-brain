using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.Notes;
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
- **Always start with SemanticSearch** - it's the most effective way to find notes
- Only use SearchNotes if you need exact phrase matching
- Use SearchByTags when looking for notes by category
- Always search before answering questions that might relate to the user's notes
";

        return contextInstructions + @"
### Search Tool Selection (IMPORTANT)

**DEFAULT CHOICE: SemanticSearch**
- Use SemanticSearch as your **first choice** for finding notes
- Finds notes by meaning/concept, not just keywords
- Handles synonyms, related terms, and different phrasings
- Example: ""sambusa recipe"" finds notes about ""samosas"" or ""fried pastries""

**When to use other search tools:**
| Scenario | Best Tool |
|----------|-----------|
| Finding notes about a topic | **SemanticSearch** (default) |
| Looking up by exact phrase | SearchNotes |
| Browsing notes in a category | SearchByTags |
| Finding recent activity | GetNotesByDateRange |
| Discovering connections | FindRelatedNotes |

### Search Tools (Return Previews Only)

- **SemanticSearch** ⭐ PRIMARY SEARCH TOOL
  - AI-powered search that understands meaning and context
  - **Use this first** - it's the most effective for finding relevant notes
  - Finds notes even with different wording, synonyms, or related concepts
  - Returns preview only - use GetNote for full content

- **SearchNotes**: Exact keyword/phrase matching
  - Only use when you need to match specific text exactly
  - Looks for literal matches in titles, content, and tags
  - Returns preview only - use GetNote for full content
  - If this returns no results, try SemanticSearch instead

- **SearchByTags**: Find notes by their tags
  - Use when user asks for notes in a specific category
  - Can require all tags or any of the specified tags
  - Returns preview only - use GetNote for full content

- **GetNotesByDateRange**: Find notes by creation or update date
  - Use for time-based queries like ""notes from last week""
  - Supports relative dates: 'today', 'yesterday', 'last week', 'last month'
  - Returns preview only - use GetNote for full content

- **FindRelatedNotes**: Find notes similar to a given note
  - Use to discover connections between notes
  - Requires a note ID - use after finding a relevant note
  - Returns preview only - use GetNote for full content";
    }

    [KernelFunction("SearchNotes")]
    [Description("EXACT TEXT search only. Use when user needs literal phrase matching (case-insensitive). If no results, suggest SemanticSearch. DEFAULT to SemanticSearch for topic searches. Examples: 'find exact phrase XYZ', 'search for error code 404' -> SearchNotes.")]
    public async Task<string> SearchNotesAsync(
        [Description("Exact text to search for")] string query,
        [Description("Max results (default: 5)")] int maxResults = 5,
        [Description("Detail: 'ids_only', 'summary' (default), 'full'")] string detailLevel = "summary")
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
                return $"No notes found with exact match for \"{query}\". Try using SemanticSearch instead - it finds notes by meaning and handles synonyms/related terms better.";
            }

            var noteData = MapNotesByDetailLevel(matches, detailLevel);
            var detailHint = detailLevel.ToLowerInvariant() == "full" ? "" : " Use GetNote with the note ID to read full content.";

            var response = new
            {
                type = "notes",
                message = $"Found {matches.Count} note(s) matching \"{query}\".{detailHint}",
                detailLevel = detailLevel.ToLowerInvariant(),
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
    [Description("DEFAULT SEARCH - Find notes by MEANING. Use FIRST for any search. Handles synonyms, concepts, different wording ('pasta' finds 'spaghetti', 'cooking' finds 'recipes'). Only use SearchNotes if exact phrase required. Examples: 'find my notes about X', 'search for Y', 'what do I have on Z' -> SemanticSearch.")]
    public async Task<string> SemanticSearchAsync(
        [Description("Search concept/topic (not exact phrase)")] string query,
        [Description("Max results (default: 5)")] int maxResults = 5)
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
                similarityThreshold: similarityThreshold,
                options: UserRagOptions);

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
                var note = await NoteRepository.GetByIdForUserAsync(result.NoteId, CurrentUserId);
                if (note != null)
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
    [Description("Find notes by TAG only. Use when user explicitly asks for notes with specific tags/categories. For topic-based search use SemanticSearch. Examples: 'show notes tagged recipe', 'find all project notes', 'what's tagged important' -> SearchByTags.")]
    public async Task<string> SearchByTagsAsync(
        [Description("Comma-separated tags to search")] string tags,
        [Description("Require ALL tags? (default: false = any match)")] bool requireAll = false,
        [Description("Max results (default: 10)")] int maxResults = 10,
        [Description("Detail: 'ids_only', 'summary' (default), 'full'")] string detailLevel = "summary")
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

            var noteData = MapNotesByDetailLevel(matches, detailLevel);
            var detailHint = detailLevel.ToLowerInvariant() == "full" ? "" : " Use GetNote with the note ID to read full content.";

            var response = new
            {
                type = "notes",
                message = $"Found {matches.Count} note(s) with {(requireAll ? "all" : "any")} of the tags: {string.Join(", ", searchTags)}.{detailHint}",
                detailLevel = detailLevel.ToLowerInvariant(),
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
    [Description("Find notes by DATE (created/updated). Supports relative dates: 'today', 'yesterday', 'last week', 'last month'. For topic-based search use SemanticSearch. Examples: 'notes from last week', 'what did I write yesterday', 'recent notes' -> GetNotesByDateRange.")]
    public async Task<string> GetNotesByDateRangeAsync(
        [Description("Start date: ISO (2024-01-01) or relative (today, last week)")] string startDate,
        [Description("End date (default: now)")] string? endDate = null,
        [Description("Date field: 'created' or 'updated' (default: created)")] string dateField = "created",
        [Description("Max results (default: 10)")] int maxResults = 10,
        [Description("Detail: 'ids_only', 'summary' (default), 'full'")] string detailLevel = "summary")
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

            var noteData = MapNotesByDetailLevel(matches, detailLevel);
            var detailHint = detailLevel.ToLowerInvariant() == "full" ? "" : " Use GetNote with the note ID to read full content.";

            var response = new
            {
                type = "notes",
                message = $"Found {matches.Count} note(s) {(useCreatedDate ? "created" : "updated")} between {start:yyyy-MM-dd} and {end:yyyy-MM-dd}.{detailHint}",
                detailLevel = detailLevel.ToLowerInvariant(),
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
    [Description("Find notes SIMILAR to a specific note. Use to discover connections or related content. Requires note ID from previous operation. Examples: 'what else is related to this', 'find similar notes', 'show connected notes' -> FindRelatedNotes.")]
    public async Task<string> FindRelatedNotesAsync(
        [Description("Note ID to find related notes for")] string noteId,
        [Description("Max related notes (default: 5)")] int maxResults = 5)
    {
        var userError = ValidateUserContext("find related notes");
        if (userError != null) return userError;

        try
        {
            var note = await NoteRepository.GetByIdForUserAsync(noteId, CurrentUserId);

            if (note == null)
            {
                return $"Note with ID \"{noteId}\" not found or you don't have permission to access it.";
            }

            // If RAG service is available, use semantic search
            if (RagService != null)
            {
                var searchQuery = $"{note.Title} {note.Content}";
                var ragContext = await RagService.RetrieveContextAsync(
                    searchQuery,
                    CurrentUserId,
                    topK: maxResults + 1,
                    similarityThreshold: 0.3f,
                    options: UserRagOptions);

                var uniqueNoteResults = ragContext.RetrievedNotes
                    .Where(r => r.NoteId != noteId)
                    .GroupBy(r => r.NoteId)
                    .Select(g => g.OrderByDescending(r => r.SimilarityScore).First())
                    .ToList();

                var relatedNotes = new List<object>();
                foreach (var result in uniqueNoteResults)
                {
                    var relatedNote = await NoteRepository.GetByIdForUserAsync(result.NoteId, CurrentUserId);
                    if (relatedNote != null && !relatedNote.IsArchived)
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
