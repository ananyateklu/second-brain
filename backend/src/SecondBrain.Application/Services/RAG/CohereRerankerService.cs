using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Application.Telemetry;

namespace SecondBrain.Application.Services.RAG;

/// <summary>
/// Cohere-specific reranker service using the native Cohere Rerank API.
/// More efficient and accurate than LLM-based reranking for RAG pipelines.
/// </summary>
public interface ICohereRerankerService
{
    /// <summary>
    /// Check if Cohere reranking is available
    /// </summary>
    bool IsAvailable { get; }

    /// <summary>
    /// Reranks hybrid search results using Cohere's native rerank API.
    /// </summary>
    Task<List<RerankedResult>> RerankAsync(
        string query,
        List<HybridSearchResult> results,
        int topK,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Implementation of Cohere reranking using the native rerank API.
/// Provides faster and more accurate relevance scoring than LLM-based approaches.
/// </summary>
public class CohereRerankerService : ICohereRerankerService
{
    private readonly CohereProvider _cohereProvider;
    private readonly RagSettings _ragSettings;
    private readonly CohereSettings _cohereSettings;
    private readonly ILogger<CohereRerankerService> _logger;

    public CohereRerankerService(
        CohereProvider cohereProvider,
        IOptions<RagSettings> ragSettings,
        IOptions<AIProvidersSettings> aiSettings,
        ILogger<CohereRerankerService> logger)
    {
        _cohereProvider = cohereProvider;
        _ragSettings = ragSettings.Value;
        _cohereSettings = aiSettings.Value.Cohere;
        _logger = logger;
    }

    public bool IsAvailable => _cohereProvider.IsEnabled;

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

        using var activity = ApplicationTelemetry.RAGPipelineSource.StartActivity("CohereReranker.Rerank", ActivityKind.Internal);
        activity?.SetTag("rag.rerank.provider", "Cohere");
        activity?.SetTag("rag.rerank.input_count", results.Count);
        activity?.SetTag("rag.rerank.top_k", topK);
        activity?.SetTag("rag.rerank.model", _cohereSettings.RerankModel);

        var stopwatch = Stopwatch.StartNew();

        // Check if Cohere reranking is enabled
        if (!_cohereProvider.IsEnabled)
        {
            _logger.LogWarning("Cohere provider not available, returning unranked results");
            activity?.SetTag("rag.rerank.skipped", true);
            return results
                .Take(topK)
                .Select((r, i) => ConvertToRerankedResult(r, i + 1, 0, false))
                .ToList();
        }

        _logger.LogInformation(
            "Starting Cohere reranking. Query: {Query}, Results: {Count}, TopK: {TopK}, Model: {Model}",
            query.Substring(0, Math.Min(50, query.Length)), results.Count, topK, _cohereSettings.RerankModel);

        // Prepare documents for Cohere rerank API
        var documents = results.Select((r, i) => new CohereDocument
        {
            Id = r.Id,
            // Combine title and content for better relevance scoring
            Text = $"Title: {r.NoteTitle}\n\nContent: {TruncateContent(r.Content, 4000)}"
        }).ToList();

        // Call Cohere rerank API
        var rerankResponse = await _cohereProvider.RerankAsync(
            query,
            documents,
            Math.Min(topK * 2, results.Count), // Request more than needed for filtering
            _cohereSettings.RerankModel,
            cancellationToken);

        stopwatch.Stop();

        if (!rerankResponse.Success)
        {
            _logger.LogError("Cohere rerank failed: {Error}. Falling back to unranked results.", rerankResponse.Error);
            activity?.RecordException(new Exception(rerankResponse.Error));

            return results
                .Take(topK)
                .Select((r, i) => ConvertToRerankedResult(r, i + 1, 0, false))
                .ToList();
        }

        // Map scores back to results
        var resultById = results.ToDictionary(r => r.Id);
        var rerankedResults = new List<RerankedResult>();

        foreach (var rerankResult in rerankResponse.Results)
        {
            if (resultById.TryGetValue(rerankResult.DocumentId, out var originalResult))
            {
                // Cohere returns scores 0-1, convert to 0-10 scale for consistency with LLM-based reranking
                var normalizedScore = rerankResult.RelevanceScore * 10f;

                var reranked = ConvertToRerankedResult(
                    originalResult,
                    results.IndexOf(originalResult) + 1,
                    normalizedScore,
                    true);

                rerankedResults.Add(reranked);
            }
        }

        // Sort by relevance score (descending) and filter by minimum score threshold
        var minScoreThreshold = _ragSettings.MinRerankScore;
        var sortedResults = rerankedResults
            .OrderByDescending(r => r.RelevanceScore)
            .ThenByDescending(r => r.RRFScore) // Tie-breaker
            .Where(r => r.RelevanceScore >= minScoreThreshold)
            .Take(topK)
            .Select((r, i) =>
            {
                r.FinalRank = i + 1;
                r.FinalScore = CalculateFinalScore(r);
                return r;
            })
            .ToList();

        activity?.SetTag("rag.rerank.output_count", sortedResults.Count);
        activity?.SetTag("rag.rerank.duration_ms", stopwatch.ElapsedMilliseconds);
        activity?.SetTag("rag.rerank.search_units", rerankResponse.SearchUnits);
        activity?.SetTag("rag.rerank.min_score_threshold", minScoreThreshold);

        if (sortedResults.Any())
        {
            activity?.SetTag("rag.rerank.avg_score", sortedResults.Average(r => r.RelevanceScore));
            activity?.SetTag("rag.rerank.max_score", sortedResults.Max(r => r.RelevanceScore));
            activity?.SetTag("rag.rerank.min_score", sortedResults.Min(r => r.RelevanceScore));
        }

        activity?.SetStatus(ActivityStatusCode.Ok);
        ApplicationTelemetry.RAGRerankDuration.Record(stopwatch.ElapsedMilliseconds);

        LogRerankingImpact(results, sortedResults);

        return sortedResults;
    }

    private static string TruncateContent(string content, int maxLength)
    {
        if (content.Length <= maxLength)
            return content;

        return content.Substring(0, maxLength) + "...";
    }

    private static RerankedResult ConvertToRerankedResult(
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

    private static float CalculateFinalScore(RerankedResult result)
    {
        if (!result.WasReranked)
        {
            // When not reranked, use vector score (cosine similarity) as the final score
            return result.VectorScore;
        }

        // Combine reranking score (normalized to 0-1) with vector similarity score
        // Weight reranking heavily since Cohere rerank is highly accurate
        var normalizedRelevance = result.RelevanceScore / 10.0f;
        return (normalizedRelevance * 0.8f) + (result.VectorScore * 0.2f);
    }

    private void LogRerankingImpact(
        List<HybridSearchResult> originalResults,
        List<RerankedResult> rerankedResults)
    {
        if (rerankedResults.Count == 0)
        {
            _logger.LogInformation(
                "Cohere reranking complete. All {OriginalCount} results filtered out (below minimum score threshold)",
                originalResults.Count);
            return;
        }

        var rankChanges = rerankedResults
            .Select(r => new { r.NoteTitle, r.OriginalRank, r.FinalRank, Change = r.OriginalRank - r.FinalRank })
            .ToList();

        var avgRankChange = rankChanges.Average(r => Math.Abs(r.Change));
        var promoted = rankChanges.Count(r => r.Change > 0);
        var demoted = rankChanges.Count(r => r.Change < 0);

        _logger.LogInformation(
            "Cohere reranking complete. AvgRankChange: {AvgChange:F1}, Promoted: {Promoted}, Demoted: {Demoted}",
            avgRankChange, promoted, demoted);

        if (_ragSettings.LogDetailedMetrics)
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
