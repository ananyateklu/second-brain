using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Service for running summary generation as a background task.
/// Follows the same pattern as IndexingService for background processing.
/// </summary>
public class SummaryGenerationBackgroundService : ISummaryGenerationBackgroundService
{
    private readonly ISummaryJobRepository _summaryJobRepository;
    private readonly INoteRepository _noteRepository;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<SummaryGenerationBackgroundService> _logger;

    public SummaryGenerationBackgroundService(
        ISummaryJobRepository summaryJobRepository,
        INoteRepository noteRepository,
        IServiceScopeFactory serviceScopeFactory,
        ILogger<SummaryGenerationBackgroundService> logger)
    {
        _summaryJobRepository = summaryJobRepository;
        _noteRepository = noteRepository;
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    public async Task<SummaryJob> StartSummaryGenerationAsync(
        string userId,
        List<string>? noteIds = null,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Starting summary generation job. UserId: {UserId}, SpecificNotes: {NoteCount}",
            userId,
            noteIds?.Count ?? 0);

        // Check for existing active job
        var activeJob = await _summaryJobRepository.GetActiveByUserIdAsync(userId);
        if (activeJob != null)
        {
            _logger.LogWarning(
                "Summary generation already in progress. UserId: {UserId}, ExistingJobId: {JobId}",
                userId,
                activeJob.Id);
            throw new InvalidOperationException(
                $"A summary generation job is already in progress (ID: {activeJob.Id}). Please wait for it to complete or cancel it first.");
        }

        // Fetch notes for the user
        var userNotes = (await _noteRepository.GetByUserIdAsync(userId)).ToList();

        // Determine which notes to process
        List<Note> notesToProcess;
        if (noteIds != null && noteIds.Count > 0)
        {
            var requestedIds = new HashSet<string>(noteIds);
            notesToProcess = userNotes.Where(n => requestedIds.Contains(n.Id)).ToList();
        }
        else
        {
            // Process notes without summaries
            notesToProcess = userNotes.Where(n => string.IsNullOrEmpty(n.Summary)).ToList();
        }

        _logger.LogInformation(
            "Found {Count} notes to process for summary generation. UserId: {UserId}",
            notesToProcess.Count,
            userId);

        // Create the job
        var job = new SummaryJob
        {
            Id = UuidV7.NewId(),
            UserId = userId,
            Status = SummaryJobStatus.Pending,
            TotalNotes = notesToProcess.Count,
            CreatedAt = DateTime.UtcNow
        };

        job = await _summaryJobRepository.CreateAsync(job);

        // Start processing in background with a new DI scope
        _ = Task.Run(async () =>
        {
            try
            {
                await ProcessSummaryJobAsync(job.Id, notesToProcess.Select(n => n.Id).ToList());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception in background summary task. JobId: {JobId}", job.Id);
            }
        });

        return job;
    }

    public async Task<SummaryJob?> GetJobStatusAsync(
        string jobId,
        CancellationToken cancellationToken = default)
    {
        return await _summaryJobRepository.GetByIdAsync(jobId);
    }

    public async Task<bool> CancelJobAsync(
        string jobId,
        CancellationToken cancellationToken = default)
    {
        var job = await _summaryJobRepository.GetByIdAsync(jobId);
        if (job == null)
        {
            _logger.LogWarning("Summary job not found for cancellation. JobId: {JobId}", jobId);
            return false;
        }

        if (job.Status != SummaryJobStatus.Pending && job.Status != SummaryJobStatus.Running)
        {
            _logger.LogWarning(
                "Cannot cancel summary job in status {Status}. JobId: {JobId}",
                job.Status,
                jobId);
            return false;
        }

        job.Status = SummaryJobStatus.Cancelled;
        job.CompletedAt = DateTime.UtcNow;
        await _summaryJobRepository.UpdateAsync(jobId, job);

        _logger.LogInformation("Summary job cancelled. JobId: {JobId}", jobId);
        return true;
    }

