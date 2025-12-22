namespace SecondBrain.Application.Services.RAG.Models;

/// <summary>
/// User-configurable RAG pipeline options that override default settings.
/// Pass these to RetrieveContextAsync to customize RAG behavior per-user.
/// </summary>
public class RagOptions
{
    /// <summary>
    /// Enable HyDE (Hypothetical Document Embeddings) for query expansion.
    /// When enabled, generates a hypothetical document that would answer the query
    /// and uses its embedding for better semantic search.
    /// </summary>
    public bool? EnableHyDE { get; set; }

    /// <summary>
    /// Enable query expansion with multiple query variations.
    /// When enabled, generates alternative phrasings of the query to improve recall.
    /// </summary>
    public bool? EnableQueryExpansion { get; set; }

    /// <summary>
    /// Enable hybrid search combining vector (semantic) and BM25 (keyword) search.
    /// Results are merged using Reciprocal Rank Fusion (RRF).
    /// </summary>
    public bool? EnableHybridSearch { get; set; }

    /// <summary>
    /// Enable LLM-based reranking of search results.
    /// When enabled, uses an LLM to score relevance and reorder results.
    /// </summary>
    public bool? EnableReranking { get; set; }

    /// <summary>
    /// Enable RAG analytics logging.
    /// When enabled, logs query metrics for analysis and feedback.
    /// </summary>
    public bool? EnableAnalytics { get; set; }

    /// <summary>
    /// Reranking provider to use for reranking search results.
    /// When set to "Cohere", uses Cohere's native rerank API (faster and more accurate).
    /// Other providers (OpenAI, Anthropic, Gemini, Grok) use LLM-based reranking.
    /// </summary>
    public string? RerankingProvider { get; set; }

    // === Tier 1: Core Retrieval Settings ===

    /// <summary>
    /// Number of top results to return after all processing.
    /// </summary>
    public int? TopK { get; set; }

    /// <summary>
    /// Minimum similarity threshold (0-1) for vector search results.
    /// </summary>
    public float? SimilarityThreshold { get; set; }

    /// <summary>
    /// Number of candidates to retrieve before reranking.
    /// </summary>
    public int? InitialRetrievalCount { get; set; }

    /// <summary>
    /// Minimum rerank score (0-10) required to include a result.
    /// </summary>
    public float? MinRerankScore { get; set; }

    // === Tier 2: Hybrid Search Settings ===

    /// <summary>
    /// Weight for vector (semantic) search in hybrid search (0-1).
    /// </summary>
    public float? VectorWeight { get; set; }

    /// <summary>
    /// Weight for BM25 (keyword) search in hybrid search (0-1).
    /// </summary>
    public float? BM25Weight { get; set; }

    /// <summary>
    /// Number of query variations to generate for multi-query expansion.
    /// </summary>
    public int? MultiQueryCount { get; set; }

    /// <summary>
    /// Maximum context length (chars) to assemble for LLM.
    /// </summary>
    public int? MaxContextLength { get; set; }

    /// <summary>
    /// Creates RagOptions from user preferences.
    /// </summary>
    public static RagOptions FromUserPreferences(
        bool? enableHyde = null,
        bool? enableQueryExpansion = null,
        bool? enableHybridSearch = null,
        bool? enableReranking = null,
        bool? enableAnalytics = null,
        string? rerankingProvider = null,
        // Tier 1: Core Retrieval
        int? topK = null,
        float? similarityThreshold = null,
        int? initialRetrievalCount = null,
        float? minRerankScore = null,
        // Tier 2: Hybrid Search
        float? vectorWeight = null,
        float? bm25Weight = null,
        int? multiQueryCount = null,
        int? maxContextLength = null)
    {
        return new RagOptions
        {
            EnableHyDE = enableHyde,
            EnableQueryExpansion = enableQueryExpansion,
            EnableHybridSearch = enableHybridSearch,
            EnableReranking = enableReranking,
            EnableAnalytics = enableAnalytics,
            RerankingProvider = rerankingProvider,
            // Tier 1
            TopK = topK,
            SimilarityThreshold = similarityThreshold,
            InitialRetrievalCount = initialRetrievalCount,
            MinRerankScore = minRerankScore,
            // Tier 2
            VectorWeight = vectorWeight,
            BM25Weight = bm25Weight,
            MultiQueryCount = multiQueryCount,
            MaxContextLength = maxContextLength
        };
    }
}
