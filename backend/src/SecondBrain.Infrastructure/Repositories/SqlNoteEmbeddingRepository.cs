using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

public class SqlNoteEmbeddingRepository : INoteEmbeddingRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlNoteEmbeddingRepository> _logger;

    public SqlNoteEmbeddingRepository(ApplicationDbContext context, ILogger<SqlNoteEmbeddingRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<NoteEmbedding> CreateAsync(NoteEmbedding embedding)
    {
        try
        {
            _logger.LogDebug("Creating note embedding. NoteId: {NoteId}, ChunkIndex: {ChunkIndex}", embedding.NoteId, embedding.ChunkIndex);

            if (string.IsNullOrEmpty(embedding.Id))
            {
                embedding.Id = UuidV7.NewId();
            }

            embedding.CreatedAt = DateTime.UtcNow;

            _context.NoteEmbeddings.Add(embedding);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Note embedding created. EmbeddingId: {EmbeddingId}, NoteId: {NoteId}", embedding.Id, embedding.NoteId);
            return embedding;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating note embedding. NoteId: {NoteId}", embedding.NoteId);
            throw new RepositoryException("Failed to create note embedding", ex);
        }
    }

    public async Task<IEnumerable<NoteEmbedding>> CreateBatchAsync(IEnumerable<NoteEmbedding> embeddings)
    {
        try
        {
            var embeddingsList = embeddings.ToList();
            _logger.LogDebug("Creating batch of note embeddings. Count: {Count}", embeddingsList.Count);

            var now = DateTime.UtcNow;
            foreach (var embedding in embeddingsList)
            {
                if (string.IsNullOrEmpty(embedding.Id))
                {
                    embedding.Id = UuidV7.NewId();
                }
                embedding.CreatedAt = now;
            }

            _context.NoteEmbeddings.AddRange(embeddingsList);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Batch of note embeddings created. Count: {Count}", embeddingsList.Count);
            return embeddingsList;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating batch of note embeddings");
            throw new RepositoryException("Failed to create batch of note embeddings", ex);
        }
    }

    public async Task<NoteEmbedding?> GetByIdAsync(string id)
    {
        try
        {
            _logger.LogDebug("Retrieving note embedding. EmbeddingId: {EmbeddingId}", id);
            var embedding = await _context.NoteEmbeddings.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);

            if (embedding == null)
            {
                _logger.LogDebug("Note embedding not found. EmbeddingId: {EmbeddingId}", id);
            }

            return embedding;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving note embedding. EmbeddingId: {EmbeddingId}", id);
            throw new RepositoryException($"Failed to retrieve note embedding with ID '{id}'", ex);
        }
    }

    public async Task<IEnumerable<NoteEmbedding>> GetByNoteIdAsync(string noteId)
    {
        try
        {
            _logger.LogDebug("Retrieving embeddings for note. NoteId: {NoteId}", noteId);
            var embeddings = await _context.NoteEmbeddings
                .AsNoTracking()
                .Where(e => e.NoteId == noteId)
                .OrderBy(e => e.ChunkIndex)
                .ToListAsync();

            _logger.LogDebug("Retrieved embeddings for note. NoteId: {NoteId}, Count: {Count}", noteId, embeddings.Count);
            return embeddings;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving embeddings for note. NoteId: {NoteId}", noteId);
            throw new RepositoryException($"Failed to retrieve embeddings for note '{noteId}'", ex);
        }
    }

    public async Task<IEnumerable<NoteEmbedding>> GetByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Retrieving embeddings for user. UserId: {UserId}", userId);
            var embeddings = await _context.NoteEmbeddings
                .AsNoTracking()
                .Where(e => e.UserId == userId)
                .ToListAsync();

            _logger.LogDebug("Retrieved embeddings for user. UserId: {UserId}, Count: {Count}", userId, embeddings.Count);
            return embeddings;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving embeddings for user. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to retrieve embeddings for user '{userId}'", ex);
        }
    }

    public async Task<bool> DeleteByNoteIdAsync(string noteId)
    {
        try
        {
            _logger.LogDebug("Deleting embeddings for note. NoteId: {NoteId}", noteId);

            // Use ExecuteDeleteAsync for efficient bulk delete without loading entities into memory
            // This generates: DELETE FROM note_embeddings WHERE note_id = @noteId
            var deletedCount = await _context.NoteEmbeddings
                .Where(e => e.NoteId == noteId)
                .ExecuteDeleteAsync();

            if (deletedCount == 0)
            {
                _logger.LogDebug("No embeddings found for note. NoteId: {NoteId}", noteId);
            }
            else
            {
                _logger.LogInformation("Embeddings deleted for note. NoteId: {NoteId}, Count: {Count}", noteId, deletedCount);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting embeddings for note. NoteId: {NoteId}", noteId);
            throw new RepositoryException($"Failed to delete embeddings for note '{noteId}'", ex);
        }
    }

    public async Task<bool> DeleteByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Deleting embeddings for user. UserId: {UserId}", userId);

            // Use ExecuteDeleteAsync for efficient bulk delete without loading entities into memory
            // This generates: DELETE FROM note_embeddings WHERE user_id = @userId
            // For large datasets, this is 10-100x faster than loading + RemoveRange
            var deletedCount = await _context.NoteEmbeddings
                .Where(e => e.UserId == userId)
                .ExecuteDeleteAsync();

            if (deletedCount == 0)
            {
                _logger.LogDebug("No embeddings found for user. UserId: {UserId}", userId);
            }
            else
            {
                _logger.LogInformation("Embeddings deleted for user. UserId: {UserId}, Count: {Count}", userId, deletedCount);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting embeddings for user. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to delete embeddings for user '{userId}'", ex);
        }
    }

    public async Task<int> CountByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Counting embeddings for user. UserId: {UserId}", userId);
            var count = await _context.NoteEmbeddings
                .Where(e => e.UserId == userId)
                .CountAsync();

            _logger.LogDebug("Counted embeddings for user. UserId: {UserId}, Count: {Count}", userId, count);
            return count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error counting embeddings for user. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to count embeddings for user '{userId}'", ex);
        }
    }
}

