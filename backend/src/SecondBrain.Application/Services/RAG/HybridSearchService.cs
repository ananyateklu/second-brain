using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.RAG;

/// <summary>
/// Service that combines vector search and BM25 search using Reciprocal Rank Fusion (RRF)
/// </summary>
public interface IHybridSearchService
{
    Task<List<HybridSearchResult>> SearchAsync(
        string query,
        List<double> queryEmbedding,
        string userId,
        int topK,
        float similarityThreshold = 0.3f,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result from hybrid search combining vector and BM25 results
/// </summary>
public class HybridSearchResult
{
    public string Id { get; set; } = string.Empty;
    public string NoteId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string NoteTitle { get; set; } = string.Empty;
    public List<string> NoteTags { get; set; } = new();
    public int ChunkIndex { get; set; }
    
    // Individual scores
    public float VectorScore { get; set; }
    public float BM25Score { get; set; }
    public int VectorRank { get; set; }
    public int BM25Rank { get; set; }
    
    // Combined RRF score
    public float RRFScore { get; set; }
    
    // Source flags
    public bool FoundInVectorSearch { get; set; }
    public bool FoundInBM25Search { get; set; }
    
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class HybridSearchService : IHybridSearchService
{
    private readonly IVectorStore _vectorStore;
    private readonly IBM25SearchService _bm25SearchService;
    private readonly RagSettings _settings;
    private readonly ILogger<HybridSearchService> _logger;

    // Standard RRF constant (k=60 is commonly used)
    private const int RRF_K = 60;

    public HybridSearchService(
        IVectorStore vectorStore,
        IBM25SearchService bm25SearchService,
        IOptions<RagSettings> settings,
        ILogger<HybridSearchService> logger)
    {
        _vectorStore = vectorStore;
        _bm25SearchService = bm25SearchService;
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
        _logger.LogInformation(
            "Starting hybrid search. UserId: {UserId}, Query: {Query}, TopK: {TopK}, HybridEnabled: {HybridEnabled}",
            userId, query.Substring(0, Math.Min(50, query.Length)), topK, _settings.EnableHybridSearch);

        // If hybrid search is disabled, fall back to vector-only search
        if (!_settings.EnableHybridSearch)
        {
            return await VectorOnlySearchAsync(queryEmbedding, userId, topK, similarityThreshold, cancellationToken);
        }

        // Retrieve more results initially for fusion (e.g., 3x topK from each source)
        var retrievalMultiplier = 3;
        var initialRetrievalCount = Math.Max(topK * retrievalMultiplier, _settings.InitialRetrievalCount);

        // Run searches sequentially to avoid DbContext concurrency issues
        // (DbContext is not thread-safe and both services share the same scoped instance)
        var vectorResults = await _vectorStore.SearchAsync(
            queryEmbedding, userId, initialRetrievalCount, similarityThreshold, cancellationToken);
        
        var bm25Results = await _bm25SearchService.SearchAsync(
            query, userId, initialRetrievalCount, cancellationToken);

        _logger.LogInformation(
            "Search results retrieved. VectorResults: {VectorCount}, BM25Results: {BM25Count}",
            vectorResults.Count, bm25Results.Count);

        // Fuse results using RRF
        var fusedResults = FuseResultsWithRRF(vectorResults, bm25Results);

        // Return top K results
        var finalResults = fusedResults.Take(topK).ToList();

        _logger.LogInformation(
            "Hybrid search completed. FinalResults: {Count}, TopRRFScore: {TopScore:F4}",
            finalResults.Count, finalResults.FirstOrDefault()?.RRFScore ?? 0);

        return finalResults;
    }

    private async Task<List<HybridSearchResult>> VectorOnlySearchAsync(
        List<double> queryEmbedding,
        string userId,
        int topK,
        float similarityThreshold,
        CancellationToken cancellationToken)
    {
        var vectorResults = await _vectorStore.SearchAsync(
            queryEmbedding, userId, topK, similarityThreshold, cancellationToken);

        return vectorResults.Select((r, index) => new HybridSearchResult
        {
            Id = r.Id,
            NoteId = r.NoteId,
            Content = r.Content,
            NoteTitle = r.NoteTitle,
            NoteTags = r.NoteTags,
            ChunkIndex = r.ChunkIndex,
            VectorScore = r.SimilarityScore,
            VectorRank = index + 1,
            BM25Score = 0,
            BM25Rank = 0,
            RRFScore = r.SimilarityScore, // Use vector score directly when no fusion
            FoundInVectorSearch = true,
            FoundInBM25Search = false,
            Metadata = r.Metadata
        }).ToList();
    }

    /// <summary>
    /// Fuses vector and BM25 results using Reciprocal Rank Fusion (RRF)
    /// RRF Score = sum(1 / (k + rank_i)) for each ranking list
    /// </summary>
    private List<HybridSearchResult> FuseResultsWithRRF(
        List<VectorSearchResult> vectorResults,
        List<BM25SearchResult> bm25Results)
    {
        var resultMap = new Dictionary<string, HybridSearchResult>();
        var k = _settings.RRFConstant > 0 ? _settings.RRFConstant : RRF_K;

        // Process vector search results
        for (int i = 0; i < vectorResults.Count; i++)
        {
            var result = vectorResults[i];
            var rank = i + 1;
            var rrfContribution = 1.0f / (k + rank);

            if (!resultMap.TryGetValue(result.Id, out var hybrid))
            {
                hybrid = new HybridSearchResult
                {
                    Id = result.Id,
                    NoteId = result.NoteId,
                    Content = result.Content,
                    NoteTitle = result.NoteTitle,
                    NoteTags = result.NoteTags,
                    ChunkIndex = result.ChunkIndex,
                    Metadata = result.Metadata
                };
                resultMap[result.Id] = hybrid;
            }

            hybrid.VectorScore = result.SimilarityScore;
            hybrid.VectorRank = rank;
            hybrid.FoundInVectorSearch = true;
            hybrid.RRFScore += rrfContribution * _settings.VectorWeight;
        }

        // Process BM25 search results
        for (int i = 0; i < bm25Results.Count; i++)
        {
            var result = bm25Results[i];
            var rank = i + 1;
            var rrfContribution = 1.0f / (k + rank);

            if (!resultMap.TryGetValue(result.Id, out var hybrid))
            {
                hybrid = new HybridSearchResult
                {
                    Id = result.Id,
                    NoteId = result.NoteId,
                    Content = result.Content,
                    NoteTitle = result.NoteTitle,
                    NoteTags = result.NoteTags,
                    ChunkIndex = result.ChunkIndex
                };
                resultMap[result.Id] = hybrid;
            }

            hybrid.BM25Score = result.BM25Score;
            hybrid.BM25Rank = rank;
            hybrid.FoundInBM25Search = true;
            hybrid.RRFScore += rrfContribution * _settings.BM25Weight;
        }

        // Sort by combined RRF score (descending)
        var fusedResults = resultMap.Values
            .OrderByDescending(r => r.RRFScore)
            .ToList();

        // Log fusion statistics
        var bothSources = fusedResults.Count(r => r.FoundInVectorSearch && r.FoundInBM25Search);
        var vectorOnly = fusedResults.Count(r => r.FoundInVectorSearch && !r.FoundInBM25Search);
        var bm25Only = fusedResults.Count(r => !r.FoundInVectorSearch && r.FoundInBM25Search);

        _logger.LogDebug(
            "RRF fusion complete. BothSources: {Both}, VectorOnly: {Vector}, BM25Only: {BM25}",
            bothSources, vectorOnly, bm25Only);

        return fusedResults;
    }
}