    private async Task ProcessSummaryJobAsync(string jobId, List<string> noteIdsToProcess)
    {
        // Create a new scope for the background task to get fresh scoped services
        using var scope = _serviceScopeFactory.CreateScope();
        var summaryJobRepository = scope.ServiceProvider.GetRequiredService<ISummaryJobRepository>();
        var noteRepository = scope.ServiceProvider.GetRequiredService<INoteRepository>();
        var summaryService = scope.ServiceProvider.GetRequiredService<INoteSummaryService>();

        SummaryJob? job = null;

        try
        {
            job = await summaryJobRepository.GetByIdAsync(jobId);
            if (job == null)
            {
                _logger.LogError("Summary job not found. JobId: {JobId}", jobId);
                return;
            }

            // Update job status to running
            job.Status = SummaryJobStatus.Running;
            job.StartedAt = DateTime.UtcNow;
            await summaryJobRepository.UpdateAsync(jobId, job);

            _logger.LogInformation(
                "Starting summary generation processing. JobId: {JobId}, TotalNotes: {TotalNotes}",
                jobId,
                noteIdsToProcess.Count);

            // Process each note
            foreach (var noteId in noteIdsToProcess)
            {
                // Check if job was cancelled
                var currentJob = await summaryJobRepository.GetByIdAsync(jobId);
                if (currentJob?.Status == SummaryJobStatus.Cancelled)
                {
                    _logger.LogInformation("Summary job was cancelled. JobId: {JobId}", jobId);
                    break;
                }

                try
                {
                    var note = await noteRepository.GetByIdAsync(noteId);
                    if (note == null)
                    {
                        _logger.LogWarning("Note not found, skipping. NoteId: {NoteId}", noteId);
                        job.SkippedCount++;
                        job.ProcessedNotes++;
                        await summaryJobRepository.UpdateAsync(jobId, job);
                        continue;
                    }

                    // Skip if already has summary (unless specifically requested)
                    if (!string.IsNullOrEmpty(note.Summary))
                    {
                        job.SkippedCount++;
                        job.ProcessedNotes++;
                        await summaryJobRepository.UpdateAsync(jobId, job);
                        continue;
                    }

                    // Generate summary
                    var summary = await summaryService.GenerateSummaryAsync(
                        note.Title,
                        note.Content,
                        note.Tags,
                        CancellationToken.None);

                    if (!string.IsNullOrEmpty(summary))
                    {
                        // Update the note with the summary
                        note.Summary = summary;
                        await noteRepository.UpdateAsync(note.Id, note);
                        job.SuccessCount++;
                        _logger.LogDebug("Generated summary for note. NoteId: {NoteId}", noteId);
                    }
                    else
                    {
                        job.FailureCount++;
                        job.Errors.Add($"Note {noteId}: Summary generation returned empty result");
                        _logger.LogWarning("Summary generation returned empty for note. NoteId: {NoteId}", noteId);
                    }

                    job.ProcessedNotes++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error generating summary for note. NoteId: {NoteId}", noteId);
                    job.FailureCount++;
                    job.Errors.Add($"Note {noteId}: {ex.Message}");
                    job.ProcessedNotes++;
                }

                // Update progress after each note for real-time UI updates
                await summaryJobRepository.UpdateAsync(jobId, job);
            }

            // Determine final status
            if (job.Status == SummaryJobStatus.Cancelled)
            {
                // Already cancelled, don't change status
                _logger.LogInformation(
                    "Summary job cancelled. JobId: {JobId}, Processed: {Processed}, Success: {Success}, Failed: {Failed}",
                    jobId, job.ProcessedNotes, job.SuccessCount, job.FailureCount);
            }
            else
            {
                job.Status = SummaryJobStatus.Completed;
                job.CompletedAt = DateTime.UtcNow;
                await summaryJobRepository.UpdateAsync(jobId, job);

                _logger.LogInformation(
                    "Summary generation completed. JobId: {JobId}, Total: {Total}, Success: {Success}, Failed: {Failed}, Skipped: {Skipped}",
                    jobId, job.ProcessedNotes, job.SuccessCount, job.FailureCount, job.SkippedCount);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in summary generation job. JobId: {JobId}", jobId);

            if (job != null)
            {
                job.Status = SummaryJobStatus.Failed;
                job.CompletedAt = DateTime.UtcNow;
                job.Errors.Add($"Fatal error: {ex.Message}");
                await summaryJobRepository.UpdateAsync(jobId, job);
            }
        }
    }
}
