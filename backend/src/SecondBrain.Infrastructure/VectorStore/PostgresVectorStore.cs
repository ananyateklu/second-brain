using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;
using Pgvector;
using Pgvector.EntityFrameworkCore;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;
using SecondBrain.Infrastructure.Data;

namespace SecondBrain.Infrastructure.VectorStore;

/// <summary>
/// Result of a MERGE upsert operation
/// </summary>
public record MergeUpsertResult(bool Success, bool WasInsert, string? Id, string? Action);

public class PostgresVectorStore : IVectorStore
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PostgresVectorStore> _logger;

    public PostgresVectorStore(
        ApplicationDbContext context,
        ILogger<PostgresVectorStore> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Upsert embedding using PostgreSQL 18 MERGE statement for atomic operations.
    /// This is more efficient than separate SELECT + INSERT/UPDATE as it's a single atomic operation.
    /// </summary>
    public async Task<MergeUpsertResult> UpsertWithMergeAsync(
        NoteEmbedding embedding,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var embeddingId = string.IsNullOrEmpty(embedding.Id) ? UuidV7.NewId() : embedding.Id;

            // PostgreSQL 18 MERGE statement with RETURNING
            var sql = @"
                MERGE INTO note_embeddings AS target
                USING (SELECT 
                    @id AS id, 
                    @noteId AS note_id, 
                    @userId AS user_id,
                    @chunkIndex AS chunk_index, 
                    @content AS content, 
                    @embedding AS embedding,
                    @provider AS embedding_provider, 
                    @model AS embedding_model, 
                    @noteTitle AS note_title,
                    @noteTags AS note_tags,
                    @noteSummary AS note_summary,
                    @noteUpdatedAt AS note_updated_at
                ) AS source
                ON target.id = source.id
                WHEN MATCHED THEN
                    UPDATE SET
                        note_id = source.note_id,
                        user_id = source.user_id,
                        chunk_index = source.chunk_index,
                        content = source.content,
                        embedding = source.embedding,
                        embedding_provider = source.embedding_provider,
                        embedding_model = source.embedding_model,
                        note_title = source.note_title,
                        note_tags = source.note_tags,
                        note_summary = source.note_summary,
                        note_updated_at = source.note_updated_at,
                        search_vector = setweight(to_tsvector('english', COALESCE(source.note_title, '')), 'A') ||
                                       setweight(to_tsvector('english', COALESCE(source.content, '')), 'B')
                WHEN NOT MATCHED THEN
                    INSERT (id, note_id, user_id, chunk_index, content, embedding,
                            embedding_provider, embedding_model, note_title, note_tags,
                            note_summary, note_updated_at, created_at, search_vector)
                    VALUES (source.id, source.note_id, source.user_id, source.chunk_index,
                            source.content, source.embedding, source.embedding_provider,
                            source.embedding_model, source.note_title, source.note_tags,
                            source.note_summary, source.note_updated_at, NOW(),
                            setweight(to_tsvector('english', COALESCE(source.note_title, '')), 'A') ||
                            setweight(to_tsvector('english', COALESCE(source.content, '')), 'B'))
                RETURNING merge_action() AS action, id";

            var connection = _context.Database.GetDbConnection();
            await using var command = (NpgsqlCommand)connection.CreateCommand();
            command.CommandText = sql;

            // Convert embedding to float array for pgvector
            float[]? embeddingArray = null;
            if (embedding.Embedding != null)
            {
                embeddingArray = embedding.Embedding.ToArray();
            }

            command.Parameters.Add(new NpgsqlParameter("@id", NpgsqlDbType.Text) { Value = embeddingId });
            command.Parameters.Add(new NpgsqlParameter("@noteId", NpgsqlDbType.Varchar) { Value = embedding.NoteId });
            command.Parameters.Add(new NpgsqlParameter("@userId", NpgsqlDbType.Varchar) { Value = embedding.UserId });
            command.Parameters.Add(new NpgsqlParameter("@chunkIndex", NpgsqlDbType.Integer) { Value = embedding.ChunkIndex });
            command.Parameters.Add(new NpgsqlParameter("@content", NpgsqlDbType.Text) { Value = embedding.Content });
            command.Parameters.Add(new NpgsqlParameter("@embedding", NpgsqlDbType.Array | NpgsqlDbType.Real) { Value = embeddingArray ?? (object)DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("@provider", NpgsqlDbType.Varchar) { Value = embedding.EmbeddingProvider });
            command.Parameters.Add(new NpgsqlParameter("@model", NpgsqlDbType.Varchar) { Value = embedding.EmbeddingModel });
            command.Parameters.Add(new NpgsqlParameter("@noteTitle", NpgsqlDbType.Varchar) { Value = embedding.NoteTitle });
            command.Parameters.Add(new NpgsqlParameter("@noteTags", NpgsqlDbType.Array | NpgsqlDbType.Text) { Value = embedding.NoteTags?.ToArray() ?? Array.Empty<string>() });
            command.Parameters.Add(new NpgsqlParameter("@noteSummary", NpgsqlDbType.Text) { Value = embedding.NoteSummary ?? (object)DBNull.Value });
            command.Parameters.Add(new NpgsqlParameter("@noteUpdatedAt", NpgsqlDbType.TimestampTz) { Value = embedding.NoteUpdatedAt });

            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync(cancellationToken);
            }

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            if (await reader.ReadAsync(cancellationToken))
            {
                var action = reader.GetString(0);
                var id = reader.GetString(1);
                var wasInsert = action.Equals("INSERT", StringComparison.OrdinalIgnoreCase);

                _logger.LogDebug("MERGE upsert completed. Action: {Action}, Id: {Id}", action, id);
                return new MergeUpsertResult(true, wasInsert, id, action);
            }

            return new MergeUpsertResult(false, false, null, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MERGE upsert failed for embedding. EmbeddingId: {EmbeddingId}", embedding.Id);
            return new MergeUpsertResult(false, false, null, null);
        }
    }

    /// <summary>
    /// Batch upsert using PostgreSQL 18 MERGE with a staging approach.
    /// More efficient than individual MERGE operations for multiple embeddings.
    /// </summary>
    public async Task<int> UpsertBatchWithMergeAsync(
        IEnumerable<NoteEmbedding> embeddings,
        CancellationToken cancellationToken = default)
    {
        var embeddingsList = embeddings.ToList();
        if (embeddingsList.Count == 0)
        {
            return 0;
        }

        int successCount = 0;

        try
        {
            // For batch operations, we use individual MERGE calls but within a transaction
            // This is more reliable than complex staging table approaches
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            foreach (var embedding in embeddingsList)
            {
                var result = await UpsertWithMergeAsync(embedding, cancellationToken);
                if (result.Success)
                {
                    successCount++;
                }
            }

            await transaction.CommitAsync(cancellationToken);

            _logger.LogInformation(
                "Batch MERGE upsert completed. Total: {Total}, Success: {Success}",
                embeddingsList.Count, successCount);

            return successCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Batch MERGE upsert failed. Processed: {Processed}/{Total}",
                successCount, embeddingsList.Count);
            return successCount;
        }
    }

    public async Task<bool> UpsertAsync(
        NoteEmbedding embedding,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var existingEmbedding = await _context.NoteEmbeddings
                .FirstOrDefaultAsync(e => e.Id == embedding.Id, cancellationToken);

            if (existingEmbedding != null)
            {
                // Update existing
                existingEmbedding.NoteId = embedding.NoteId;
                existingEmbedding.UserId = embedding.UserId;
                existingEmbedding.ChunkIndex = embedding.ChunkIndex;
                existingEmbedding.Content = embedding.Content;
                existingEmbedding.Embedding = embedding.Embedding;
                existingEmbedding.EmbeddingProvider = embedding.EmbeddingProvider;
                existingEmbedding.EmbeddingModel = embedding.EmbeddingModel;
                existingEmbedding.NoteTitle = embedding.NoteTitle;
                existingEmbedding.NoteTags = embedding.NoteTags;
                existingEmbedding.NoteSummary = embedding.NoteSummary;
                existingEmbedding.NoteUpdatedAt = embedding.NoteUpdatedAt;
            }
            else
            {
                // Create new
                if (string.IsNullOrEmpty(embedding.Id))
                {
                    embedding.Id = UuidV7.NewId();
                }
                embedding.CreatedAt = DateTime.UtcNow;
                _context.NoteEmbeddings.Add(embedding);
            }

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upserting embedding. EmbeddingId: {EmbeddingId}", embedding.Id);
            return false;
        }
    }

    public async Task<bool> UpsertBatchAsync(
        IEnumerable<NoteEmbedding> embeddings,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var embeddingsList = embeddings.ToList();
            var now = DateTime.UtcNow;

            foreach (var embedding in embeddingsList)
            {
                var existingEmbedding = await _context.NoteEmbeddings
                    .FirstOrDefaultAsync(e => e.Id == embedding.Id, cancellationToken);

                if (existingEmbedding != null)
                {
                    existingEmbedding.NoteId = embedding.NoteId;
                    existingEmbedding.UserId = embedding.UserId;
                    existingEmbedding.ChunkIndex = embedding.ChunkIndex;
                    existingEmbedding.Content = embedding.Content;
                    existingEmbedding.Embedding = embedding.Embedding;
                    existingEmbedding.EmbeddingProvider = embedding.EmbeddingProvider;
                    existingEmbedding.EmbeddingModel = embedding.EmbeddingModel;
                    existingEmbedding.NoteTitle = embedding.NoteTitle;
                    existingEmbedding.NoteTags = embedding.NoteTags;
                    existingEmbedding.NoteSummary = embedding.NoteSummary;
                    existingEmbedding.NoteUpdatedAt = embedding.NoteUpdatedAt;
                }
                else
                {
                    if (string.IsNullOrEmpty(embedding.Id))
                    {
                        embedding.Id = UuidV7.NewId();
                    }
                    embedding.CreatedAt = now;
                    _context.NoteEmbeddings.Add(embedding);
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Successfully upserted {Count} embeddings", embeddingsList.Count);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error upserting batch embeddings");
            return false;
        }
    }

    public async Task<List<VectorSearchResult>> SearchAsync(
        List<double> queryEmbedding,
        string userId,
        int topK,
        float similarityThreshold = 0.7f,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation(
                "Starting vector search. UserId: {UserId}, TopK: {TopK}, Threshold: {Threshold}, QueryEmbeddingDimensions: {Dimensions}",
                userId, topK, similarityThreshold, queryEmbedding.Count);

            // Convert query embedding to pgvector Vector type
            var queryVector = new Vector(queryEmbedding.Select(d => (float)d).ToArray());

            // Use pgvector's cosine distance operator for similarity search
            // Note: Cosine distance = 1 - cosine similarity, so we convert threshold
            var distanceThreshold = 1 - similarityThreshold;

            var results = await _context.NoteEmbeddings
                .Where(e => e.Embedding != null)
                .Select(e => new
                {
                    Embedding = e,
                    Distance = e.Embedding!.CosineDistance(queryVector)
                })
                .Where(x => x.Distance <= distanceThreshold)
                .OrderBy(x => x.Distance)
                .Take(topK)
                .ToListAsync(cancellationToken);

            _logger.LogInformation(
                "Vector search completed. UserId: {UserId}, Results: {ResultCount}",
                userId, results.Count);

            return results.Select(r => new VectorSearchResult
            {
                Id = r.Embedding.Id,
                NoteId = r.Embedding.NoteId,
                Content = r.Embedding.Content,
                NoteTitle = r.Embedding.NoteTitle,
                NoteTags = r.Embedding.NoteTags,
                NoteSummary = r.Embedding.NoteSummary,
                ChunkIndex = r.Embedding.ChunkIndex,
                SimilarityScore = 1 - (float)r.Distance, // Convert distance back to similarity
                Metadata = new Dictionary<string, object>
                {
                    { "embeddingProvider", r.Embedding.EmbeddingProvider },
                    { "embeddingModel", r.Embedding.EmbeddingModel },
                    { "createdAt", r.Embedding.CreatedAt }
                }
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching vectors. UserId: {UserId}", userId);
            return new List<VectorSearchResult>();
        }
    }

    public async Task<bool> DeleteByNoteIdAsync(
        string noteId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var embeddings = await _context.NoteEmbeddings
                .Where(e => e.NoteId == noteId)
                .ToListAsync(cancellationToken);

            if (embeddings.Count == 0)
            {
                _logger.LogInformation("No embeddings found to delete for note. NoteId: {NoteId}", noteId);
                return true;
            }

            _context.NoteEmbeddings.RemoveRange(embeddings);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Deleted embeddings for note. NoteId: {NoteId}, Count: {Count}",
                noteId, embeddings.Count);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting embeddings by note ID. NoteId: {NoteId}", noteId);
            return false;
        }
    }

    public async Task<bool> DeleteByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var embeddings = await _context.NoteEmbeddings
                .Where(e => e.UserId == userId)
                .ToListAsync(cancellationToken);

            if (embeddings.Count == 0)
            {
                _logger.LogInformation("No embeddings found to delete for user. UserId: {UserId}", userId);
                return true;
            }

            _context.NoteEmbeddings.RemoveRange(embeddings);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Deleted embeddings for user. UserId: {UserId}, Count: {Count}",
                userId, embeddings.Count);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting embeddings by user ID. UserId: {UserId}", userId);
            return false;
        }
    }

    public async Task<IndexStats> GetIndexStatsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var embeddings = await _context.NoteEmbeddings
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            var uniqueNotes = embeddings.Select(e => e.NoteId).Distinct().Count();
            var lastIndexed = embeddings.Count > 0
                ? embeddings.Max(e => e.CreatedAt)
                : (DateTime?)null;
            var provider = embeddings.FirstOrDefault()?.EmbeddingProvider ?? string.Empty;

            return new IndexStats
            {
                UserId = userId,
                TotalEmbeddings = embeddings.Count,
                UniqueNotes = uniqueNotes,
                LastIndexedAt = lastIndexed,
                EmbeddingProvider = provider,
                VectorStoreProvider = "PostgreSQL"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting index stats. UserId: {UserId}", userId);
            return new IndexStats { UserId = userId };
        }
    }

    public async Task<DateTime?> GetNoteUpdatedAtAsync(
        string noteId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Get the first chunk's NoteUpdatedAt (all chunks for a note have the same value)
            var embedding = await _context.NoteEmbeddings
                .AsNoTracking()
                .Where(e => e.NoteId == noteId)
                .Select(e => new { e.NoteUpdatedAt })
                .FirstOrDefaultAsync(cancellationToken);

            return embedding?.NoteUpdatedAt;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting note updated at. NoteId: {NoteId}", noteId);
            return null;
        }
    }

    public async Task<HashSet<string>> GetIndexedNoteIdsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var noteIds = await _context.NoteEmbeddings
                .AsNoTracking()
                .Where(e => e.UserId == userId)
                .Select(e => e.NoteId)
                .Distinct()
                .ToListAsync(cancellationToken);

            return noteIds.ToHashSet();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting indexed note IDs. UserId: {UserId}", userId);
            return new HashSet<string>();
        }
    }

    public async Task<Dictionary<string, DateTime?>> GetIndexedNotesWithTimestampsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Get unique note IDs with their NoteUpdatedAt timestamp
            // We group by NoteId and take the first NoteUpdatedAt since all chunks have the same value
            var results = await _context.NoteEmbeddings
                .AsNoTracking()
                .Where(e => e.UserId == userId)
                .GroupBy(e => e.NoteId)
                .Select(g => new { NoteId = g.Key, NoteUpdatedAt = g.First().NoteUpdatedAt })
                .ToListAsync(cancellationToken);

            return results.ToDictionary(r => r.NoteId, r => (DateTime?)r.NoteUpdatedAt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting indexed notes with timestamps. UserId: {UserId}", userId);
            return new Dictionary<string, DateTime?>();
        }
    }
}

