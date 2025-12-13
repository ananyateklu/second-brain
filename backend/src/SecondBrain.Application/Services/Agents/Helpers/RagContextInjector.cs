using System.Text;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Models;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Retrieves and formats RAG context for agent queries.
/// </summary>
public class RagContextInjector : IRagContextInjector
{
    private readonly ILogger<RagContextInjector> _logger;
    private readonly QueryIntentDetector _intentDetector = new();

    public RagContextInjector(ILogger<RagContextInjector> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public bool ShouldRetrieveContext(string query)
    {
        return _intentDetector.ShouldRetrieveContext(query);
    }

    /// <inheritdoc />
    public async Task<RagContextResult> TryRetrieveContextAsync(
        string query,
        string userId,
        RagSettings ragSettings,
        IUserPreferencesService userPreferencesService,
        IRagService ragService,
        CancellationToken cancellationToken = default)
    {
        if (!_intentDetector.ShouldRetrieveContext(query))
        {
            _logger.LogDebug("Query does not require context retrieval: {Query}",
                query.Substring(0, Math.Min(50, query.Length)));
            return new RagContextResult(null, null, null);
        }

        try
        {
            _logger.LogInformation("Retrieving context for query using RAG settings (TopK: {TopK}, Threshold: {Threshold}): {Query}",
                ragSettings.TopK, ragSettings.SimilarityThreshold,
                query.Substring(0, Math.Min(50, query.Length)));

            // Get user's RAG preferences to respect their feature toggle settings
            RagOptions? ragOptions = null;
            try
            {
                var userPrefs = await userPreferencesService.GetPreferencesAsync(userId);
                ragOptions = RagOptions.FromUserPreferences(
                    enableHyde: userPrefs.RagEnableHyde,
                    enableQueryExpansion: userPrefs.RagEnableQueryExpansion,
                    enableHybridSearch: userPrefs.RagEnableHybridSearch,
                    enableReranking: userPrefs.RagEnableReranking,
                    enableAnalytics: userPrefs.RagEnableAnalytics,
                    rerankingProvider: userPrefs.RerankingProvider);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get user RAG preferences, using defaults");
            }

            // Use configuration-based parameters for consistent quality
            var ragContext = await ragService.RetrieveContextAsync(
                query,
                userId,
                topK: ragSettings.TopK,
                similarityThreshold: ragSettings.SimilarityThreshold,
                options: ragOptions,
                cancellationToken: cancellationToken);

            if (!ragContext.RetrievedNotes.Any())
            {
                _logger.LogDebug("No relevant notes found for context injection");
                return new RagContextResult(null, null, null);
            }

            // Deduplicate by NoteId, keeping highest score
            var uniqueNotes = ragContext.RetrievedNotes
                .GroupBy(r => r.NoteId)
                .Select(g => g.OrderByDescending(r => r.SimilarityScore).First())
                .ToList();

            // Build context message using rich formatting
            var retrievedNotes = new List<RetrievedNoteContext>();
            var contextBuilder = new StringBuilder();
            contextBuilder.AppendLine("---RELEVANT NOTES CONTEXT (use for answering)---");
            contextBuilder.AppendLine();

            var noteIndex = 1;
            foreach (var note in uniqueNotes)
            {
                // Extract metadata from chunk content
                var parsedNote = Utilities.NoteContentParser.Parse(note.Content);

                // Get tags from parsed content or note metadata
                var tags = parsedNote.Tags?.Any() == true ? parsedNote.Tags : note.NoteTags;
                var tagsStr = tags?.Any() == true ? $"Tags: {string.Join(", ", tags)}" : "";

                // Build score information
                var scoreInfo = $"Relevance: {note.SimilarityScore:F2}";
                if (note.Metadata != null)
                {
                    if (note.Metadata.TryGetValue("rerankScore", out var rerankScore) && rerankScore is float rs)
                        scoreInfo = $"Relevance: {rs:F1}/10, Semantic: {note.SimilarityScore:F2}";
                    else if (note.Metadata.TryGetValue("vectorScore", out var vectorScore) && vectorScore is float vs)
                        scoreInfo = $"Semantic: {vs:F2}";
                }

                // Use the actual chunk content that was matched
                var contentToShow = parsedNote.Content;
                if (string.IsNullOrWhiteSpace(contentToShow))
                {
                    contentToShow = ExtractContentFromChunk(note.Content);
                }

                contextBuilder.AppendLine($"=== NOTE {noteIndex} ({scoreInfo}) ===");
                contextBuilder.AppendLine($"Title: {parsedNote.Title ?? note.NoteTitle}");
                contextBuilder.AppendLine($"Note ID: {note.NoteId}");
                if (!string.IsNullOrEmpty(tagsStr))
                    contextBuilder.AppendLine(tagsStr);
                if (parsedNote.CreatedDate.HasValue)
                    contextBuilder.AppendLine($"Created: {parsedNote.CreatedDate:yyyy-MM-dd}");
                if (parsedNote.UpdatedDate.HasValue)
                    contextBuilder.AppendLine($"Last Updated: {parsedNote.UpdatedDate:yyyy-MM-dd}");
                contextBuilder.AppendLine();
                contextBuilder.AppendLine("Content:");
                contextBuilder.AppendLine(contentToShow);
                contextBuilder.AppendLine();

                // Build preview for UI display (limited length)
                var previewForUI = contentToShow.Length > 300
                    ? contentToShow.Substring(0, 300) + "..."
                    : contentToShow;

                retrievedNotes.Add(new RetrievedNoteContext
                {
                    NoteId = note.NoteId,
                    Title = parsedNote.Title ?? note.NoteTitle,
                    Preview = previewForUI,
                    Tags = tags?.ToList() ?? new List<string>(),
                    SimilarityScore = note.SimilarityScore,
                    ChunkContent = contentToShow
                });

                noteIndex++;
            }

            contextBuilder.AppendLine("---END CONTEXT---");
            contextBuilder.AppendLine();
            contextBuilder.AppendLine("INSTRUCTIONS:");
            contextBuilder.AppendLine("- Answer using the information from the retrieved notes above.");
            contextBuilder.AppendLine("- Cite notes by title when using their information: [Note Title]");
            contextBuilder.AppendLine("- If you need more details from a note, use GetNote tool with the Note ID.");
            contextBuilder.AppendLine("- If the context doesn't contain the answer, say so clearly.");

            _logger.LogInformation("Injected rich context from {Count} notes with RagLogId: {RagLogId}",
                retrievedNotes.Count, ragContext.RagLogId);

            return new RagContextResult(contextBuilder.ToString(), retrievedNotes, ragContext.RagLogId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve context for query, proceeding without context");
            return new RagContextResult(null, null, null);
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

            if (!string.IsNullOrWhiteSpace(trimmedLine))
            {
                contentLines.Add(trimmedLine);
            }
        }

        return string.Join("\n", contentLines).Trim();
    }
}
