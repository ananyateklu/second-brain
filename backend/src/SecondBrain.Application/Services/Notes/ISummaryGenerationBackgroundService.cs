using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Service interface for background summary generation jobs.
/// </summary>
public interface ISummaryGenerationBackgroundService
{
    /// <summary>
    /// Start a background job to generate summaries for notes without summaries.
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <param name="noteIds">Optional list of specific note IDs to process. If empty, processes all notes without summaries.</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The created summary job</returns>
    Task<SummaryJob> StartSummaryGenerationAsync(
        string userId,
        List<string>? noteIds = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the status of a summary generation job.
    /// </summary>
    /// <param name="jobId">The job ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The summary job or null if not found</returns>
    Task<SummaryJob?> GetJobStatusAsync(
        string jobId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancel an active summary generation job.
    /// </summary>
    /// <param name="jobId">The job ID to cancel</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if the job was successfully cancelled, false if not found or already completed</returns>
    Task<bool> CancelJobAsync(
        string jobId,
        CancellationToken cancellationToken = default);
}
