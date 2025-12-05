using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Data;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Infrastructure.Repositories;

public class SqlIndexingJobRepository : IIndexingJobRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SqlIndexingJobRepository> _logger;

    public SqlIndexingJobRepository(ApplicationDbContext context, ILogger<SqlIndexingJobRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IndexingJob> CreateAsync(IndexingJob job)
    {
        try
        {
            _logger.LogDebug("Creating indexing job. UserId: {UserId}", job.UserId);

            if (string.IsNullOrEmpty(job.Id))
            {
                job.Id = UuidV7.NewId();
            }

            job.CreatedAt = DateTime.UtcNow;

            _context.IndexingJobs.Add(job);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Indexing job created. JobId: {JobId}, UserId: {UserId}", job.Id, job.UserId);
            return job;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating indexing job. UserId: {UserId}", job.UserId);
            throw new RepositoryException("Failed to create indexing job", ex);
        }
    }

    public async Task<IndexingJob?> GetByIdAsync(string id)
    {
        try
        {
            _logger.LogDebug("Retrieving indexing job. JobId: {JobId}", id);
            var job = await _context.IndexingJobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == id);

            if (job == null)
            {
                _logger.LogDebug("Indexing job not found. JobId: {JobId}", id);
            }

            return job;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving indexing job. JobId: {JobId}", id);
            throw new RepositoryException($"Failed to retrieve indexing job with ID '{id}'", ex);
        }
    }

    public async Task<IndexingJob?> UpdateAsync(string id, IndexingJob job)
    {
        try
        {
            _logger.LogDebug("Updating indexing job. JobId: {JobId}", id);
            var existingJob = await _context.IndexingJobs.FirstOrDefaultAsync(j => j.Id == id);

            if (existingJob == null)
            {
                _logger.LogDebug("Indexing job not found for update. JobId: {JobId}", id);
                return null;
            }

            existingJob.Status = job.Status;
            existingJob.TotalNotes = job.TotalNotes;
            existingJob.ProcessedNotes = job.ProcessedNotes;
            existingJob.TotalChunks = job.TotalChunks;
            existingJob.ProcessedChunks = job.ProcessedChunks;
            existingJob.Errors = job.Errors;
            existingJob.EmbeddingProvider = job.EmbeddingProvider;
            existingJob.StartedAt = job.StartedAt;
            existingJob.CompletedAt = job.CompletedAt;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Indexing job updated. JobId: {JobId}, Status: {Status}", id, existingJob.Status);
            return existingJob;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating indexing job. JobId: {JobId}", id);
            throw new RepositoryException($"Failed to update indexing job with ID '{id}'", ex);
        }
    }

    public async Task<IEnumerable<IndexingJob>> GetByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Retrieving indexing jobs for user. UserId: {UserId}", userId);
            var jobs = await _context.IndexingJobs
                .AsNoTracking()
                .Where(j => j.UserId == userId)
                .OrderByDescending(j => j.CreatedAt)
                .ToListAsync();

            _logger.LogDebug("Retrieved indexing jobs. UserId: {UserId}, Count: {Count}", userId, jobs.Count);
            return jobs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving indexing jobs. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to retrieve indexing jobs for user '{userId}'", ex);
        }
    }

    public async Task<IndexingJob?> GetLatestByUserIdAsync(string userId)
    {
        try
        {
            _logger.LogDebug("Retrieving latest indexing job for user. UserId: {UserId}", userId);
            var job = await _context.IndexingJobs
                .AsNoTracking()
                .Where(j => j.UserId == userId)
                .OrderByDescending(j => j.CreatedAt)
                .FirstOrDefaultAsync();

            if (job == null)
            {
                _logger.LogDebug("No indexing jobs found for user. UserId: {UserId}", userId);
            }

            return job;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving latest indexing job. UserId: {UserId}", userId);
            throw new RepositoryException($"Failed to retrieve latest indexing job for user '{userId}'", ex);
        }
    }

    public async Task<bool> DeleteAsync(string id)
    {
        try
        {
            _logger.LogDebug("Deleting indexing job. JobId: {JobId}", id);
            var job = await _context.IndexingJobs.FirstOrDefaultAsync(j => j.Id == id);

            if (job == null)
            {
                _logger.LogDebug("Indexing job not found for deletion. JobId: {JobId}", id);
                return false;
            }

            _context.IndexingJobs.Remove(job);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Indexing job deleted. JobId: {JobId}", id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting indexing job. JobId: {JobId}", id);
            throw new RepositoryException($"Failed to delete indexing job with ID '{id}'", ex);
        }
    }
}

