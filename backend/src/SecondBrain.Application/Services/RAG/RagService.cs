using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Application.Services.VectorStore;
using SecondBrain.Application.Telemetry;
using SecondBrain.Application.Utilities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.RAG;

public class RagService : IRagService
{
    private readonly IEmbeddingProviderFactory _embeddingProviderFactory;
    private readonly IVectorStore _vectorStore;
    private readonly IHybridSearchService _hybridSearchService;
    private readonly INativeHybridSearchService? _nativeHybridSearchService;
    private readonly IQueryExpansionService _queryExpansionService;
    private readonly IRerankerService _rerankerService;
    private readonly ICohereRerankerService? _cohereRerankerService;
    private readonly IRagAnalyticsService? _analyticsService;
    private readonly RagSettings _settings;
    private readonly ILogger<RagService> _logger;

    public RagService(
        IEmbeddingProviderFactory embeddingProviderFactory,
        IVectorStore vectorStore,
        IHybridSearchService hybridSearchService,
        INativeHybridSearchService? nativeHybridSearchService,
        IQueryExpansionService queryExpansionService,
        IRerankerService rerankerService,
        ICohereRerankerService? cohereRerankerService,
        IRagAnalyticsService? analyticsService,
        IOptions<RagSettings> settings,
        ILogger<RagService> logger)
    {
        _embeddingProviderFactory = embeddingProviderFactory;
        _vectorStore = vectorStore;
        _hybridSearchService = hybridSearchService;
        _nativeHybridSearchService = nativeHybridSearchService;
        _queryExpansionService = queryExpansionService;
        _rerankerService = rerankerService;
        _cohereRerankerService = cohereRerankerService;
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
        RagOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var context = new RagContext();
        var metrics = new RagQueryMetrics { Query = query, UserId = userId, ConversationId = conversationId };
        var totalStopwatch = Stopwatch.StartNew();

        // Resolve effective settings: user options override defaults from config
        var enableHybridSearch = options?.EnableHybridSearch ?? _settings.EnableHybridSearch;
        var enableHyDE = options?.EnableHyDE ?? _settings.EnableHyDE;
        var enableQueryExpansion = options?.EnableQueryExpansion ?? _settings.EnableQueryExpansion;
        var enableReranking = options?.EnableReranking ?? _settings.EnableReranking;
        var enableAnalytics = options?.EnableAnalytics ?? _settings.EnableAnalytics;

        // Start RAG pipeline activity for distributed tracing
        using var activity = ApplicationTelemetry.StartRAGActivity("RAG.RetrieveContext", userId);
        activity?.SetTag("rag.query.length", query.Length);
        activity?.SetTag("rag.conversation_id", conversationId);
        activity?.SetTag("rag.hybrid_search", enableHybridSearch);
        activity?.SetTag("rag.hyde", enableHyDE);
        activity?.SetTag("rag.query_expansion", enableQueryExpansion);
        activity?.SetTag("rag.reranking", enableReranking);

        try
        {
            // Resolve effective settings: method params > RagOptions > appsettings defaults
            var effectiveTopK = topK ?? options?.TopK ?? _settings.TopK;
            var effectiveThreshold = similarityThreshold ?? options?.SimilarityThreshold ?? _settings.SimilarityThreshold;
            var effectiveInitialRetrievalCount = options?.InitialRetrievalCount ?? _settings.InitialRetrievalCount;
            var effectiveMinRerankScore = options?.MinRerankScore ?? _settings.MinRerankScore;
            var effectiveVectorWeight = options?.VectorWeight ?? _settings.VectorWeight;
            var effectiveBm25Weight = options?.BM25Weight ?? _settings.BM25Weight;
            var effectiveMultiQueryCount = options?.MultiQueryCount ?? _settings.MultiQueryCount;
            var effectiveMaxContextLength = options?.MaxContextLength ?? _settings.MaxContextLength;

            activity?.SetTag("rag.top_k", effectiveTopK);
            activity?.SetTag("rag.threshold", effectiveThreshold);

            _logger.LogInformation(
                "Starting enhanced RAG pipeline. UserId: {UserId}, Query: {Query}, TopK: {TopK}, " +
                "HybridSearch: {Hybrid}, QueryExpansion: {QE}, HyDE: {HyDE}, Reranking: {Rerank}",
                userId, query.Substring(0, Math.Min(50, query.Length)), effectiveTopK,
                enableHybridSearch, enableQueryExpansion,
                enableHyDE, enableReranking);

            // Set vector store provider override if specified
            if (!string.IsNullOrWhiteSpace(vectorStoreProvider) && _vectorStore is CompositeVectorStore compositeStore)
            {
                compositeStore.SetProviderOverride(vectorStoreProvider);
                activity?.SetTag("rag.vector_store", vectorStoreProvider);
            }

            // Step 1: Query Expansion (HyDE + Multi-Query)
            var embeddingStopwatch = Stopwatch.StartNew();
            ExpandedQueryEmbeddings expandedEmbeddings;
            using (var embeddingActivity = ApplicationTelemetry.RAGPipelineSource.StartActivity("RAG.QueryExpansion"))
            {
                expandedEmbeddings = await GetQueryEmbeddingsAsync(query, enableQueryExpansion, enableHyDE, cancellationToken);
                embeddingActivity?.SetTag("rag.expansion.hyde_used", expandedEmbeddings.HyDEEmbedding?.Any() == true);
                embeddingActivity?.SetTag("rag.expansion.multi_query_count", expandedEmbeddings.MultiQueryEmbeddings.Count);
            }
            embeddingStopwatch.Stop();
            metrics.QueryEmbeddingTimeMs = (int)embeddingStopwatch.ElapsedMilliseconds;
            context.TotalTokensUsed = expandedEmbeddings.TotalTokensUsed;

            ApplicationTelemetry.RAGQueryExpansionDuration.Record(embeddingStopwatch.ElapsedMilliseconds);

            if (expandedEmbeddings.OriginalEmbedding.Count == 0)
            {
                _logger.LogWarning("Failed to generate query embedding");
                activity?.SetStatus(ActivityStatusCode.Error, "Failed to generate embedding");
                return context;
            }

            // Step 2: Hybrid Search (Vector + BM25 with RRF)
            var searchStopwatch = Stopwatch.StartNew();
            List<HybridSearchResult> hybridResults;
            using (var searchActivity = ApplicationTelemetry.RAGPipelineSource.StartActivity("RAG.HybridSearch"))
            {
                hybridResults = await ExecuteHybridSearchAsync(
                    query, expandedEmbeddings, userId, effectiveThreshold, enableReranking, enableHybridSearch,
                    effectiveTopK, effectiveInitialRetrievalCount, cancellationToken);
                searchActivity?.SetTag("rag.search.results", hybridResults.Count);
            }
            searchStopwatch.Stop();
            metrics.VectorSearchTimeMs = (int)searchStopwatch.ElapsedMilliseconds;
            metrics.RetrievedCount = hybridResults.Count;

            ApplicationTelemetry.RAGVectorSearchDuration.Record(searchStopwatch.ElapsedMilliseconds);

            if (!hybridResults.Any())
            {
                _logger.LogInformation("No results from hybrid search. UserId: {UserId}", userId);
                activity?.SetTag("rag.results", 0);
                await LogAnalyticsAsync(metrics, context, enableAnalytics, cancellationToken);
                return context;
            }

            // Step 3: Reranking (conditional based on user settings)
            var rerankStopwatch = Stopwatch.StartNew();
            List<RerankedResult> rerankedResults;
            using (var rerankActivity = ApplicationTelemetry.RAGPipelineSource.StartActivity("RAG.Reranking"))
            {
                if (enableReranking)
                {
                    // Determine which reranking provider to use:
                    // 1. User preference from RagOptions (if set)
                    // 2. Fall back to appsettings.json default
                    var rerankingProvider = options?.RerankingProvider ?? _settings.RerankingProvider;

                    // Use Cohere reranker if configured and available (faster and more accurate)
                    var useCohereReranker = rerankingProvider.Equals("Cohere", StringComparison.OrdinalIgnoreCase)
                                            && _cohereRerankerService?.IsAvailable == true;

                    if (useCohereReranker)
                    {
                        _logger.LogDebug("Using Cohere native rerank API");
                        rerankedResults = await _cohereRerankerService!.RerankAsync(
                            query, hybridResults, effectiveTopK, cancellationToken);
                        rerankActivity?.SetTag("rag.rerank.provider", "Cohere");
                    }
                    else
                    {
                        // Fall back to LLM-based reranking
                        rerankedResults = await _rerankerService.RerankAsync(
                            query, hybridResults, effectiveTopK, cancellationToken);
                        rerankActivity?.SetTag("rag.rerank.provider", rerankingProvider);
                    }
                    rerankActivity?.SetTag("rag.rerank.enabled", true);
                }
                else
                {
                    // Skip reranking - convert hybrid results directly to reranked format
                    rerankedResults = hybridResults
                        .OrderByDescending(r => r.RRFScore)
                        .Take(effectiveTopK)
                        .Select((r, index) => new RerankedResult
                        {
                            Id = r.Id,
                            NoteId = r.NoteId,
                            Content = r.Content,
                            NoteTitle = r.NoteTitle,
                            NoteTags = r.NoteTags,
                            NoteSummary = r.NoteSummary,
                            ChunkIndex = r.ChunkIndex,
                            VectorScore = r.VectorScore,
                            BM25Score = r.BM25Score,
                            RRFScore = r.RRFScore,
                            RelevanceScore = r.VectorScore * 10, // Scale to 0-10 for consistency
                            OriginalRank = index + 1,
                            FinalRank = index + 1,
                            FinalScore = r.VectorScore, // Use vector similarity for display, not RRF score
                            WasReranked = false
                        })
                        .ToList();
                    rerankActivity?.SetTag("rag.rerank.enabled", false);
                }
                rerankActivity?.SetTag("rag.rerank.input_count", hybridResults.Count);
                rerankActivity?.SetTag("rag.rerank.output_count", rerankedResults.Count);
            }
            rerankStopwatch.Stop();
            metrics.RerankTimeMs = (int)rerankStopwatch.ElapsedMilliseconds;

            ApplicationTelemetry.RAGRerankDuration.Record(rerankStopwatch.ElapsedMilliseconds);

            // Convert reranked results to VectorSearchResult for compatibility
            var finalResults = rerankedResults.Select(r => new VectorSearchResult
            {
                Id = r.Id,
                NoteId = r.NoteId,
                Content = r.Content,
                NoteTitle = r.NoteTitle,
                NoteTags = r.NoteTags,
                NoteSummary = r.NoteSummary,
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
            context.FormattedContext = FormatContextForPrompt(finalResults, rerankedResults, effectiveTopK, effectiveMaxContextLength);

            _logger.LogInformation(
                "RAG pipeline complete. Results: {Count}, TopScore: {TopScore:F4}, " +
                "AvgRerankScore: {AvgRerank:F2}, TotalTime: {Time}ms",
                finalResults.Count, metrics.TopCosineScore, metrics.AvgRerankScore,
                totalStopwatch.ElapsedMilliseconds);

            // Log analytics
            totalStopwatch.Stop();
            metrics.TotalTimeMs = (int)totalStopwatch.ElapsedMilliseconds;
            metrics.HybridSearchEnabled = enableHybridSearch;
            metrics.HyDEEnabled = enableHyDE;
            metrics.MultiQueryEnabled = enableQueryExpansion;
            metrics.RerankingEnabled = enableReranking;

            // Set activity tags for final results
            activity?.SetTag("rag.results", finalResults.Count);
            activity?.SetTag("rag.top_score", metrics.TopCosineScore);
            activity?.SetTag("rag.avg_rerank_score", metrics.AvgRerankScore);
            activity?.SetStatus(ActivityStatusCode.Ok);

            // Record telemetry metrics
            ApplicationTelemetry.RecordRAGQuery(
                documentsRetrieved: finalResults.Count,
                totalDurationMs: metrics.TotalTimeMs ?? 0,
                vectorSearchMs: metrics.VectorSearchTimeMs,
                bm25SearchMs: metrics.BM25SearchTimeMs,
                rerankMs: metrics.RerankTimeMs,
                avgRelevanceScore: metrics.AvgRerankScore,
                hybridEnabled: enableHybridSearch,
                hydeEnabled: enableHyDE,
                rerankEnabled: enableReranking);

            // Log analytics and capture the log ID for feedback (only if analytics enabled)
            context.RagLogId = await LogAnalyticsAsync(metrics, context, enableAnalytics, cancellationToken);

            return context;
        }
        catch (Exception ex)
        {
            activity?.RecordException(ex);
            _logger.LogError(ex, "Error in RAG pipeline. UserId: {UserId}, Query: {Query}", userId, query);
            return context;
        }
    }

    private async Task<ExpandedQueryEmbeddings> GetQueryEmbeddingsAsync(
        string query, bool enableQueryExpansion, bool enableHyDE, CancellationToken cancellationToken)
    {
        if (enableQueryExpansion || enableHyDE)
        {
            return await _queryExpansionService.GetExpandedQueryEmbeddingsAsync(query, enableQueryExpansion, enableHyDE, cancellationToken);
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
        bool enableReranking,
        bool enableHybridSearch,
        int effectiveTopK,
        int effectiveInitialRetrievalCount,
        CancellationToken cancellationToken)
    {
        var allResults = new List<HybridSearchResult>();
        var retrievalCount = enableReranking
            ? effectiveInitialRetrievalCount
            : effectiveTopK;

        // Use native hybrid search if enabled and available (PostgreSQL 18 optimized)
        var useNativeHybrid = enableHybridSearch && _settings.EnableNativeHybridSearch && _nativeHybridSearchService != null;

        if (useNativeHybrid)
        {
            _logger.LogDebug("Using native PostgreSQL 18 hybrid search (single-query RRF)");
        }

        // Search with original embedding
        var originalResults = useNativeHybrid
            ? await _nativeHybridSearchService!.SearchAsync(
                query, embeddings.OriginalEmbedding, userId, retrievalCount,
                similarityThreshold, cancellationToken)
            : await _hybridSearchService.SearchAsync(
                query, embeddings.OriginalEmbedding, userId, retrievalCount,
                similarityThreshold, cancellationToken);
        allResults.AddRange(originalResults);

        // Search with HyDE embedding if available
        if (embeddings.HyDEEmbedding != null && embeddings.HyDEEmbedding.Any())
        {
            _logger.LogDebug("Executing HyDE search with hypothetical document");
            var hydeResults = useNativeHybrid
                ? await _nativeHybridSearchService!.SearchAsync(
                    embeddings.HypotheticalDocument ?? query,
                    embeddings.HyDEEmbedding, userId, retrievalCount,
                    similarityThreshold, cancellationToken)
                : await _hybridSearchService.SearchAsync(
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

                var variationResults = useNativeHybrid
                    ? await _nativeHybridSearchService!.SearchAsync(
                        variationQuery, variationEmbedding, userId, retrievalCount / 2,
                        similarityThreshold, cancellationToken)
                    : await _hybridSearchService.SearchAsync(
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
        bool enableAnalytics,
        CancellationToken cancellationToken)
    {
        if (!enableAnalytics || _analyticsService == null)
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
        List<RerankedResult> rerankedResults,
        int effectiveTopK,
        int effectiveMaxContextLength)
    {
        var contextParts = new List<string>();

        // Group chunks by NoteId to present consolidated notes to the AI
        // This prevents the AI from seeing multiple chunks as separate "duplicate" notes
        var groupedNotes = searchResults
            .GroupBy(r => r.NoteId)
            .Select(g =>
            {
                // Get the chunk with the highest similarity score for metadata
                var bestChunk = g.OrderByDescending(r => r.SimilarityScore).First();
                // Get all chunks ordered by chunk index for content assembly
                var orderedChunks = g.OrderBy(r => r.ChunkIndex).ToList();
                // Find the best reranked result for this note
                var bestReranked = rerankedResults
                    .Where(r => r.NoteId == g.Key)
                    .OrderByDescending(r => r.RelevanceScore)
                    .FirstOrDefault();

                return new
                {
                    NoteId = g.Key,
                    BestChunk = bestChunk,
                    OrderedChunks = orderedChunks,
                    BestReranked = bestReranked,
                    BestScore = bestReranked?.RelevanceScore ?? g.Max(r => r.SimilarityScore),
                    ChunkCount = g.Count()
                };
            })
            .OrderByDescending(g => g.BestScore)
            .Take(effectiveTopK)
            .ToList();

        for (int i = 0; i < groupedNotes.Count; i++)
        {
            var noteGroup = groupedNotes[i];
            var bestChunk = noteGroup.BestChunk;
            var parsedNote = NoteContentParser.Parse(bestChunk.Content);

            // Build score info from the best reranked result or fall back to similarity score
            var scoreInfo = noteGroup.BestReranked != null && noteGroup.BestReranked.WasReranked
                ? $"Relevance: {noteGroup.BestReranked.RelevanceScore:F1}/10, Semantic: {noteGroup.BestReranked.VectorScore:F2}"
                : $"Relevance Score: {bestChunk.SimilarityScore:F2}";

            // Add chunk count indicator if multiple chunks were retrieved
            var chunkIndicator = noteGroup.ChunkCount > 1
                ? $" ({noteGroup.ChunkCount} chunks)"
                : "";

            // Combine content from all chunks in order
            var combinedContent = CombineChunkContents(noteGroup.OrderedChunks);
            if (string.IsNullOrWhiteSpace(combinedContent))
            {
                combinedContent = "(No content available - this note may only have a title)";
            }

            // Get tags - prefer parsed tags, fall back to result.NoteTags
            var tagsToShow = parsedNote.Tags?.Any() == true
                ? parsedNote.Tags
                : bestChunk.NoteTags;

            // Include AI-generated summary if available (provides semantic understanding)
            var summaryLine = !string.IsNullOrWhiteSpace(bestChunk.NoteSummary)
                ? $"Summary: {bestChunk.NoteSummary}\n"
                : "";

            var contextPart = $@"
=== NOTE {i + 1}{chunkIndicator} ({scoreInfo}) ===
Title: {parsedNote.Title ?? bestChunk.NoteTitle}
{summaryLine}{(tagsToShow?.Any() == true ? $"Tags: {string.Join(", ", tagsToShow)}\n" : "")}{(parsedNote.CreatedDate.HasValue ? $"Created: {parsedNote.CreatedDate:yyyy-MM-dd}\n" : "")}{(parsedNote.UpdatedDate.HasValue ? $"Last Updated: {parsedNote.UpdatedDate:yyyy-MM-dd}\n" : "")}
Content:
{combinedContent}
";
            contextParts.Add(contextPart);
        }

        var formattedContext = string.Join("\n", contextParts);

        // Truncate if context exceeds max length
        if (formattedContext.Length > effectiveMaxContextLength)
        {
            formattedContext = formattedContext.Substring(0, effectiveMaxContextLength) + "\n... (context truncated)";
        }

        return formattedContext;
    }

    /// <summary>
    /// Combines content from multiple chunks of the same note into a single string.
    /// Chunks are expected to be ordered by ChunkIndex.
    /// </summary>
    private string CombineChunkContents(List<VectorSearchResult> orderedChunks)
    {
        if (orderedChunks.Count == 0)
            return string.Empty;

        if (orderedChunks.Count == 1)
        {
            var parsedNote = NoteContentParser.Parse(orderedChunks[0].Content);
            var content = parsedNote.Content;
            if (string.IsNullOrWhiteSpace(content))
            {
                content = ExtractFallbackContent(orderedChunks[0].Content);
            }
            return content;
        }

        // Multiple chunks - combine them with separators
        var contentParts = new List<string>();
        foreach (var chunk in orderedChunks)
        {
            var parsedNote = NoteContentParser.Parse(chunk.Content);
            var content = parsedNote.Content;
            if (string.IsNullOrWhiteSpace(content))
            {
                content = ExtractFallbackContent(chunk.Content);
            }

            if (!string.IsNullOrWhiteSpace(content))
            {
                contentParts.Add(content);
            }
        }

        // Join with a separator that indicates chunk boundaries
        return string.Join("\n---\n", contentParts);
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
