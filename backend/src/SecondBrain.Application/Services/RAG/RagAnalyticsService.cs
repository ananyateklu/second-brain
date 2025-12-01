using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.RAG;

/// <summary>
/// Service for logging and analyzing RAG query metrics
/// Enables data-driven optimization based on user feedback correlation
/// </summary>
public interface IRagAnalyticsService
{
    /// <summary>
    /// Log RAG query metrics and return the log ID for feedback association
    /// </summary>
    Task<Guid?> LogQueryAsync(RagQueryMetrics metrics, CancellationToken cancellationToken = default);

    Task UpdateFeedbackAsync(Guid logId, string feedback, string? category = null, string? comment = null, CancellationToken cancellationToken = default);
    Task<RagPerformanceStats> GetPerformanceStatsAsync(string userId, DateTime? since = null, CancellationToken cancellationToken = default);
}

/// <summary>
/// Statistics about RAG performance
/// </summary>
public class RagPerformanceStats
{
    public int TotalQueries { get; set; }
    public int QueriesWithFeedback { get; set; }
    public int PositiveFeedback { get; set; }
    public int NegativeFeedback { get; set; }
    public double PositiveFeedbackRate { get; set; }

    public double AvgTotalTimeMs { get; set; }
    public double AvgRetrievedCount { get; set; }
    public double AvgCosineScore { get; set; }
    public double AvgRerankScore { get; set; }

    // Correlation between scores and positive feedback
    public double? CosineScoreCorrelation { get; set; }
    public double? RerankScoreCorrelation { get; set; }
}

public class RagAnalyticsService : IRagAnalyticsService
{
    private readonly IRagQueryLogRepository _repository;
    private readonly ILogger<RagAnalyticsService> _logger;

    public RagAnalyticsService(
        IRagQueryLogRepository repository,
        ILogger<RagAnalyticsService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<Guid?> LogQueryAsync(RagQueryMetrics metrics, CancellationToken cancellationToken = default)
    {
        try
        {
            var log = new RagQueryLog
            {
                UserId = metrics.UserId,
                ConversationId = metrics.ConversationId,
                Query = metrics.Query,
                QueryEmbeddingTimeMs = metrics.QueryEmbeddingTimeMs,
                VectorSearchTimeMs = metrics.VectorSearchTimeMs,
                BM25SearchTimeMs = metrics.BM25SearchTimeMs,
                RerankTimeMs = metrics.RerankTimeMs,
                TotalTimeMs = metrics.TotalTimeMs,
                RetrievedCount = metrics.RetrievedCount,
                FinalCount = metrics.FinalCount,
                AvgCosineScore = metrics.AvgCosineScore,
                AvgBM25Score = metrics.AvgBM25Score,
                AvgRerankScore = metrics.AvgRerankScore,
                TopCosineScore = metrics.TopCosineScore,
                TopRerankScore = metrics.TopRerankScore,
                HybridSearchEnabled = metrics.HybridSearchEnabled,
                HyDEEnabled = metrics.HyDEEnabled,
                MultiQueryEnabled = metrics.MultiQueryEnabled,
                RerankingEnabled = metrics.RerankingEnabled
            };

            await _repository.CreateAsync(log);

            _logger.LogDebug(
                "Logged RAG query analytics. LogId: {LogId}, TotalTime: {Time}ms",
                log.Id, log.TotalTimeMs);

            return log.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log RAG analytics");
            return null;
        }
    }

    public async Task UpdateFeedbackAsync(
        Guid logId,
        string feedback,
        string? category = null,
        string? comment = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var log = await _repository.GetByIdAsync(logId);

            if (log == null)
            {
                _logger.LogWarning("RAG query log not found. LogId: {LogId}", logId);
                return;
            }

            log.UserFeedback = feedback;
            log.FeedbackCategory = category;
            log.FeedbackComment = comment;

            await _repository.UpdateAsync(logId, log);

            _logger.LogInformation(
                "Updated RAG query feedback. LogId: {LogId}, Feedback: {Feedback}",
                logId, feedback);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update RAG feedback. LogId: {LogId}", logId);
        }
    }

    public async Task<RagPerformanceStats> GetPerformanceStatsAsync(
        string userId,
        DateTime? since = null,
        CancellationToken cancellationToken = default)
    {
        var stats = new RagPerformanceStats();

        try
        {
            var logs = (await _repository.GetByUserIdAsync(userId, since)).ToList();

            if (!logs.Any())
            {
                return stats;
            }

            stats.TotalQueries = logs.Count;
            stats.QueriesWithFeedback = logs.Count(l => !string.IsNullOrEmpty(l.UserFeedback));
            stats.PositiveFeedback = logs.Count(l => l.UserFeedback == "thumbs_up");
            stats.NegativeFeedback = logs.Count(l => l.UserFeedback == "thumbs_down");

            if (stats.QueriesWithFeedback > 0)
            {
                stats.PositiveFeedbackRate = (double)stats.PositiveFeedback / stats.QueriesWithFeedback;
            }

            stats.AvgTotalTimeMs = logs.Where(l => l.TotalTimeMs.HasValue).Average(l => l.TotalTimeMs!.Value);
            stats.AvgRetrievedCount = logs.Where(l => l.RetrievedCount.HasValue).Average(l => l.RetrievedCount!.Value);
            stats.AvgCosineScore = logs.Where(l => l.AvgCosineScore.HasValue).Average(l => l.AvgCosineScore!.Value);
            stats.AvgRerankScore = logs.Where(l => l.AvgRerankScore.HasValue).Average(l => l.AvgRerankScore!.Value);

            // Calculate correlation between scores and positive feedback
            var logsWithFeedback = logs.Where(l => !string.IsNullOrEmpty(l.UserFeedback)).ToList();
            if (logsWithFeedback.Count >= 10) // Need sufficient data for meaningful correlation
            {
                stats.CosineScoreCorrelation = CalculateCorrelation(
                    logsWithFeedback.Where(l => l.TopCosineScore.HasValue).Select(l => (double)l.TopCosineScore!.Value).ToList(),
                    logsWithFeedback.Where(l => l.TopCosineScore.HasValue).Select(l => l.UserFeedback == "thumbs_up" ? 1.0 : 0.0).ToList());

                stats.RerankScoreCorrelation = CalculateCorrelation(
                    logsWithFeedback.Where(l => l.TopRerankScore.HasValue).Select(l => (double)l.TopRerankScore!.Value).ToList(),
                    logsWithFeedback.Where(l => l.TopRerankScore.HasValue).Select(l => l.UserFeedback == "thumbs_up" ? 1.0 : 0.0).ToList());
            }

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get RAG performance stats. UserId: {UserId}", userId);
            return stats;
        }
    }

    /// <summary>
    /// Calculate Pearson correlation coefficient between two lists
    /// </summary>
    private double? CalculateCorrelation(List<double> x, List<double> y)
    {
        if (x.Count != y.Count || x.Count < 2)
            return null;

        var n = x.Count;
        var sumX = x.Sum();
        var sumY = y.Sum();
        var sumXY = x.Zip(y, (a, b) => a * b).Sum();
        var sumX2 = x.Sum(a => a * a);
        var sumY2 = y.Sum(b => b * b);

        var numerator = n * sumXY - sumX * sumY;
        var denominator = Math.Sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        if (denominator == 0)
            return null;

        return numerator / denominator;
    }
}

