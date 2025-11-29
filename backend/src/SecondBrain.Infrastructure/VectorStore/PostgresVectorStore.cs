using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pgvector;
using Pgvector.EntityFrameworkCore;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;
using SecondBrain.Infrastructure.Data;

namespace SecondBrain.Infrastructure.VectorStore;

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
            }
            else
            {
                // Create new
                if (string.IsNullOrEmpty(embedding.Id))
                {
                    embedding.Id = Guid.NewGuid().ToString();
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
                }
                else
                {
                    if (string.IsNullOrEmpty(embedding.Id))
                    {
                        embedding.Id = Guid.NewGuid().ToString();
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
}

