using SecondBrain.Core.Entities;
using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.RAG;

public interface IIndexingService
{
    Task<IndexingJob> StartIndexingAsync(
        string userId,
        string? embeddingProvider = null,
        string? vectorStoreProvider = null,
        CancellationToken cancellationToken = default);

    Task<IndexingJob?> GetIndexingStatusAsync(
        string jobId,
        CancellationToken cancellationToken = default);

    Task<IndexStats> GetIndexStatsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<bool> ReindexNoteAsync(
        string noteId,
        CancellationToken cancellationToken = default);
}
