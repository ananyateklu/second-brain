using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;

namespace SecondBrain.Infrastructure.Repositories;

/// <summary>
/// SQL implementation of note embedding search repository for BM25/hybrid search
/// </summary>
public class SqlNoteEmbeddingSearchRepository : INoteEmbeddingSearchRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlNoteEmbeddingSearchRepository> _logger;

    public SqlNoteEmbeddingSearchRepository(
        ApplicationDbContext context,
        ILogger<SqlNoteEmbeddingSearchRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<NoteEmbedding>> GetWithSearchVectorAsync(CancellationToken cancellationToken = default)
    {
        return await _context.NoteEmbeddings
            .Where(e => e.SearchVector != null)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<NoteEmbedding>> GetByUserIdWithSearchVectorAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _context.NoteEmbeddings
            .Where(e => e.UserId == userId && e.SearchVector != null)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Performs native PostgreSQL BM25 search using ts_rank_cd for ranking.
    /// Uses native PostgreSQL full-text search with cover density ranking.
    /// </summary>
    public async Task<List<NativeBM25Result>> SearchWithNativeBM25Async(
        string query,
        string userId,
        int topK,
        bool includeHighlights = false,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new List<NativeBM25Result>();
        }

        try
        {
            var sanitizedQuery = SanitizeQueryForTsQuery(query);
            if (string.IsNullOrWhiteSpace(sanitizedQuery))
            {
                _logger.LogWarning("Query sanitization resulted in empty string. Original: {Query}", query);
                return new List<NativeBM25Result>();
            }

            string sql;
            if (includeHighlights)
            {
                // Include ts_headline for highlighted snippets
                sql = @"
                    SELECT 
                        ne.id,
                        ne.note_id,
                        ne.content,
                        ne.note_title,
                        ne.note_tags,
                        ne.note_summary,
                        ne.chunk_index,
                        ts_rank_cd(ne.search_vector, query, 32) AS bm25_score,
                        ts_headline(
                            'english',
                            ne.content,
                            query,
                            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25, MaxFragments=3'
                        ) AS highlighted_content
                    FROM note_embeddings ne,
                         plainto_tsquery('english', @query) query
                    WHERE ne.user_id = @userId
                      AND ne.search_vector @@ query
                    ORDER BY bm25_score DESC
                    LIMIT @topK";
            }
            else
            {
                // Without highlights (faster)
                sql = @"
                    SELECT 
                        ne.id,
                        ne.note_id,
                        ne.content,
                        ne.note_title,
                        ne.note_tags,
                        ne.note_summary,
                        ne.chunk_index,
                        ts_rank_cd(
                            ne.search_vector,
                            plainto_tsquery('english', @query),
                            32
                        ) AS bm25_score,
                        NULL AS highlighted_content
                    FROM note_embeddings ne
                    WHERE ne.user_id = @userId
                      AND ne.search_vector @@ plainto_tsquery('english', @query)
                    ORDER BY bm25_score DESC
                    LIMIT @topK";
            }

            var connection = _context.Database.GetDbConnection();
            await using var command = (NpgsqlCommand)connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.Add(new NpgsqlParameter("@query", NpgsqlDbType.Text) { Value = sanitizedQuery });
            command.Parameters.Add(new NpgsqlParameter("@userId", NpgsqlDbType.Text) { Value = userId });
            command.Parameters.Add(new NpgsqlParameter("@topK", NpgsqlDbType.Integer) { Value = topK });

            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync(cancellationToken);
            }

            var results = new List<NativeBM25Result>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                var noteTags = new List<string>();
                if (!reader.IsDBNull(4))
                {
                    var tagsArray = reader.GetFieldValue<string[]>(4);
                    if (tagsArray != null)
                    {
                        noteTags = tagsArray.ToList();
                    }
                }

                results.Add(new NativeBM25Result
                {
                    Id = reader.GetString(0),
                    NoteId = reader.GetString(1),
                    Content = reader.GetString(2),
                    NoteTitle = reader.GetString(3),
                    NoteTags = noteTags,
                    NoteSummary = reader.IsDBNull(5) ? null : reader.GetString(5),
                    ChunkIndex = reader.GetInt32(6),
                    BM25Score = reader.GetFloat(7),
                    HighlightedContent = reader.IsDBNull(8) ? null : reader.GetString(8)
                });
            }

            _logger.LogInformation(
                "Native BM25 search completed. UserId: {UserId}, Query: {Query}, Results: {ResultCount}",
                userId, query, results.Count);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Native BM25 search failed. UserId: {UserId}, Query: {Query}", userId, query);
            return new List<NativeBM25Result>();
        }
    }

    /// <summary>
    /// Performs native PostgreSQL hybrid search combining vector similarity and BM25 full-text search
    /// using Reciprocal Rank Fusion (RRF) in a single database query.
    ///
    /// This leverages PostgreSQL 18 optimizations:
    /// - Async I/O for parallel CTE execution
    /// - HNSW index for fast vector search
    /// - GIN index for fast full-text search
    /// - Single round-trip to database
    ///
    /// Supports variable embedding dimensions (768, 1024, 1536, 3072) for different providers:
    /// - 1536 dims: Uses halfvec quantization for 50% memory savings (OpenAI)
    /// - Other dims: Uses full-precision vectors (Gemini 768, Ollama 768/1024, Cohere 1024)
    /// </summary>
    public async Task<List<NativeHybridSearchResult>> SearchWithNativeHybridAsync(
        string query,
        List<double> queryEmbedding,
        string userId,
        int topK,
        int embeddingDimensions = 1536,
        int initialRetrievalCount = 20,
        float vectorWeight = 0.7f,
        float bm25Weight = 0.3f,
        int rrfConstant = 60,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query) || queryEmbedding == null || queryEmbedding.Count == 0)
        {
            _logger.LogWarning("Native hybrid search called with empty query or embedding");
            return new List<NativeHybridSearchResult>();
        }

        try
        {
            var sanitizedQuery = SanitizeQueryForTsQuery(query);
            if (string.IsNullOrWhiteSpace(sanitizedQuery))
            {
                _logger.LogWarning("Query sanitization resulted in empty string. Original: {Query}", query);
                // Fall back to vector-only search if query sanitizes to empty
                return await VectorOnlySearchAsync(queryEmbedding, userId, topK, embeddingDimensions, cancellationToken);
            }

            _logger.LogInformation(
                "Starting native hybrid search. UserId: {UserId}, Query: {Query}, TopK: {TopK}, Dimensions: {Dimensions}, VectorWeight: {VectorWeight}, BM25Weight: {BM25Weight}",
                userId, query.Substring(0, Math.Min(50, query.Length)), topK, embeddingDimensions, vectorWeight, bm25Weight);

            // Convert embedding to PostgreSQL vector string format
            var embeddingString = "[" + string.Join(",", queryEmbedding) + "]";

            // Build dimension-aware vector comparison SQL
            // For 1536 dims: use halfvec quantization for 50% memory savings (pgvector 0.7+)
            // For other dims: use full-precision vector comparison
            var vectorDistanceExpr = embeddingDimensions == 1536
                ? "embedding::halfvec(1536) <=> @queryEmbedding::halfvec(1536)"
                : "embedding <=> @queryEmbedding::vector";

            var vectorScoreExpr = embeddingDimensions == 1536
                ? "1 - (embedding::halfvec(1536) <=> @queryEmbedding::halfvec(1536))"
                : "1 - (embedding <=> @queryEmbedding::vector)";

            // Native hybrid search SQL using CTEs and RRF
            // This executes both searches and fuses results in a single query
            // Filters by embedding_dimensions to only compare vectors of matching size
            var sql = $@"
                WITH vector_results AS (
                    SELECT
                        id,
                        note_id,
                        content,
                        note_title,
                        note_tags,
                        note_summary,
                        chunk_index,
                        {vectorScoreExpr} AS vector_score,
                        ROW_NUMBER() OVER (ORDER BY {vectorDistanceExpr}) AS vector_rank
                    FROM note_embeddings
                    WHERE user_id = @userId
                      AND embedding IS NOT NULL
                      AND embedding_dimensions = @embeddingDimensions
                    ORDER BY {vectorDistanceExpr}
                    LIMIT @initialK
                ),
                bm25_results AS (
                    SELECT
                        id,
                        note_id,
                        content,
                        note_title,
                        note_tags,
                        note_summary,
                        chunk_index,
                        ts_rank_cd(search_vector, plainto_tsquery('english', @query), 32) AS bm25_score,
                        ROW_NUMBER() OVER (
                            ORDER BY ts_rank_cd(search_vector, plainto_tsquery('english', @query), 32) DESC
                        ) AS bm25_rank
                    FROM note_embeddings
                    WHERE user_id = @userId
                      AND search_vector IS NOT NULL
                      AND search_vector @@ plainto_tsquery('english', @query)
                      AND embedding_dimensions = @embeddingDimensions
                    ORDER BY bm25_score DESC
                    LIMIT @initialK
                )
                SELECT 
                    COALESCE(v.id, b.id) AS id,
                    COALESCE(v.note_id, b.note_id) AS note_id,
                    COALESCE(v.content, b.content) AS content,
                    COALESCE(v.note_title, b.note_title) AS note_title,
                    COALESCE(v.note_tags, b.note_tags) AS note_tags,
                    COALESCE(v.note_summary, b.note_summary) AS note_summary,
                    COALESCE(v.chunk_index, b.chunk_index) AS chunk_index,
                    COALESCE(v.vector_score, 0)::real AS vector_score,
                    COALESCE(b.bm25_score, 0)::real AS bm25_score,
                    COALESCE(v.vector_rank, 1000)::int AS vector_rank,
                    COALESCE(b.bm25_rank, 1000)::int AS bm25_rank,
                    -- RRF Score: weighted sum of 1/(k+rank) for each ranking
                    (COALESCE(1.0 / (@rrfK + v.vector_rank), 0) * @vectorWeight +
                     COALESCE(1.0 / (@rrfK + b.bm25_rank), 0) * @bm25Weight)::real AS rrf_score,
                    v.id IS NOT NULL AS found_in_vector,
                    b.id IS NOT NULL AS found_in_bm25
                FROM vector_results v
                FULL OUTER JOIN bm25_results b ON v.id = b.id
                ORDER BY rrf_score DESC
                LIMIT @topK";

            var connection = _context.Database.GetDbConnection();
            await using var command = (NpgsqlCommand)connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.Add(new NpgsqlParameter("@queryEmbedding", NpgsqlDbType.Text) { Value = embeddingString });
            command.Parameters.Add(new NpgsqlParameter("@query", NpgsqlDbType.Text) { Value = sanitizedQuery });
            command.Parameters.Add(new NpgsqlParameter("@userId", NpgsqlDbType.Text) { Value = userId });
            command.Parameters.Add(new NpgsqlParameter("@embeddingDimensions", NpgsqlDbType.Integer) { Value = embeddingDimensions });
            command.Parameters.Add(new NpgsqlParameter("@initialK", NpgsqlDbType.Integer) { Value = initialRetrievalCount });
            command.Parameters.Add(new NpgsqlParameter("@topK", NpgsqlDbType.Integer) { Value = topK });
            command.Parameters.Add(new NpgsqlParameter("@rrfK", NpgsqlDbType.Integer) { Value = rrfConstant });
            command.Parameters.Add(new NpgsqlParameter("@vectorWeight", NpgsqlDbType.Real) { Value = vectorWeight });
            command.Parameters.Add(new NpgsqlParameter("@bm25Weight", NpgsqlDbType.Real) { Value = bm25Weight });

            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync(cancellationToken);
            }

            var results = new List<NativeHybridSearchResult>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                var noteTags = new List<string>();
                if (!reader.IsDBNull(4))
                {
                    var tagsArray = reader.GetFieldValue<string[]>(4);
                    if (tagsArray != null)
                    {
                        noteTags = tagsArray.ToList();
                    }
                }

                results.Add(new NativeHybridSearchResult
                {
                    Id = reader.GetString(0),
                    NoteId = reader.GetString(1),
                    Content = reader.GetString(2),
                    NoteTitle = reader.GetString(3),
                    NoteTags = noteTags,
                    NoteSummary = reader.IsDBNull(5) ? null : reader.GetString(5),
                    ChunkIndex = reader.GetInt32(6),
                    VectorScore = reader.GetFloat(7),
                    BM25Score = reader.GetFloat(8),
                    VectorRank = reader.GetInt32(9),
                    BM25Rank = reader.GetInt32(10),
                    RRFScore = reader.GetFloat(11),
                    FoundInVectorSearch = reader.GetBoolean(12),
                    FoundInBM25Search = reader.GetBoolean(13)
                });
            }

            // Log fusion statistics
            var bothSources = results.Count(r => r.FoundInVectorSearch && r.FoundInBM25Search);
            var vectorOnly = results.Count(r => r.FoundInVectorSearch && !r.FoundInBM25Search);
            var bm25Only = results.Count(r => !r.FoundInVectorSearch && r.FoundInBM25Search);

            _logger.LogInformation(
                "Native hybrid search completed. UserId: {UserId}, Results: {ResultCount}, BothSources: {Both}, VectorOnly: {Vector}, BM25Only: {BM25}, TopRRF: {TopRRF:F4}",
                userId, results.Count, bothSources, vectorOnly, bm25Only, results.FirstOrDefault()?.RRFScore ?? 0);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Native hybrid search failed. UserId: {UserId}, Query: {Query}", userId, query);
            return new List<NativeHybridSearchResult>();
        }
    }

    /// <summary>
    /// Fallback to vector-only search when BM25 query is empty.
    /// Supports variable embedding dimensions (768, 1024, 1536, 3072).
    /// Uses halfvec quantization for 1536 dims, full-precision for others.
    /// </summary>
    private async Task<List<NativeHybridSearchResult>> VectorOnlySearchAsync(
        List<double> queryEmbedding,
        string userId,
        int topK,
        int embeddingDimensions,
        CancellationToken cancellationToken)
    {
        try
        {
            var embeddingString = "[" + string.Join(",", queryEmbedding) + "]";

            // Build dimension-aware vector comparison SQL
            // For 1536 dims: use halfvec quantization for 50% memory savings
            // For other dims: use full-precision vector comparison
            var vectorDistanceExpr = embeddingDimensions == 1536
                ? "embedding::halfvec(1536) <=> @queryEmbedding::halfvec(1536)"
                : "embedding <=> @queryEmbedding::vector";

            var vectorScoreExpr = embeddingDimensions == 1536
                ? "1 - (embedding::halfvec(1536) <=> @queryEmbedding::halfvec(1536))"
                : "1 - (embedding <=> @queryEmbedding::vector)";

            var sql = $@"
                SELECT
                    id,
                    note_id,
                    content,
                    note_title,
                    note_tags,
                    note_summary,
                    chunk_index,
                    {vectorScoreExpr} AS vector_score,
                    ROW_NUMBER() OVER (ORDER BY {vectorDistanceExpr}) AS vector_rank
                FROM note_embeddings
                WHERE user_id = @userId
                  AND embedding IS NOT NULL
                  AND embedding_dimensions = @embeddingDimensions
                ORDER BY {vectorDistanceExpr}
                LIMIT @topK";

            var connection = _context.Database.GetDbConnection();
            await using var command = (NpgsqlCommand)connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.Add(new NpgsqlParameter("@queryEmbedding", NpgsqlDbType.Text) { Value = embeddingString });
            command.Parameters.Add(new NpgsqlParameter("@userId", NpgsqlDbType.Text) { Value = userId });
            command.Parameters.Add(new NpgsqlParameter("@embeddingDimensions", NpgsqlDbType.Integer) { Value = embeddingDimensions });
            command.Parameters.Add(new NpgsqlParameter("@topK", NpgsqlDbType.Integer) { Value = topK });

            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync(cancellationToken);
            }

            var results = new List<NativeHybridSearchResult>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                var noteTags = new List<string>();
                if (!reader.IsDBNull(4))
                {
                    var tagsArray = reader.GetFieldValue<string[]>(4);
                    if (tagsArray != null)
                    {
                        noteTags = tagsArray.ToList();
                    }
                }

                results.Add(new NativeHybridSearchResult
                {
                    Id = reader.GetString(0),
                    NoteId = reader.GetString(1),
                    Content = reader.GetString(2),
                    NoteTitle = reader.GetString(3),
                    NoteTags = noteTags,
                    NoteSummary = reader.IsDBNull(5) ? null : reader.GetString(5),
                    ChunkIndex = reader.GetInt32(6),
                    VectorScore = reader.GetFloat(7),
                    BM25Score = 0,
                    VectorRank = reader.GetInt32(8),
                    BM25Rank = 0,
                    RRFScore = reader.GetFloat(7), // Use vector score directly
                    FoundInVectorSearch = true,
                    FoundInBM25Search = false
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Vector-only search fallback failed. UserId: {UserId}", userId);
            return new List<NativeHybridSearchResult>();
        }
    }

    /// <summary>
    /// Gets the embedding dimensions and model info for a user's stored embeddings.
    /// Returns the most common dimensions/model combination if multiple exist.
    /// This allows RAG search to use matching dimensions for query embeddings.
    /// </summary>
    public async Task<(int Dimensions, string? Model)?> GetUserEmbeddingInfoAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Get the most common (dimensions, model) combination for this user
            // This handles cases where a user re-indexes with a different model
            var sql = @"
                SELECT
                    embedding_dimensions,
                    embedding_model,
                    COUNT(*) as count
                FROM note_embeddings
                WHERE user_id = @userId
                  AND embedding IS NOT NULL
                  AND embedding_dimensions IS NOT NULL
                GROUP BY embedding_dimensions, embedding_model
                ORDER BY count DESC
                LIMIT 1";

            var connection = _context.Database.GetDbConnection();
            await using var command = (NpgsqlCommand)connection.CreateCommand();
            command.CommandText = sql;
            command.Parameters.Add(new NpgsqlParameter("@userId", NpgsqlDbType.Text) { Value = userId });

            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync(cancellationToken);
            }

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            if (await reader.ReadAsync(cancellationToken))
            {
                var dimensions = reader.GetInt32(0);
                var model = reader.IsDBNull(1) ? null : reader.GetString(1);

                _logger.LogDebug(
                    "User embedding info retrieved. UserId: {UserId}, Dimensions: {Dimensions}, Model: {Model}",
                    userId, dimensions, model ?? "unknown");

                return (dimensions, model);
            }

            _logger.LogDebug("No embeddings found for user. UserId: {UserId}", userId);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get user embedding info. UserId: {UserId}", userId);
            return null;
        }
    }

    /// <summary>
    /// Sanitizes the query string for use with PostgreSQL plainto_tsquery
    /// </summary>
    private static string SanitizeQueryForTsQuery(string query)
    {
        // Remove special characters that could break tsquery parsing
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

