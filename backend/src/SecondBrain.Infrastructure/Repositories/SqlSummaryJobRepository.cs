using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

public class SqlSummaryJobRepository : ISummaryJobRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlSummaryJobRepository> _logger;

    public SqlSummaryJobRepository(ApplicationDbContext context, ILogger<SqlSummaryJobRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<SummaryJob> CreateAsync(SummaryJob job)
    {
        try
        {
            _logger.LogDebug("Creating summary job. UserId: {UserId}", job.UserId);

            if (string.IsNullOrEmpty(job.Id))
            {
                job.Id = UuidV7.NewId();
            }

            job.CreatedAt = DateTime.UtcNow;

            _context.SummaryJobs.Add(job);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Summary job created. JobId: {JobId}, UserId: {UserId}", job.Id, job.UserId);
            return job;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating summary job. UserId: {UserId}", job.UserId);
            throw new RepositoryException("Failed to create summary job", ex);
        }
    }

    public async Task<SummaryJob?> GetByIdAsync(string id)
    {
        try
        {
            _logger.LogDebug("Retrieving summary job. JobId: {JobId}", id);
            var job = await _context.SummaryJobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == id);

            if (job == null)
            {
                _logger.LogDebug("Summary job not found. JobId: {JobId}", id);
            }

            return job;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving summary job. JobId: {JobId}", id);
            throw new RepositoryException($"Failed to retrieve summary job with ID '{id}'", ex);
        }
    }

    public async Task<SummaryJob?> UpdateAsync(string id, SummaryJob job)
    {
        try
        {
            _logger.LogDebug("Updating summary job. JobId: {JobId}", id);
            var existingJob = await _context.SummaryJobs.FirstOrDefaultAsync(j => j.Id == id);

            if (existingJob == null)
            {
                _logger.LogDebug("Summary job not found for update. JobId: {JobId}", id);
                return null;
            }

            existingJob.Status = job.Status;
            existingJob.TotalNotes = job.TotalNotes;
            existingJob.ProcessedNotes = job.ProcessedNotes;
            existingJob.SuccessCount = job.SuccessCount;
            existingJob.FailureCount = job.FailureCount;
            existingJob.SkippedCount = job.SkippedCount;
            existingJob.Errors = job.Errors;
            existingJob.StartedAt = job.StartedAt;
            existingJob.CompletedAt = job.CompletedAt;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Summary job updated. JobId: {JobId}, Status: {Status}", id, existingJob.Status);
            return existingJob;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating summary job. JobId: {JobId}", id);
            throw new RepositoryException($"Failed to update summary job with ID '{id}'", ex);
        }
    }

    public async Task<IEnumerable<SummaryJob>> GetByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Retrieving summary jobs for user. UserId: {UserId}", userId);
            var jobs = await _context.SummaryJobs
                .AsNoTracking()
                .Where(j => j.UserId == userId)
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();

            _logger.LogDebug("Retrieved summary jobs. UserId: {UserId}, Count: {Count}", userId, jobs.Count);
            return jobs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving summary jobs. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to retrieve summary jobs for user '{userId}'", ex);
        }
    }

    public async Task<SummaryJob?> GetLatestByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Retrieving latest summary job for user. UserId: {UserId}", userId);
            var job = await _context.SummaryJobs
                .AsNoTracking()
                .Where(j => j.UserId == userId)
                .OrderByDescending(j => j.CreatedAt)
                .FirstOrDefaultAsync();

            if (job == null)
            {
                _logger.LogDebug("No summary jobs found for user. UserId: {UserId}", userId);
            }

            return job;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving latest summary job. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to retrieve latest summary job for user '{userId}'", ex);
        }
    }

    public async Task<SummaryJob?> GetActiveByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Retrieving active summary job for user. UserId: {UserId}", userId);
            var job = await _context.SummaryJobs
                .AsNoTracking()
                .Where(j => j.UserId == userId &&
                       (j.Status == SummaryJobStatus.Pending || j.Status == SummaryJobStatus.Running))
                .OrderByDescending(j => j.CreatedAt)
                .FirstOrDefaultAsync();

            return job;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active summary job. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to retrieve active summary job for user '{userId}'", ex);
        }
    }

    public async Task<bool> DeleteAsync(string id)
    {
        try
        {
            _logger.LogDebug("Deleting summary job. JobId: {JobId}", id);
            var job = await _context.SummaryJobs.FirstOrDefaultAsync(j => j.Id == id);

            if (job == null)
            {
                _logger.LogDebug("Summary job not found for deletion. JobId: {JobId}", id);
                return false;
            }

            _context.SummaryJobs.Remove(job);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Summary job deleted. JobId: {JobId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting summary job. JobId: {JobId}", id);
            throw new RepositoryException($"Failed to delete summary job with ID '{id}'", ex);
        }
    }
}
