using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.Services.RAG;

/// <summary>
/// Service for reranking search results using LLM-based relevance scoring
/// Based on best practices from production RAG systems
/// </summary>
public interface IRerankerService
{
    /// <summary>
    /// Reranks hybrid search results using LLM-based relevance scoring
    /// </summary>
    Task<List<RerankedResult>> RerankAsync(
        string query,
        List<HybridSearchResult> results,
        int topK,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result after LLM reranking with relevance score
/// </summary>
public class RerankedResult
{
    public string Id { get; set; } = string.Empty;
    public string NoteId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string NoteTitle { get; set; } = string.Empty;
    public List<string> NoteTags { get; set; } = new();
    public int ChunkIndex { get; set; }

    // Original scores from hybrid search
    public float VectorScore { get; set; }
    public float BM25Score { get; set; }
    public float RRFScore { get; set; }

    // Reranking score from LLM (0-10)
    public float RelevanceScore { get; set; }

    // Final combined score
    public float FinalScore { get; set; }

    // Reranking metadata
    public bool WasReranked { get; set; }
    public int OriginalRank { get; set; }
    public int FinalRank { get; set; }

    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class RerankerService : IRerankerService
{
    private readonly IAIProviderFactory _aiProviderFactory;
    private readonly RagSettings _settings;
    private readonly ILogger<RerankerService> _logger;

    // Batch size for parallel reranking to avoid rate limits
    private const int RERANK_BATCH_SIZE = 5;

    public RerankerService(
        IAIProviderFactory aiProviderFactory,
        IOptions<RagSettings> settings,
        ILogger<RerankerService> logger)
    {
        _aiProviderFactory = aiProviderFactory;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<List<RerankedResult>> RerankAsync(
        string query,
        List<HybridSearchResult> results,
        int topK,
        CancellationToken cancellationToken = default)
    {
        if (!results.Any())
        {
            return new List<RerankedResult>();
        }

        // If reranking is disabled, just convert and return top K
        if (!_settings.EnableReranking)
        {
            return results
                .Take(topK)
                .Select((r, i) => ConvertToRerankedResult(r, i + 1, 0, false))
                .ToList();
        }

        _logger.LogInformation(
            "Starting LLM reranking. Query: {Query}, Results: {Count}, TopK: {TopK}",
            query.Substring(0, Math.Min(50, query.Length)), results.Count, topK);

        var provider = _aiProviderFactory.GetProvider(_settings.RerankingProvider);
        if (provider == null)
        {
            _logger.LogWarning("Reranking provider {Provider} not available, returning unranked results",
                _settings.RerankingProvider);
            return results
                .Take(topK)
                .Select((r, i) => ConvertToRerankedResult(r, i + 1, 0, false))
                .ToList();
        }

        var rerankedResults = new List<RerankedResult>();

        // Process in batches to avoid overwhelming the API
        var batches = results
            .Select((result, index) => new { Result = result, OriginalRank = index + 1 })
            .Chunk(RERANK_BATCH_SIZE)
            .ToList();

        foreach (var batch in batches)
        {
            var batchTasks = batch.Select(async item =>
            {
                var score = await GetRelevanceScoreAsync(
                    provider, query, item.Result, cancellationToken);
                return ConvertToRerankedResult(item.Result, item.OriginalRank, score, true);
            });

            var batchResults = await Task.WhenAll(batchTasks);
            rerankedResults.AddRange(batchResults);
        }

        // Sort by relevance score (descending) and assign final ranks
        var sortedResults = rerankedResults
            .OrderByDescending(r => r.RelevanceScore)
            .ThenByDescending(r => r.RRFScore) // Tie-breaker using RRF score
            .Take(topK)
            .Select((r, i) =>
            {
                r.FinalRank = i + 1;
                r.FinalScore = CalculateFinalScore(r);
                return r;
            })
            .ToList();

        // Log reranking impact
        LogRerankingImpact(results, sortedResults);

        return sortedResults;
    }

    private async Task<float> GetRelevanceScoreAsync(
        IAIProvider provider,
        string query,
        HybridSearchResult result,
        CancellationToken cancellationToken)
    {
        try
        {
            // Truncate content if too long to avoid token limits
            var truncatedContent = result.Content.Length > 1500
                ? result.Content.Substring(0, 1500) + "..."
                : result.Content;

            var prompt = $@"You are a relevance scoring system. Rate how relevant the following document is to the given query.

Query: {query}

Document Title: {result.NoteTitle}
Document Content: {truncatedContent}

Rate the relevance on a scale of 0 to 10, where:
- 0: Completely irrelevant
- 3: Tangentially related
- 5: Somewhat relevant
- 7: Relevant
- 10: Highly relevant and directly answers the query

Respond with ONLY a single number between 0 and 10. No explanation.";

            var request = new AIRequest { Prompt = prompt, MaxTokens = 10, Temperature = 0.0f };
            var aiResponse = await provider.GenerateCompletionAsync(request, cancellationToken);
            var response = aiResponse.Content;

            if (TryParseScore(response, out var score))
            {
                _logger.LogDebug("Rerank score for '{Title}': {Score}",
                    result.NoteTitle.Substring(0, Math.Min(30, result.NoteTitle.Length)), score);
                return score;
            }

            // If we couldn't parse, return a neutral score
            _logger.LogWarning("Could not parse rerank score from response: {Response}", response);
            return 5.0f;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting relevance score for document {Id}", result.Id);
            return 5.0f; // Return neutral score on error
        }
    }

    private bool TryParseScore(string response, out float score)
    {
        score = 0;

        if (string.IsNullOrWhiteSpace(response))
            return false;

        // Try to extract a number from the response
        var cleanedResponse = response.Trim();

        // First try direct parse
        if (float.TryParse(cleanedResponse, out score))
        {
            score = Math.Clamp(score, 0, 10);
            return true;
        }

        // Try to extract number using regex
        var match = Regex.Match(cleanedResponse, @"(\d+(?:\.\d+)?)");
        if (match.Success && float.TryParse(match.Groups[1].Value, out score))
        {
            score = Math.Clamp(score, 0, 10);
            return true;
        }

        return false;
    }

    private RerankedResult ConvertToRerankedResult(
        HybridSearchResult result,
        int originalRank,
        float relevanceScore,
        bool wasReranked)
    {
        return new RerankedResult
        {
            Id = result.Id,
            NoteId = result.NoteId,
            Content = result.Content,
            NoteTitle = result.NoteTitle,
            NoteTags = result.NoteTags,
            ChunkIndex = result.ChunkIndex,
            VectorScore = result.VectorScore,
            BM25Score = result.BM25Score,
            RRFScore = result.RRFScore,
            RelevanceScore = relevanceScore,
            WasReranked = wasReranked,
            OriginalRank = originalRank,
            Metadata = result.Metadata
        };
    }

    private float CalculateFinalScore(RerankedResult result)
    {
        if (!result.WasReranked)
        {
            return result.RRFScore;
        }

        // Combine reranking score (normalized to 0-1) with RRF score
        // Weight reranking heavily since it's more semantically aware
        var normalizedRelevance = result.RelevanceScore / 10.0f;
        return (normalizedRelevance * 0.7f) + (result.RRFScore * 0.3f);
    }

    private void LogRerankingImpact(
        List<HybridSearchResult> originalResults,
        List<RerankedResult> rerankedResults)
    {
        var rankChanges = rerankedResults
            .Select(r => new { r.NoteTitle, r.OriginalRank, r.FinalRank, Change = r.OriginalRank - r.FinalRank })
            .ToList();

        var avgRankChange = rankChanges.Average(r => Math.Abs(r.Change));
        var promoted = rankChanges.Count(r => r.Change > 0);
        var demoted = rankChanges.Count(r => r.Change < 0);

        _logger.LogInformation(
            "Reranking complete. AvgRankChange: {AvgChange:F1}, Promoted: {Promoted}, Demoted: {Demoted}",
            avgRankChange, promoted, demoted);

        if (_settings.LogDetailedMetrics)
        {
            foreach (var change in rankChanges.Where(r => Math.Abs(r.Change) > 2))
            {
                _logger.LogDebug(
                    "Significant rank change: '{Title}' {Original} -> {Final} ({Direction})",
                    change.NoteTitle.Substring(0, Math.Min(30, change.NoteTitle.Length)),
                    change.OriginalRank, change.FinalRank,
                    change.Change > 0 ? "promoted" : "demoted");
            }
        }
    }
}

