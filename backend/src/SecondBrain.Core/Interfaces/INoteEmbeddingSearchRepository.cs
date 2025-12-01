using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

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
}

