using Microsoft.Extensions.Logging;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.RAG;

/// <summary>
/// Service for BM25-based full-text search using PostgreSQL's tsvector/tsquery
/// </summary>
public interface IBM25SearchService
{
    Task<List<BM25SearchResult>> SearchAsync(
        string query,
        string userId,
        int topK,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result from BM25 full-text search
/// </summary>
public class BM25SearchResult
{
    public string Id { get; set; } = string.Empty;
    public string NoteId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string NoteTitle { get; set; } = string.Empty;
    public List<string> NoteTags { get; set; } = new();
    public int ChunkIndex { get; set; }
    public float BM25Score { get; set; }
    public int Rank { get; set; }
}

public class BM25SearchService : IBM25SearchService
{
    private readonly INoteEmbeddingSearchRepository _repository;
    private readonly ILogger<BM25SearchService> _logger;

    public BM25SearchService(
        INoteEmbeddingSearchRepository repository,
        ILogger<BM25SearchService> logger)
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
                "Starting BM25 search. UserId: {UserId}, Query: {Query}, TopK: {TopK}",
                userId, query, topK);

            // Sanitize the query for PostgreSQL full-text search
            var sanitizedQuery = SanitizeQueryForTsQuery(query);

            // Query embeddings with search vectors
            var embeddings = (await _repository.GetWithSearchVectorAsync(cancellationToken)).ToList();

            // Perform text matching in memory for now (works with any PostgreSQL version)
            // For production with high volume, use raw SQL with ts_rank_cd
            var queryTerms = sanitizedQuery.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);

            var searchResults = embeddings
                .Select(e => new
                {
                    Embedding = e,
                    Score = CalculateBM25Score(e.NoteTitle, e.Content, queryTerms)
                })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .Take(topK)
                .Select((x, index) => new BM25SearchResult
                {
                    Id = x.Embedding.Id,
                    NoteId = x.Embedding.NoteId,
                    Content = x.Embedding.Content,
                    NoteTitle = x.Embedding.NoteTitle,
                    NoteTags = x.Embedding.NoteTags ?? new List<string>(),
                    ChunkIndex = x.Embedding.ChunkIndex,
                    BM25Score = x.Score,
                    Rank = index + 1
                })
                .ToList();

            _logger.LogInformation(
                "BM25 search completed. UserId: {UserId}, Results: {ResultCount}",
                userId, searchResults.Count);

            return searchResults;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing BM25 search. UserId: {UserId}, Query: {Query}", userId, query);
            return new List<BM25SearchResult>();
        }
    }

    /// <summary>
    /// Calculate a simplified BM25-like score for a document
    /// </summary>
    private float CalculateBM25Score(string title, string content, string[] queryTerms)
    {
        if (queryTerms.Length == 0)
            return 0;

        var titleLower = title?.ToLower() ?? "";
        var contentLower = content?.ToLower() ?? "";
        var fullText = $"{titleLower} {contentLower}";

        float score = 0;
        foreach (var term in queryTerms)
        {
            // Title matches weighted higher
            var titleMatches = CountOccurrences(titleLower, term);
            var contentMatches = CountOccurrences(contentLower, term);

            // Simple TF-IDF-like scoring
            if (titleMatches > 0)
                score += titleMatches * 3.0f; // Title weight = 3x

            if (contentMatches > 0)
                score += contentMatches * 1.0f;
        }

        // Normalize by document length (simple BM25 length normalization)
        var docLength = fullText.Length;
        var avgDocLength = 500.0f; // Approximate average
        var k1 = 1.2f;
        var b = 0.75f;

        var lengthNorm = 1 - b + b * (docLength / avgDocLength);
        return score / (k1 * lengthNorm);
    }

    private int CountOccurrences(string text, string term)
    {
        if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(term))
            return 0;

        int count = 0;
        int index = 0;
        while ((index = text.IndexOf(term, index, StringComparison.OrdinalIgnoreCase)) != -1)
        {
            count++;
            index += term.Length;
        }
        return count;
    }

    /// <summary>
    /// Sanitizes the query string for use with PostgreSQL tsquery
    /// </summary>
    private string SanitizeQueryForTsQuery(string query)
    {
        // Remove special characters that could break tsquery parsing
        // Keep alphanumeric, spaces, and basic punctuation
        var sanitized = new string(query
            .Where(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c) || c == '-' || c == '_')
            .ToArray());

        // Collapse multiple spaces
        while (sanitized.Contains("  "))
        {
            sanitized = sanitized.Replace("  ", " ");
        }

        return sanitized.Trim();
    }
}

