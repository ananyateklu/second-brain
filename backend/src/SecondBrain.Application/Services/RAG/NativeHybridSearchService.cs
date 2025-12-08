using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.RAG;

/// <summary>
/// Native PostgreSQL hybrid search service that combines vector search and BM25 full-text search
/// using Reciprocal Rank Fusion (RRF) in a single database query.
/// 
/// This is optimized for PostgreSQL 18 and provides:
/// - Single round-trip to database (vs 2 queries in standard HybridSearchService)
/// - RRF calculation in SQL for efficiency
/// - Leverages PostgreSQL 18 Async I/O for parallel CTE execution
/// - Uses HNSW index for vector search and GIN index for full-text search
/// </summary>
public interface INativeHybridSearchService
{
    /// <summary>
    /// Performs native hybrid search combining vector similarity and BM25 full-text search
    /// using RRF in a single database query.
    /// </summary>
    Task<List<HybridSearchResult>> SearchAsync(
        string query,
        List<double> queryEmbedding,
        string userId,
        int topK,
        float similarityThreshold = 0.3f,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if native hybrid search is available (PostgreSQL 18 with required indexes)
    /// </summary>
    Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Native PostgreSQL implementation of hybrid search using single-query RRF.
/// </summary>
public class NativeHybridSearchService : INativeHybridSearchService
{
    private readonly INoteEmbeddingSearchRepository _repository;
    private readonly RagSettings _settings;
    private readonly ILogger<NativeHybridSearchService> _logger;

    public NativeHybridSearchService(
        INoteEmbeddingSearchRepository repository,
        IOptions<RagSettings> settings,
        ILogger<NativeHybridSearchService> logger)
    {
        _repository = repository;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<List<HybridSearchResult>> SearchAsync(
        string query,
        List<double> queryEmbedding,
        string userId,
        int topK,
        float similarityThreshold = 0.3f,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            _logger.LogWarning("Native hybrid search called with empty query");
            return new List<HybridSearchResult>();
        }

        if (queryEmbedding == null || queryEmbedding.Count == 0)
        {
            _logger.LogWarning("Native hybrid search called with empty embedding");
            return new List<HybridSearchResult>();
        }

        _logger.LogInformation(
            "Starting native hybrid search. UserId: {UserId}, Query: {Query}, TopK: {TopK}, HybridEnabled: {HybridEnabled}",
            userId, query.Substring(0, Math.Min(50, query.Length)), topK, _settings.EnableHybridSearch);

        // If hybrid search is disabled, delegate to vector-only via repository
        if (!_settings.EnableHybridSearch)
        {
            _logger.LogDebug("Hybrid search disabled, using vector-only search");
            var vectorOnlyResults = await _repository.SearchWithNativeHybridAsync(
                query: "", // Empty query to skip BM25
                queryEmbedding: queryEmbedding,
                userId: userId,
                topK: topK,
                initialRetrievalCount: topK,
                vectorWeight: 1.0f,
                bm25Weight: 0.0f,
                rrfConstant: _settings.RRFConstant,
                cancellationToken: cancellationToken);

            return MapToHybridSearchResults(vectorOnlyResults);
        }

        // Calculate initial retrieval count (3x topK or configured value)
        var retrievalMultiplier = 3;
        var initialRetrievalCount = Math.Max(topK * retrievalMultiplier, _settings.InitialRetrievalCount);

        // Execute native hybrid search with single query
        var nativeResults = await _repository.SearchWithNativeHybridAsync(
            query: query,
            queryEmbedding: queryEmbedding,
            userId: userId,
            topK: topK,
            initialRetrievalCount: initialRetrievalCount,
            vectorWeight: _settings.VectorWeight,
            bm25Weight: _settings.BM25Weight,
            rrfConstant: _settings.RRFConstant,
            cancellationToken: cancellationToken);

        var results = MapToHybridSearchResults(nativeResults);

        _logger.LogInformation(
            "Native hybrid search completed. FinalResults: {Count}, TopRRFScore: {TopScore:F4}",
            results.Count, results.FirstOrDefault()?.RRFScore ?? 0);

        return results;
    }

    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Simple check - if we can query the repository, native hybrid search is available
            // A more robust check could verify PostgreSQL version and index existence
            var testResults = await _repository.SearchWithNativeHybridAsync(
                query: "test",
                queryEmbedding: Enumerable.Repeat(0.0, 1536).ToList(), // Zero vector
                userId: "test-availability-check",
                topK: 1,
                initialRetrievalCount: 1,
                cancellationToken: cancellationToken);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Native hybrid search availability check failed");
            return false;
        }
    }

    /// <summary>
    /// Maps native repository results to HybridSearchResult for compatibility with existing code
    /// </summary>
    private static List<HybridSearchResult> MapToHybridSearchResults(List<NativeHybridSearchResult> nativeResults)
    {
        return nativeResults.Select(r => new HybridSearchResult
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
            VectorRank = r.VectorRank,
            BM25Rank = r.BM25Rank,
            RRFScore = r.RRFScore,
            FoundInVectorSearch = r.FoundInVectorSearch,
            FoundInBM25Search = r.FoundInBM25Search,
            Metadata = new Dictionary<string, object>
            {
                ["searchType"] = "native_hybrid",
                ["vectorRank"] = r.VectorRank,
                ["bm25Rank"] = r.BM25Rank
            }
        }).ToList();
    }
}
