using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Result from native PostgreSQL BM25 search using ts_rank_cd
/// </summary>
public class NativeBM25Result
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
    public float BM25Score { get; set; }
    public string? HighlightedContent { get; set; }
}

/// <summary>
/// Result from native PostgreSQL hybrid search combining vector and BM25 with RRF
/// </summary>
public class NativeHybridSearchResult
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
}

/// <summary>
/// Repository for searching note embeddings for BM25/hybrid search
/// </summary>
public interface INoteEmbeddingSearchRepository
{
    /// <summary>
    /// Gets all note embeddings that have a search vector for full-text search
    /// </summary>
    Task<IEnumerable<NoteEmbedding>> GetWithSearchVectorAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets note embeddings for a specific user that have a search vector
    /// </summary>
    Task<IEnumerable<NoteEmbedding>> GetByUserIdWithSearchVectorAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Performs native PostgreSQL BM25 search using ts_rank_cd for ranking.
    /// This is more efficient than in-memory BM25 scoring for large datasets.
    /// </summary>
    Task<List<NativeBM25Result>> SearchWithNativeBM25Async(
        string query,
        string userId,
        int topK,
        bool includeHighlights = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Performs native PostgreSQL hybrid search combining vector similarity and BM25 full-text search
    /// using Reciprocal Rank Fusion (RRF) in a single database query.
    ///
    /// This is optimized for PostgreSQL 18 with Async I/O and parallel query execution.
    /// Supports variable embedding dimensions (768, 1024, 1536, 3072) for different providers.
    /// </summary>
    /// <param name="query">The text query for BM25 search</param>
    /// <param name="queryEmbedding">The embedding vector for similarity search</param>
    /// <param name="userId">User ID to filter results</param>
    /// <param name="topK">Number of results to return</param>
    /// <param name="embeddingDimensions">The dimension of the query embedding (768, 1024, 1536, or 3072).
    /// Used to filter stored embeddings to matching dimensions and optimize index usage.</param>
    /// <param name="initialRetrievalCount">Number of results to retrieve from each source before fusion</param>
    /// <param name="vectorWeight">Weight for vector search in RRF (0.0-1.0)</param>
    /// <param name="bm25Weight">Weight for BM25 search in RRF (0.0-1.0)</param>
    /// <param name="rrfConstant">RRF constant k (default 60)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of hybrid search results sorted by RRF score</returns>
    Task<List<NativeHybridSearchResult>> SearchWithNativeHybridAsync(
        string query,
        List<double> queryEmbedding,
        string userId,
        int topK,
        int embeddingDimensions = 1536,
        int initialRetrievalCount = 20,
        float vectorWeight = 0.7f,
        float bm25Weight = 0.3f,
        int rrfConstant = 60,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the embedding dimensions and model info for a user's stored embeddings.
    /// Returns the most common dimensions/model if multiple exist.
    /// Used to match query embeddings to stored embeddings for correct vector comparison.
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Tuple of (dimensions, model) or null if no embeddings exist</returns>
    Task<(int Dimensions, string? Model)?> GetUserEmbeddingInfoAsync(
        string userId,
        CancellationToken cancellationToken = default);
}

