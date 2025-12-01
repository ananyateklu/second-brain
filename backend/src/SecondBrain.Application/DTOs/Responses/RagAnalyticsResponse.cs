namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response containing RAG performance statistics
/// </summary>
public class RagPerformanceStatsResponse
{
    /// <summary>
    /// Total number of RAG queries in the period
    /// </summary>
    public int TotalQueries { get; set; }

    /// <summary>
    /// Number of queries that received user feedback
    /// </summary>
    public int QueriesWithFeedback { get; set; }

    /// <summary>
    /// Number of positive (thumbs up) feedback
    /// </summary>
    public int PositiveFeedback { get; set; }

    /// <summary>
    /// Number of negative (thumbs down) feedback
    /// </summary>
    public int NegativeFeedback { get; set; }

    /// <summary>
    /// Rate of positive feedback (0-1)
    /// </summary>
    public double PositiveFeedbackRate { get; set; }

    /// <summary>
    /// Average total response time in milliseconds
    /// </summary>
    public double AvgTotalTimeMs { get; set; }

    /// <summary>
    /// Average number of retrieved documents
    /// </summary>
    public double AvgRetrievedCount { get; set; }

    /// <summary>
    /// Average cosine similarity score
    /// </summary>
    public double AvgCosineScore { get; set; }

    /// <summary>
    /// Average reranking score
    /// </summary>
    public double AvgRerankScore { get; set; }

    /// <summary>
    /// Correlation between cosine score and positive feedback (-1 to 1)
    /// </summary>
    public double? CosineScoreCorrelation { get; set; }

    /// <summary>
    /// Correlation between rerank score and positive feedback (-1 to 1)
    /// </summary>
    public double? RerankScoreCorrelation { get; set; }

    /// <summary>
    /// Period start date for these statistics
    /// </summary>
    public DateTime? PeriodStart { get; set; }

    /// <summary>
    /// Period end date for these statistics
    /// </summary>
    public DateTime PeriodEnd { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Single RAG query log entry for the dashboard
/// </summary>
public class RagQueryLogResponse
{
    public Guid Id { get; set; }
    public string Query { get; set; } = string.Empty;
    public string? ConversationId { get; set; }
    public DateTime CreatedAt { get; set; }

    // Timing
    public int? TotalTimeMs { get; set; }
    public int? QueryEmbeddingTimeMs { get; set; }
    public int? VectorSearchTimeMs { get; set; }
    public int? RerankTimeMs { get; set; }

    // Results
    public int? RetrievedCount { get; set; }
    public int? FinalCount { get; set; }

    // Scores
    public float? TopCosineScore { get; set; }
    public float? AvgCosineScore { get; set; }
    public float? TopRerankScore { get; set; }
    public float? AvgRerankScore { get; set; }

    // Features enabled
    public bool HybridSearchEnabled { get; set; }
    public bool HyDEEnabled { get; set; }
    public bool MultiQueryEnabled { get; set; }
    public bool RerankingEnabled { get; set; }

    // Feedback
    public string? UserFeedback { get; set; }
    public string? FeedbackCategory { get; set; }
    public string? FeedbackComment { get; set; }

    // Topic (for clustering)
    public int? TopicCluster { get; set; }
    public string? TopicLabel { get; set; }
}

/// <summary>
/// Paginated response for RAG query logs
/// </summary>
public class RagQueryLogsResponse
{
    public List<RagQueryLogResponse> Logs { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

/// <summary>
/// Topic statistics for clustering analysis
/// </summary>
public class TopicStatsResponse
{
    public int ClusterId { get; set; }
    public string Label { get; set; } = string.Empty;
    public int QueryCount { get; set; }
    public int PositiveFeedback { get; set; }
    public int NegativeFeedback { get; set; }
    public double PositiveFeedbackRate { get; set; }
    public double AvgCosineScore { get; set; }
    public double AvgRerankScore { get; set; }
    public List<string> SampleQueries { get; set; } = new();
}

/// <summary>
/// Response containing all topic statistics
/// </summary>
public class TopicAnalyticsResponse
{
    public List<TopicStatsResponse> Topics { get; set; } = new();
    public int TotalClustered { get; set; }
    public int TotalUnclustered { get; set; }
    public DateTime? LastClusteredAt { get; set; }
}

