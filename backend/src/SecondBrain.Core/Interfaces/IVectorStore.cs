using SecondBrain.Core.Entities;
using SecondBrain.Core.Models;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Interface for vector store operations supporting semantic search
/// </summary>
public interface IVectorStore
{
    Task<bool> UpsertAsync(
        NoteEmbedding embedding,
        CancellationToken cancellationToken = default);

    Task<bool> UpsertBatchAsync(
        IEnumerable<NoteEmbedding> embeddings,
        CancellationToken cancellationToken = default);

    Task<List<VectorSearchResult>> SearchAsync(
        List<double> queryEmbedding,
        string userId,
        int topK,
        float similarityThreshold = 0.7f,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteByNoteIdAsync(
        string noteId,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<IndexStats> GetIndexStatsAsync(
        string userId,
        CancellationToken cancellationToken = default);
}

