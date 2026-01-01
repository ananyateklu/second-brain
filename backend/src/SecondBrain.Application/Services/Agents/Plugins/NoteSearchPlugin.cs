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
/// Plugin handling search operations for notes with unified SearchNotes function.
/// Supports modes: semantic (default), exact, tags, date, related.
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
    public override string Description => "Search and find notes using semantic search, keywords, tags, and date ranges";

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
- **Proactively use SearchNotes** when the user asks questions about their notes
- **Default to mode='semantic'** - it's the most effective way to find notes by meaning
- Use mode='exact' only if you need literal phrase matching
- Use mode='tags' when looking for notes by category
- Use mode='date' for time-based queries
- Use mode='related' to find similar notes (requires a note ID)
";

        return contextInstructions + @"
### SearchNotes - Unified Search Tool

**SearchNotes** is the single tool for all note search operations. Use the `mode` parameter to select search type:

| Mode | When to Use | Key Parameters |
|------|-------------|----------------|
| `semantic` (DEFAULT) | Finding notes by meaning/topic | query |
| `exact` | Literal phrase matching | query |
| `tags` | Browse by category/tag | query (comma-separated tags), requireAllTags |
| `date` | Time-based queries | startDate, endDate |
| `related` | Find similar notes | relatedToNoteId |

