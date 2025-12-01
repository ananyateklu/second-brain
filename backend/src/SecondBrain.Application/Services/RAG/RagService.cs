using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Application.Services.VectorStore;
using SecondBrain.Application.Utilities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.RAG;

public class RagService : IRagService
{
    private readonly IEmbeddingProviderFactory _embeddingProviderFactory;
    private readonly IVectorStore _vectorStore;
    private readonly IHybridSearchService _hybridSearchService;
    private readonly IQueryExpansionService _queryExpansionService;
    private readonly IRerankerService _rerankerService;
    private readonly IRagAnalyticsService? _analyticsService;
    private readonly RagSettings _settings;
    private readonly ILogger<RagService> _logger;

    public RagService(
        IEmbeddingProviderFactory embeddingProviderFactory,
        IVectorStore vectorStore,
        IHybridSearchService hybridSearchService,
        IQueryExpansionService queryExpansionService,
        IRerankerService rerankerService,
        IRagAnalyticsService? analyticsService,
        IOptions<RagSettings> settings,
        ILogger<RagService> logger)
    {
        _embeddingProviderFactory = embeddingProviderFactory;
        _vectorStore = vectorStore;
        _hybridSearchService = hybridSearchService;
        _queryExpansionService = queryExpansionService;
        _rerankerService = rerankerService;
        _analyticsService = analyticsService;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<RagContext> RetrieveContextAsync(
        string query,
        string userId,
        int? topK = null,
        float? similarityThreshold = null,
        string? vectorStoreProvider = null,
        string? conversationId = null,
        CancellationToken cancellationToken = default)
    {
        var context = new RagContext();
        var metrics = new RagQueryMetrics { Query = query, UserId = userId, ConversationId = conversationId };
        var totalStopwatch = Stopwatch.StartNew();

        try
        {
            var effectiveTopK = topK ?? _settings.TopK;
            var effectiveThreshold = similarityThreshold ?? _settings.SimilarityThreshold;

            _logger.LogInformation(
                "Starting enhanced RAG pipeline. UserId: {UserId}, Query: {Query}, TopK: {TopK}, " +
                "HybridSearch: {Hybrid}, QueryExpansion: {QE}, HyDE: {HyDE}, Reranking: {Rerank}",
                userId, query.Substring(0, Math.Min(50, query.Length)), effectiveTopK,
                _settings.EnableHybridSearch, _settings.EnableQueryExpansion,
                _settings.EnableHyDE, _settings.EnableReranking);

            // Set vector store provider override if specified
            if (!string.IsNullOrWhiteSpace(vectorStoreProvider) && _vectorStore is CompositeVectorStore compositeStore)
            {
                compositeStore.SetProviderOverride(vectorStoreProvider);
            }

            // Step 1: Query Expansion (HyDE + Multi-Query)
            var embeddingStopwatch = Stopwatch.StartNew();
            var expandedEmbeddings = await GetQueryEmbeddingsAsync(query, cancellationToken);
            embeddingStopwatch.Stop();
            metrics.QueryEmbeddingTimeMs = (int)embeddingStopwatch.ElapsedMilliseconds;
            context.TotalTokensUsed = expandedEmbeddings.TotalTokensUsed;

            if (expandedEmbeddings.OriginalEmbedding.Count == 0)
            {
                _logger.LogWarning("Failed to generate query embedding");
                return context;
            }

            // Step 2: Hybrid Search (Vector + BM25 with RRF)
            var searchStopwatch = Stopwatch.StartNew();
            var hybridResults = await ExecuteHybridSearchAsync(
                query, expandedEmbeddings, userId, effectiveThreshold, cancellationToken);
            searchStopwatch.Stop();
            metrics.VectorSearchTimeMs = (int)searchStopwatch.ElapsedMilliseconds;
            metrics.RetrievedCount = hybridResults.Count;

            if (!hybridResults.Any())
            {
                _logger.LogInformation("No results from hybrid search. UserId: {UserId}", userId);
                await LogAnalyticsAsync(metrics, context, cancellationToken);
                return context;
            }

            // Step 3: Reranking
            var rerankStopwatch = Stopwatch.StartNew();
            var rerankedResults = await _rerankerService.RerankAsync(
                query, hybridResults, effectiveTopK, cancellationToken);
            rerankStopwatch.Stop();
            metrics.RerankTimeMs = (int)rerankStopwatch.ElapsedMilliseconds;

            // Convert reranked results to VectorSearchResult for compatibility
            var finalResults = rerankedResults.Select(r => new VectorSearchResult
            {
                Id = r.Id,
                NoteId = r.NoteId,
                Content = r.Content,
                NoteTitle = r.NoteTitle,
                NoteTags = r.NoteTags,
                ChunkIndex = r.ChunkIndex,
                SimilarityScore = r.FinalScore,
                Metadata = new Dictionary<string, object>
                {
                    { "vectorScore", r.VectorScore },
                    { "bm25Score", r.BM25Score },
                    { "rrfScore", r.RRFScore },
                    { "rerankScore", r.RelevanceScore },
                    { "originalRank", r.OriginalRank },
                    { "finalRank", r.FinalRank },
                    { "wasReranked", r.WasReranked }
                }
            }).ToList();

            context.RetrievedNotes = finalResults;
            metrics.FinalCount = finalResults.Count;

            // Calculate score metrics
            if (finalResults.Any())
            {
                metrics.TopCosineScore = rerankedResults.Max(r => r.VectorScore);
                metrics.AvgCosineScore = rerankedResults.Average(r => r.VectorScore);
                metrics.TopRerankScore = rerankedResults.Max(r => r.RelevanceScore);
                metrics.AvgRerankScore = rerankedResults.Average(r => r.RelevanceScore);
                metrics.AvgBM25Score = rerankedResults.Average(r => r.BM25Score);
            }

            // Format context for AI prompt
            context.FormattedContext = FormatContextForPrompt(finalResults, rerankedResults);

            _logger.LogInformation(
                "RAG pipeline complete. Results: {Count}, TopScore: {TopScore:F4}, " +
                "AvgRerankScore: {AvgRerank:F2}, TotalTime: {Time}ms",
                finalResults.Count, metrics.TopCosineScore, metrics.AvgRerankScore,
                totalStopwatch.ElapsedMilliseconds);

            // Log analytics
            totalStopwatch.Stop();
            metrics.TotalTimeMs = (int)totalStopwatch.ElapsedMilliseconds;
            metrics.HybridSearchEnabled = _settings.EnableHybridSearch;
            metrics.HyDEEnabled = _settings.EnableHyDE;
            metrics.MultiQueryEnabled = _settings.EnableQueryExpansion;
            metrics.RerankingEnabled = _settings.EnableReranking;

            // Log analytics and capture the log ID for feedback
            context.RagLogId = await LogAnalyticsAsync(metrics, context, cancellationToken);

            return context;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in RAG pipeline. UserId: {UserId}, Query: {Query}", userId, query);
            return context;
        }
    }

    private async Task<ExpandedQueryEmbeddings> GetQueryEmbeddingsAsync(
        string query, CancellationToken cancellationToken)
    {
        if (_settings.EnableQueryExpansion || _settings.EnableHyDE)
        {
            return await _queryExpansionService.GetExpandedQueryEmbeddingsAsync(query, cancellationToken);
        }

        // Fall back to simple embedding generation
        var embeddingProvider = _embeddingProviderFactory.GetDefaultProvider();
        var embeddingResponse = await embeddingProvider.GenerateEmbeddingAsync(query, cancellationToken);

        return new ExpandedQueryEmbeddings
        {
            OriginalQuery = query,
            OriginalEmbedding = embeddingResponse.Success ? embeddingResponse.Embedding : new List<double>(),
            TotalTokensUsed = embeddingResponse.TokensUsed
        };
    }

    private async Task<List<HybridSearchResult>> ExecuteHybridSearchAsync(
        string query,
        ExpandedQueryEmbeddings embeddings,
        string userId,
        float similarityThreshold,
        CancellationToken cancellationToken)
    {
        var allResults = new List<HybridSearchResult>();
        var retrievalCount = _settings.EnableReranking
            ? _settings.InitialRetrievalCount
            : _settings.TopK;

        // Search with original embedding
        var originalResults = await _hybridSearchService.SearchAsync(
            query, embeddings.OriginalEmbedding, userId, retrievalCount,
            similarityThreshold, cancellationToken);
        allResults.AddRange(originalResults);

        // Search with HyDE embedding if available
        if (embeddings.HyDEEmbedding != null && embeddings.HyDEEmbedding.Any())
        {
            _logger.LogDebug("Executing HyDE search with hypothetical document");
            var hydeResults = await _hybridSearchService.SearchAsync(
                embeddings.HypotheticalDocument ?? query,
                embeddings.HyDEEmbedding, userId, retrievalCount,
                similarityThreshold, cancellationToken);

            // Merge results, boosting HyDE findings slightly
            foreach (var result in hydeResults)
            {
                var existing = allResults.FirstOrDefault(r => r.Id == result.Id);
                if (existing != null)
                {
                    // Boost score for results found by both methods
                    existing.RRFScore = Math.Max(existing.RRFScore, result.RRFScore * 1.1f);
                }
                else
                {
                    result.Metadata["foundByHyDE"] = true;
                    allResults.Add(result);
                }
            }
        }

        // Search with multi-query embeddings if available
        if (embeddings.MultiQueryEmbeddings.Any())
        {
            for (int i = 0; i < embeddings.MultiQueryEmbeddings.Count; i++)
            {
                var variationEmbedding = embeddings.MultiQueryEmbeddings[i];
                var variationQuery = i < embeddings.QueryVariations.Count - 1
                    ? embeddings.QueryVariations[i + 1] // Skip original
                    : query;

                _logger.LogDebug("Executing multi-query search #{Index}: {Query}",
                    i + 1, variationQuery.Substring(0, Math.Min(30, variationQuery.Length)));

                var variationResults = await _hybridSearchService.SearchAsync(
                    variationQuery, variationEmbedding, userId, retrievalCount / 2,
                    similarityThreshold, cancellationToken);

                foreach (var result in variationResults)
                {
                    var existing = allResults.FirstOrDefault(r => r.Id == result.Id);
                    if (existing != null)
                    {
                        // Boost score for results found by multiple queries
                        existing.RRFScore = Math.Max(existing.RRFScore, result.RRFScore);
                    }
                    else
                    {
                        result.Metadata["foundByMultiQuery"] = i + 1;
                        allResults.Add(result);
                    }
                }
            }
        }

        // Deduplicate and sort by RRF score
        var uniqueResults = allResults
            .GroupBy(r => r.Id)
            .Select(g => g.OrderByDescending(r => r.RRFScore).First())
            .OrderByDescending(r => r.RRFScore)
            .Take(retrievalCount)
            .ToList();

        _logger.LogDebug(
            "Hybrid search complete. TotalCandidates: {Total}, UniqueResults: {Unique}",
            allResults.Count, uniqueResults.Count);

        return uniqueResults;
    }

    private async Task<Guid?> LogAnalyticsAsync(
        RagQueryMetrics metrics,
        RagContext context,
        CancellationToken cancellationToken)
    {
        if (!_settings.EnableAnalytics || _analyticsService == null)
            return null;

        try
        {
            return await _analyticsService.LogQueryAsync(metrics, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to log RAG analytics");
            return null;
        }
    }

    public string EnhancePromptWithContext(string originalPrompt, RagContext context)
    {
        // If no context was retrieved, inform the AI appropriately
        if (string.IsNullOrWhiteSpace(context.FormattedContext))
        {
            return $@"You are a helpful AI assistant with access to the user's personal knowledge base (Second Brain). 

SYSTEM UPDATE: An enhanced semantic search was performed on the user's notes for the query ""{originalPrompt}"", but NO relevant notes were found.

Search methods used:
- Hybrid search (semantic + keyword matching)
- Query expansion with variations
- Relevance reranking

INSTRUCTIONS:
1. Answer the user's query based on your general knowledge.
2. Inform the user that you searched their Second Brain but didn't find any specific notes related to this query.
3. DO NOT say you cannot access their notes. You DO have access, but the search yielded no results for this specific topic.
4. If the user's query was a greeting or general conversation, simply converse naturally.

USER QUERY: {originalPrompt}

ANSWER:";
        }

        // Create an enhanced prompt with context
        var enhancedPrompt = $@"You are a helpful AI assistant with access to the user's personal knowledge base. The following notes have been retrieved using an enhanced search pipeline:
- Hybrid search combining semantic similarity and keyword matching
- Query expansion for better coverage
- AI-powered relevance reranking

Each note contains:
- Title: The note's title
- Tags: Categorization tags
- Relevance Score: How relevant this note is to the query (0-1 scale)
- Created/Updated dates: When the note was created and last modified
- Content: The actual note content

RETRIEVED NOTES FROM KNOWLEDGE BASE:
{context.FormattedContext}

---

INSTRUCTIONS:
1. Answer the user's query using ONLY the information from the retrieved notes above.
2. **Citation Rule**: When using information from a note, you must cite it using the format [Note Title]. Example: ""According to [Project Alpha Plan], the deadline is...""
3. **Dates**: If asked about dates/timing, prioritize the Created/Updated dates explicitly mentioned in the note metadata.
4. **Uncertainty**: If the retrieved notes do not contain the answer, explicitly state: ""I cannot find this information in your notes."" Do not guess or hallucinate.
5. **Direct Quotes**: Use direct quotes where possible to increase accuracy, formatted as ""quote"".
6. **Relevance Awareness**: Notes with higher relevance scores are more likely to contain the answer.
7. **Context Awareness**: If the user greets you or asks a general question not requiring notes, answer naturally but mention you can search their notes.

USER QUERY: {originalPrompt}

ANSWER:";

        return enhancedPrompt;
    }

    private string FormatContextForPrompt(
        List<VectorSearchResult> searchResults,
        List<RerankedResult> rerankedResults)
    {
        var contextParts = new List<string>();

        for (int i = 0; i < searchResults.Count && i < _settings.TopK; i++)
        {
            var result = searchResults[i];
            var reranked = rerankedResults.FirstOrDefault(r => r.Id == result.Id);
            var parsedNote = NoteContentParser.Parse(result.Content);

            var scoreInfo = reranked != null && reranked.WasReranked
                ? $"Relevance: {reranked.RelevanceScore:F1}/10, Semantic: {reranked.VectorScore:F2}"
                : $"Relevance Score: {result.SimilarityScore:F2}";

            // Determine content to show - use parsed content, or fall back to raw content if empty
            var contentToShow = parsedNote.Content;
            if (string.IsNullOrWhiteSpace(contentToShow))
            {
                // The note might not have a "Content:" section (e.g., notes with only titles)
                // Fall back to showing the raw stored content, which includes metadata
                // Strip the metadata prefixes we already show separately
                contentToShow = ExtractFallbackContent(result.Content);
                if (string.IsNullOrWhiteSpace(contentToShow))
                {
                    contentToShow = "(No content available - this note may only have a title)";
                }
            }

            // Get tags - prefer parsed tags, fall back to result.NoteTags
            var tagsToShow = parsedNote.Tags?.Any() == true
                ? parsedNote.Tags
                : result.NoteTags;

            var contextPart = $@"
=== NOTE {i + 1} ({scoreInfo}) ===
Title: {parsedNote.Title ?? result.NoteTitle}
{(tagsToShow?.Any() == true ? $"Tags: {string.Join(", ", tagsToShow)}\n" : "")}{(parsedNote.CreatedDate.HasValue ? $"Created: {parsedNote.CreatedDate:yyyy-MM-dd}\n" : "")}{(parsedNote.UpdatedDate.HasValue ? $"Last Updated: {parsedNote.UpdatedDate:yyyy-MM-dd}\n" : "")}
Content:
{contentToShow}
";
            contextParts.Add(contextPart);
        }

        var formattedContext = string.Join("\n", contextParts);

        // Truncate if context exceeds max length
        if (formattedContext.Length > _settings.MaxContextLength)
        {
            formattedContext = formattedContext.Substring(0, _settings.MaxContextLength) + "\n... (context truncated)";
        }

        return formattedContext;
    }

    /// <summary>
    /// Extracts any meaningful content from the raw stored content when the "Content:" section is missing.
    /// This handles cases where notes were indexed with only metadata (title, tags, dates).
    /// </summary>
    private static string ExtractFallbackContent(string? rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
            return string.Empty;

        var lines = rawContent.Split('\n');
        var contentLines = new List<string>();

        foreach (var line in lines)
        {
            var trimmedLine = line.Trim();

            // Skip metadata lines we already display
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
}

/// <summary>
/// Metrics collected during RAG query execution for analytics
/// </summary>
public class RagQueryMetrics
{
    public string Query { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string? ConversationId { get; set; }

    public int? QueryEmbeddingTimeMs { get; set; }
    public int? VectorSearchTimeMs { get; set; }
    public int? BM25SearchTimeMs { get; set; }
    public int? RerankTimeMs { get; set; }
    public int? TotalTimeMs { get; set; }

    public int? RetrievedCount { get; set; }
    public int? FinalCount { get; set; }

    public float? AvgCosineScore { get; set; }
    public float? AvgBM25Score { get; set; }
    public float? AvgRerankScore { get; set; }
    public float? TopCosineScore { get; set; }
    public float? TopRerankScore { get; set; }

    public bool HybridSearchEnabled { get; set; }
    public bool HyDEEnabled { get; set; }
    public bool MultiQueryEnabled { get; set; }
    public bool RerankingEnabled { get; set; }
}
