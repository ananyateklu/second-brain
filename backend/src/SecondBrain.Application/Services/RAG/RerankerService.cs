using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.AI.StructuredOutput.Models;
using SecondBrain.Application.Telemetry;

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
    /// <summary>
    /// AI-generated summary of the note for improved RAG context.
    /// </summary>
    public string? NoteSummary { get; set; }
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
    private readonly IStructuredOutputService? _structuredOutputService;
    private readonly RagSettings _settings;
    private readonly ILogger<RerankerService> _logger;

    // Batch size for parallel reranking to avoid rate limits
    private const int RERANK_BATCH_SIZE = 5;

    public RerankerService(
        IAIProviderFactory aiProviderFactory,
        IOptions<RagSettings> settings,
        ILogger<RerankerService> logger,
        IStructuredOutputService? structuredOutputService = null)
    {
        _aiProviderFactory = aiProviderFactory;
        _structuredOutputService = structuredOutputService;
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

        using var activity = ApplicationTelemetry.RAGPipelineSource.StartActivity("Reranker.Rerank", ActivityKind.Internal);
        activity?.SetTag("rag.rerank.input_count", results.Count);
        activity?.SetTag("rag.rerank.top_k", topK);
        activity?.SetTag("rag.rerank.enabled", _settings.EnableReranking);

        var stopwatch = Stopwatch.StartNew();

        // If reranking is disabled, just convert and return top K
        if (!_settings.EnableReranking)
        {
            var unrankedResults = results
                .Take(topK)
                .Select((r, i) => ConvertToRerankedResult(r, i + 1, 0, false))
                .ToList();
            activity?.SetTag("rag.rerank.skipped", true);
            return unrankedResults;
        }

        _logger.LogInformation(
            "Starting LLM reranking. Query: {Query}, Results: {Count}, TopK: {TopK}",
            query.Substring(0, Math.Min(50, query.Length)), results.Count, topK);

        var provider = _aiProviderFactory.GetProvider(_settings.RerankingProvider);
        if (provider == null)
        {
            _logger.LogWarning("Reranking provider {Provider} not available, returning unranked results",
                _settings.RerankingProvider);
            activity?.SetTag("rag.rerank.provider_unavailable", true);
            return results
                .Take(topK)
                .Select((r, i) => ConvertToRerankedResult(r, i + 1, 0, false))
                .ToList();
        }

        activity?.SetTag("rag.rerank.provider", _settings.RerankingProvider);

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

        // Sort by relevance score (descending) and filter by minimum score threshold
        var sortedResults = rerankedResults
            .OrderByDescending(r => r.RelevanceScore)
            .ThenByDescending(r => r.RRFScore) // Tie-breaker using RRF score
            .Where(r => r.RelevanceScore >= _settings.MinRerankScore) // Filter out low-relevance results
            .Take(topK)
            .Select((r, i) =>
            {
                r.FinalRank = i + 1;
                r.FinalScore = CalculateFinalScore(r);
                return r;
            })
            .ToList();

        if (rerankedResults.Count > sortedResults.Count)
        {
            var filteredCount = rerankedResults.Count - sortedResults.Count - (rerankedResults.Count - topK > 0 ? rerankedResults.Count - topK : 0);
            _logger.LogInformation(
                "Filtered out {FilteredCount} results below minimum rerank score ({MinScore}/10)",
                Math.Max(0, rerankedResults.Count(r => r.RelevanceScore < _settings.MinRerankScore)),
                _settings.MinRerankScore);
        }

        stopwatch.Stop();
        activity?.SetTag("rag.rerank.output_count", sortedResults.Count);
        activity?.SetTag("rag.rerank.duration_ms", stopwatch.ElapsedMilliseconds);
        activity?.SetTag("rag.rerank.min_score_threshold", _settings.MinRerankScore);
        activity?.SetTag("rag.rerank.filtered_count", rerankedResults.Count(r => r.RelevanceScore < _settings.MinRerankScore));
        if (sortedResults.Any())
        {
            activity?.SetTag("rag.rerank.avg_score", sortedResults.Average(r => r.RelevanceScore));
            activity?.SetTag("rag.rerank.max_score", sortedResults.Max(r => r.RelevanceScore));
            activity?.SetTag("rag.rerank.min_score", sortedResults.Min(r => r.RelevanceScore));
        }
        activity?.SetStatus(ActivityStatusCode.Ok);

        ApplicationTelemetry.RAGRerankDuration.Record(stopwatch.ElapsedMilliseconds);

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

            // Try structured output first for reliable score extraction
            if (_structuredOutputService != null)
            {
                var structuredScore = await GetStructuredRelevanceScoreAsync(
                    query, result.NoteTitle, truncatedContent, cancellationToken);

                if (structuredScore.HasValue)
                {
                    _logger.LogDebug("Structured rerank score for '{Title}': {Score}",
                        result.NoteTitle.Substring(0, Math.Min(30, result.NoteTitle.Length)), structuredScore.Value);
                    return structuredScore.Value;
                }

                _logger.LogDebug("Structured output failed, falling back to text parsing");
            }

            // Fallback to text-based scoring with regex parsing
            return await GetTextBasedRelevanceScoreAsync(provider, query, result.NoteTitle, truncatedContent, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting relevance score for document {Id}", result.Id);
            return 5.0f; // Return neutral score on error
        }
    }

    /// <summary>
    /// Gets relevance score using structured output for reliable parsing.
    /// </summary>
    private async Task<float?> GetStructuredRelevanceScoreAsync(
        string query,
        string noteTitle,
        string content,
        CancellationToken cancellationToken)
    {
        try
        {
            var prompt = $@"Rate how relevant this document is to the given query.

Query: {query}

Document Title: {noteTitle}
Document Content: {content}

Scoring guide:
- 0: Completely irrelevant, no connection to the query
- 3: Tangentially related, mentions similar topics but doesn't address the query
- 5: Somewhat relevant, contains related information but not directly useful
- 7: Relevant, contains information that helps answer the query
- 10: Highly relevant, directly addresses or answers the query

Provide a relevance score and brief reasoning.";

            var options = new StructuredOutputOptions
            {
                Temperature = 0.0f,
                MaxTokens = 300, // Increased from 100 to prevent JSON truncation when reasoning field is included
                SystemInstruction = "You are a document relevance scoring system. Evaluate how well a document matches a search query."
            };

            var result = await _structuredOutputService!.GenerateAsync<RelevanceScoreResult>(
                _settings.RerankingProvider,
                prompt,
                options,
                cancellationToken);

            if (result != null)
            {
                var score = Math.Clamp(result.Score, 0, 10);
                if (!string.IsNullOrEmpty(result.Reasoning))
                {
                    _logger.LogDebug("Rerank reasoning: {Reasoning}", result.Reasoning);
                }
                return score;
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Structured relevance scoring failed");
            return null;
        }
    }

    /// <summary>
    /// Gets relevance score using text-based response with regex fallback.
    /// </summary>
    private async Task<float> GetTextBasedRelevanceScoreAsync(
        IAIProvider provider,
        string query,
        string noteTitle,
        string content,
        CancellationToken cancellationToken)
    {
        var prompt = $@"You are a relevance scoring system. Rate how relevant the following document is to the given query.

Query: {query}

Document Title: {noteTitle}
Document Content: {content}

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
            _logger.LogDebug("Text-based rerank score for '{Title}': {Score}",
                noteTitle.Substring(0, Math.Min(30, noteTitle.Length)), score);
            return score;
        }

        // If we couldn't parse, return a neutral score
        _logger.LogWarning("Could not parse rerank score from response: {Response}", response);
        return 5.0f;
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
            NoteSummary = result.NoteSummary,
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
            // When not reranked, use vector score (cosine similarity) as the final score
            // This is more meaningful than RRF score which is rank-based and tiny (0.01-0.02)
            return result.VectorScore;
        }

        // Combine reranking score (normalized to 0-1) with vector similarity score
        // Both are on 0-1 scale, making the combination meaningful
        // Weight reranking heavily since it's more semantically aware
        var normalizedRelevance = result.RelevanceScore / 10.0f;

        // Use vector score (cosine similarity, 0-1) instead of RRF score (rank-based, ~0.01)
        // This allows perfect matches to achieve scores close to 1.0
        return (normalizedRelevance * 0.7f) + (result.VectorScore * 0.3f);
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