**Examples:**
- ""find notes about cooking"" -> SearchNotes(query=""cooking"", mode=""semantic"")
- ""exact phrase 'error 404'"" -> SearchNotes(query=""error 404"", mode=""exact"")
- ""notes tagged project"" -> SearchNotes(query=""project"", mode=""tags"")
- ""notes from last week"" -> SearchNotes(query="""", mode=""date"", startDate=""last week"")
- ""notes similar to X"" -> SearchNotes(query="""", mode=""related"", relatedToNoteId=""<id>"")

**Tips:**
- Semantic search handles synonyms and related concepts (""pasta"" finds ""spaghetti"")
- Date mode supports relative dates: 'today', 'yesterday', 'last week', 'last month'
- All modes return previews - use GetNote for full content";
    }

    [KernelFunction("SearchNotes")]
    [Description("Find notes. mode='semantic' (default) finds by meaning, 'exact' for literal text, 'tags' for categories, 'date' for time range, 'related' for similar notes. Examples: 'find notes about cooking' -> semantic, 'notes tagged project' -> tags, 'notes from last week' -> date.")]
    public async Task<string> SearchNotesAsync(
        [Description("Search query or comma-separated tags")] string query,
        [Description("Search mode: 'semantic'|'exact'|'tags'|'date'|'related'")] string mode = "semantic",
        [Description("Max results (default: 5)")] int maxResults = 5,
        [Description("Start date for 'date' mode (ISO or relative: today, yesterday, last week, last month)")] string? startDate = null,
        [Description("End date for 'date' mode (default: now)")] string? endDate = null,
        [Description("Note ID for 'related' mode")] string? relatedToNoteId = null,
        [Description("For 'tags' mode: require ALL tags? (default: false = any match)")] bool requireAllTags = false,
        [Description("Detail level: 'ids_only'|'summary'|'full' (default: summary)")] string detailLevel = "summary")
    {
        var userError = ValidateUserContext("search notes");
        if (userError != null) return userError;

        var normalizedMode = mode.ToLowerInvariant();

        // SEMANTIC MODE - finds notes by meaning using RAG service
        if (normalizedMode == "semantic")
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return "Error: Please provide a search query for semantic search.";
            }

            if (RagService == null)
            {
                return "Semantic search is not available. Please use mode='exact' for keyword-based search instead.";
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
                    return $"No notes found semantically related to \"{query}\". Try mode='exact' for keyword-based search.";
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

                var semanticResponse = new
                {
                    type = "notes",
                    searchMode = "semantic",
                    message = $"Found {noteData.Count} note(s) semantically related to \"{query}\". The 'matchedContent' field contains the relevant portion that matched your query.",
                    notes = noteData
                };

                return JsonSerializer.Serialize(semanticResponse);
            }
            catch (Exception ex)
            {
                return CreateErrorResponse("performing semantic search", ex.Message);
            }
        }

        // EXACT MODE - finds notes by literal text matching
        if (normalizedMode == "exact")
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return "Error: Please provide a search query for exact text search.";
            }

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
                    return $"No notes found with exact match for \"{query}\". Try mode='semantic' instead - it finds notes by meaning and handles synonyms/related terms better.";
                }

                var noteData = MapNotesByDetailLevel(matches, detailLevel);
                var detailHint = detailLevel.ToLowerInvariant() == "full" ? "" : " Use GetNote with the note ID to read full content.";

                var exactResponse = new
                {
                    type = "notes",
                    searchMode = "exact",
                    message = $"Found {matches.Count} note(s) matching \"{query}\".{detailHint}",
                    detailLevel = detailLevel.ToLowerInvariant(),
                    notes = noteData
                };

                return JsonSerializer.Serialize(exactResponse);
            }
            catch (Exception ex)
            {
                return CreateErrorResponse("searching notes", ex.Message);
            }
        }

        // TAGS MODE - finds notes by their tags
        if (normalizedMode == "tags")
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return "Error: Please specify at least one tag to search for.";
            }

            try
            {
                var searchTags = query.Split(',', StringSplitOptions.RemoveEmptyEntries)
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
                        return requireAllTags
                            ? searchTags.All(st => noteTags.Contains(st))
                            : searchTags.Any(st => noteTags.Contains(st));
                    })
                    .OrderByDescending(n => n.UpdatedAt)
                    .Take(maxResults)
                    .ToList();

                if (!matches.Any())
                {
                    var tagList = string.Join(", ", searchTags);
                    return requireAllTags
                        ? $"No notes found with all of these tags: {tagList}."
                        : $"No notes found with any of these tags: {tagList}.";
                }

                var noteData = MapNotesByDetailLevel(matches, detailLevel);
                var detailHint = detailLevel.ToLowerInvariant() == "full" ? "" : " Use GetNote with the note ID to read full content.";

                var tagsResponse = new
                {
                    type = "notes",
                    searchMode = "tags",
                    message = $"Found {matches.Count} note(s) with {(requireAllTags ? "all" : "any")} of the tags: {string.Join(", ", searchTags)}.{detailHint}",
                    detailLevel = detailLevel.ToLowerInvariant(),
                    notes = noteData
                };

                return JsonSerializer.Serialize(tagsResponse);
            }
            catch (Exception ex)
            {
                return CreateErrorResponse("searching notes by tags", ex.Message);
            }
        }

        // DATE MODE - finds notes by creation or update date
        if (normalizedMode == "date")
        {
            var effectiveStartDate = startDate ?? "last month";
            if (string.IsNullOrWhiteSpace(effectiveStartDate))
            {
                return "Error: Please specify a start date for date range search (e.g., 'last week', '2024-01-01').";
            }

            try
            {
                var now = DateTime.UtcNow;
                DateTime start = ParseRelativeDate(effectiveStartDate, now);
                DateTime end = string.IsNullOrWhiteSpace(endDate) ? now : ParseRelativeDate(endDate, now);

                // Ensure start is before end
                if (start > end)
                {
                    (start, end) = (end, start);
                }

                var notes = await NoteRepository.GetByUserIdAsync(CurrentUserId);

                var matches = notes
                    .Where(n => !n.IsArchived)
                    .Where(n =>
                    {
                        // Check both created and updated dates for flexibility
                        return n.CreatedAt >= start && n.CreatedAt <= end ||
                               n.UpdatedAt >= start && n.UpdatedAt <= end;
                    })
                    .OrderByDescending(n => n.UpdatedAt)
                    .Take(maxResults)
                    .ToList();

                if (!matches.Any())
                {
                    return $"No notes found between {start:yyyy-MM-dd} and {end:yyyy-MM-dd}.";
                }

                var noteData = MapNotesByDetailLevel(matches, detailLevel);
                var detailHint = detailLevel.ToLowerInvariant() == "full" ? "" : " Use GetNote with the note ID to read full content.";

                var dateResponse = new
                {
                    type = "notes",
                    searchMode = "date",
                    message = $"Found {matches.Count} note(s) between {start:yyyy-MM-dd} and {end:yyyy-MM-dd}.{detailHint}",
                    detailLevel = detailLevel.ToLowerInvariant(),
                    dateRange = new { start = start.ToString("yyyy-MM-dd"), end = end.ToString("yyyy-MM-dd") },
                    notes = noteData
                };

                return JsonSerializer.Serialize(dateResponse);
            }
            catch (Exception ex)
            {
                return CreateErrorResponse("searching notes by date", ex.Message);
            }
        }

        // RELATED MODE - finds notes similar to a given note
        if (normalizedMode == "related")
        {
            var noteId = relatedToNoteId ?? "";
            if (string.IsNullOrWhiteSpace(noteId))
            {
                return "Error: Please provide a note ID to find related notes (relatedToNoteId parameter).";
            }

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

                    var relatedResponse = new
                    {
                        type = "notes",
                        searchMode = "related",
                        message = $"Found {relatedNotes.Count} note(s) related to \"{note.Title}\". Use GetNote with the note ID to read full content.",
                        sourceNote = new { id = note.Id, title = note.Title },
                        notes = relatedNotes
                    };

                    return JsonSerializer.Serialize(relatedResponse);
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
                    searchMode = "related",
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

        // Invalid mode
        return $"Invalid search mode '{mode}'. Valid modes: 'semantic', 'exact', 'tags', 'date', 'related'.";
    }
}
