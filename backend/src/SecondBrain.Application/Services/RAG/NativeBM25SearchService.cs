using Microsoft.Extensions.Logging;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.RAG;

/// <summary>
/// Native PostgreSQL BM25 search service using ts_rank_cd for full-text ranking.
/// This implementation pushes BM25 scoring to the database for better performance
/// compared to in-memory scoring, especially for large datasets.
/// 
/// PostgreSQL 18 optimized - uses native tsvector/tsquery with cover density ranking.
/// </summary>
public interface INativeBM25SearchService
{
    /// <summary>
    /// Performs BM25-style search using PostgreSQL's native full-text search with ts_rank_cd
    /// </summary>
    Task<List<BM25SearchResult>> SearchAsync(
        string query,
        string userId,
        int topK,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Performs BM25 search with highlighted content snippets
    /// </summary>
    Task<List<BM25SearchResultWithHighlight>> SearchWithHighlightAsync(
        string query,
        string userId,
        int topK,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// BM25 search result with highlighted content snippets
/// </summary>
public class BM25SearchResultWithHighlight : BM25SearchResult
{
    /// <summary>
    /// Content with highlighted search terms using HTML mark tags
    /// </summary>
    public string HighlightedContent { get; set; } = string.Empty;
}

/// <summary>
/// Native PostgreSQL implementation of BM25 search using ts_rank_cd.
/// Delegates to the repository for the actual database queries.
/// </summary>
public class NativeBM25SearchService : INativeBM25SearchService
{
    private readonly INoteEmbeddingSearchRepository _repository;
    private readonly ILogger<NativeBM25SearchService> _logger;

    public NativeBM25SearchService(
        INoteEmbeddingSearchRepository repository,
        ILogger<NativeBM25SearchService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<List<BM25SearchResult>> SearchAsync(
        string query,
        string userId,
        int topK,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new List<BM25SearchResult>();
        }

        try
        {
            _logger.LogInformation(
                "Starting native BM25 search. UserId: {UserId}, Query: {Query}, TopK: {TopK}",
                userId, query, topK);

            var nativeResults = await _repository.SearchWithNativeBM25Async(
                query, userId, topK, includeHighlights: false, cancellationToken);

            // Map to BM25SearchResult
            var results = nativeResults.Select((r, index) => new BM25SearchResult
            {
                Id = r.Id,
                NoteId = r.NoteId,
                Content = r.Content,
                NoteTitle = r.NoteTitle,
                NoteTags = r.NoteTags,
                ChunkIndex = r.ChunkIndex,
                BM25Score = r.BM25Score,
                Rank = index + 1
            }).ToList();

            _logger.LogInformation(
                "Native BM25 search completed. UserId: {UserId}, Results: {ResultCount}",
                userId, results.Count);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Native BM25 search failed. UserId: {UserId}, Query: {Query}", userId, query);
            return new List<BM25SearchResult>();
        }
    }

    public async Task<List<BM25SearchResultWithHighlight>> SearchWithHighlightAsync(
        string query,
        string userId,
        int topK,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new List<BM25SearchResultWithHighlight>();
        }

        try
        {
            _logger.LogInformation(
                "Starting native BM25 search with highlights. UserId: {UserId}, Query: {Query}, TopK: {TopK}",
                userId, query, topK);

            var nativeResults = await _repository.SearchWithNativeBM25Async(
                query, userId, topK, includeHighlights: true, cancellationToken);

            // Map to BM25SearchResultWithHighlight
            var results = nativeResults.Select((r, index) => new BM25SearchResultWithHighlight
            {
                Id = r.Id,
                NoteId = r.NoteId,
                Content = r.Content,
                NoteTitle = r.NoteTitle,
                NoteTags = r.NoteTags,
                ChunkIndex = r.ChunkIndex,
                BM25Score = r.BM25Score,
                Rank = index + 1,
                HighlightedContent = r.HighlightedContent ?? string.Empty
            }).ToList();

            _logger.LogInformation(
                "Native BM25 search with highlights completed. UserId: {UserId}, Results: {ResultCount}",
                userId, results.Count);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Native BM25 search with highlights failed. UserId: {UserId}", userId);
            return new List<BM25SearchResultWithHighlight>();
        }
    }
}
