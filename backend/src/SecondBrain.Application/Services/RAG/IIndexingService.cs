using SecondBrain.Core.Entities;
using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.RAG;

public interface IIndexingService
{
    Task<IndexingJob> StartIndexingAsync(
        string userId,
        string? embeddingProvider = null,
        string? vectorStoreProvider = null,
        string? embeddingModel = null,
        int? customDimensions = null,
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

    /// <summary>
    /// Cancel an active indexing job
    /// </summary>
    /// <param name="jobId">The ID of the job to cancel</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if the job was successfully cancelled, false if not found or already completed</returns>
    Task<bool> CancelIndexingAsync(
        string jobId,
        CancellationToken cancellationToken = default);
}
