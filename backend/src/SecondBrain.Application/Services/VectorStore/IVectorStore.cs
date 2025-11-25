using SecondBrain.Application.Services.VectorStore.Models;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Services.VectorStore;

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

