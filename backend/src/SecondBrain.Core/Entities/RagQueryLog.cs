using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Core.Entities;

/// <summary>
/// Entity for tracking RAG query analytics and observability.
/// Used to correlate retrieval metrics with user feedback for data-driven optimization.
/// </summary>
[Table("rag_query_logs")]
public class RagQueryLog
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    [MaxLength(255)]
    public string UserId { get; set; } = string.Empty;

    [Column("conversation_id")]
    [MaxLength(255)]
    public string? ConversationId { get; set; }

    [Required]
    [Column("query")]
    public string Query { get; set; } = string.Empty;

    // Timing metrics (in milliseconds)
    [Column("query_embedding_time_ms")]
    public int? QueryEmbeddingTimeMs { get; set; }

    [Column("vector_search_time_ms")]
    public int? VectorSearchTimeMs { get; set; }

    [Column("bm25_search_time_ms")]
    public int? BM25SearchTimeMs { get; set; }

    [Column("rerank_time_ms")]
    public int? RerankTimeMs { get; set; }

    [Column("total_time_ms")]
    public int? TotalTimeMs { get; set; }

    // Result metrics
    [Column("retrieved_count")]
    public int? RetrievedCount { get; set; }

    [Column("final_count")]
    public int? FinalCount { get; set; }

    // Score metrics for correlation analysis
    [Column("avg_cosine_score")]
    public float? AvgCosineScore { get; set; }

    [Column("avg_bm25_score")]
    public float? AvgBM25Score { get; set; }

    [Column("avg_rerank_score")]
    public float? AvgRerankScore { get; set; }

    [Column("top_cosine_score")]
    public float? TopCosineScore { get; set; }

    [Column("top_rerank_score")]
    public float? TopRerankScore { get; set; }

    // Feature flags for this query
    [Column("hybrid_search_enabled")]
    public bool HybridSearchEnabled { get; set; } = true;

    [Column("hyde_enabled")]
    public bool HyDEEnabled { get; set; }

    [Column("multi_query_enabled")]
    public bool MultiQueryEnabled { get; set; }

    [Column("reranking_enabled")]
    public bool RerankingEnabled { get; set; }

    // User feedback (critical for improvement analysis)
    [Column("user_feedback")]
    [MaxLength(20)]
    public string? UserFeedback { get; set; } // 'thumbs_up', 'thumbs_down'

    [Column("feedback_category")]
    [MaxLength(50)]
    public string? FeedbackCategory { get; set; } // 'wrong_info', 'missing_context', 'irrelevant'

    [Column("feedback_comment")]
    public string? FeedbackComment { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Topic clustering for query analysis
    [Column("topic_cluster")]
    public int? TopicCluster { get; set; }

    [Column("topic_label")]
    [MaxLength(100)]
    public string? TopicLabel { get; set; }

    // Query embedding for clustering (stored as JSON array)
    [Column("query_embedding")]
    public string? QueryEmbeddingJson { get; set; }
}

