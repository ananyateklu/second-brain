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

    /// <summary>
    /// Gets the note_updated_at timestamp for a note's embeddings.
    /// Used for incremental indexing to skip unchanged notes.
    /// </summary>
    /// <param name="noteId">The note ID to check</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The note's updated_at timestamp from the embedding, or null if not indexed</returns>
    Task<DateTime?> GetNoteUpdatedAtAsync(
        string noteId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all unique note IDs that have embeddings in the vector store.
    /// Used during indexing to identify and clean up orphaned embeddings.
    /// </summary>
    /// <param name="userId">The user ID to filter by</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Set of note IDs that have embeddings</returns>
    Task<HashSet<string>> GetIndexedNoteIdsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all indexed note IDs with their NoteUpdatedAt timestamps.
    /// Used to detect stale notes that need re-indexing.
    /// </summary>
    /// <param name="userId">The user ID to filter by</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Dictionary mapping note IDs to their indexed NoteUpdatedAt timestamps</returns>
    Task<Dictionary<string, DateTime?>> GetIndexedNotesWithTimestampsAsync(
        string userId,
        CancellationToken cancellationToken = default);
}

