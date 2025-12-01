using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Tests.Unit.Infrastructure.Repositories;

/// <summary>
/// Test DbContext for IndexingJob repository testing
/// </summary>
public class IndexingJobTestDbContext : DbContext
{
    public IndexingJobTestDbContext(DbContextOptions<IndexingJobTestDbContext> options)
        : base(options)
    {
    }

    public DbSet<IndexingJob> IndexingJobs { get; set; } = null!;
}

/// <summary>
/// Test-specific implementation of IIndexingJobRepository using InMemory database
/// </summary>
public class TestIndexingJobRepository : IIndexingJobRepository
{
    private readonly IndexingJobTestDbContext _context;
    private readonly ILogger<TestIndexingJobRepository> _logger;

    public TestIndexingJobRepository(IndexingJobTestDbContext context, ILogger<TestIndexingJobRepository> logger)
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
                job.Id = Guid.NewGuid().ToString();
            }

            job.CreatedAt = DateTime.UtcNow;

            _context.IndexingJobs.Add(job);
            await _context.SaveChangesAsync();

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
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting indexing job. JobId: {JobId}", id);
            throw new RepositoryException($"Failed to delete indexing job with ID '{id}'", ex);
        }
    }
}

public class SqlIndexingJobRepositoryInMemoryTests : IDisposable
{
    private readonly IndexingJobTestDbContext _context;
    private readonly IIndexingJobRepository _sut;
    private readonly Mock<ILogger<TestIndexingJobRepository>> _mockLogger;

    public SqlIndexingJobRepositoryInMemoryTests()
    {
        var options = new DbContextOptionsBuilder<IndexingJobTestDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .EnableSensitiveDataLogging()
            .Options;

        _context = new IndexingJobTestDbContext(options);
        _context.Database.EnsureCreated();

        _mockLogger = new Mock<ILogger<TestIndexingJobRepository>>();
        _sut = new TestIndexingJobRepository(_context, _mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WithValidJob_CreatesAndReturnsJob()
    {
        // Arrange
        var job = new IndexingJob
        {
            UserId = "user-1",
            Status = "pending",
            TotalNotes = 10
        };

        // Act
        var result = await _sut.CreateAsync(job);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.UserId.Should().Be("user-1");
        result.Status.Should().Be("pending");
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        // Verify persisted
        var persisted = await _context.IndexingJobs.FindAsync(result.Id);
        persisted.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateAsync_WithExistingId_UsesProvidedId()
    {
        // Arrange
        var job = new IndexingJob
        {
            Id = "custom-job-id",
            UserId = "user-1",
            Status = "pending"
        };

        // Act
        var result = await _sut.CreateAsync(job);

        // Assert
        result.Id.Should().Be("custom-job-id");
    }

    [Fact]
    public async Task CreateAsync_SetsCreatedAtTimestamp()
    {
        // Arrange
        var beforeCreate = DateTime.UtcNow;
        var job = new IndexingJob
        {
            UserId = "user-1",
            Status = "pending"
        };

        // Act
        var result = await _sut.CreateAsync(job);

        // Assert
        result.CreatedAt.Should().BeOnOrAfter(beforeCreate);
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenJobExists_ReturnsJob()
    {
        // Arrange
        var job = CreateTestJob("job-1", "user-1");
        await _context.IndexingJobs.AddAsync(job);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByIdAsync("job-1");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("job-1");
        result.UserId.Should().Be("user-1");
    }

    [Fact]
    public async Task GetByIdAsync_WhenJobDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByIdAsync("non-existent");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsAllJobProperties()
    {
        // Arrange
        var job = CreateTestJob("job-1", "user-1");
        job.Status = "completed";
        job.TotalNotes = 100;
        job.ProcessedNotes = 100;
        job.TotalChunks = 500;
        job.ProcessedChunks = 500;
        job.EmbeddingProvider = "openai";
        job.StartedAt = DateTime.UtcNow.AddMinutes(-5);
        job.CompletedAt = DateTime.UtcNow;
        await _context.IndexingJobs.AddAsync(job);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByIdAsync("job-1");

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be("completed");
        result.TotalNotes.Should().Be(100);
        result.ProcessedNotes.Should().Be(100);
        result.TotalChunks.Should().Be(500);
        result.ProcessedChunks.Should().Be(500);
        result.EmbeddingProvider.Should().Be("openai");
        result.StartedAt.Should().NotBeNull();
        result.CompletedAt.Should().NotBeNull();
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WhenJobExists_UpdatesAndReturnsJob()
    {
        // Arrange
        var existingJob = CreateTestJob("job-1", "user-1");
        existingJob.Status = "pending";
        await _context.IndexingJobs.AddAsync(existingJob);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var updatedJob = new IndexingJob
        {
            Status = "processing",
            TotalNotes = 50,
            ProcessedNotes = 10,
            TotalChunks = 200,
            ProcessedChunks = 40,
            EmbeddingProvider = "openai",
            StartedAt = DateTime.UtcNow
        };

        // Act
        var result = await _sut.UpdateAsync("job-1", updatedJob);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be("processing");
        result.TotalNotes.Should().Be(50);
        result.ProcessedNotes.Should().Be(10);
        result.TotalChunks.Should().Be(200);
        result.ProcessedChunks.Should().Be(40);
        result.EmbeddingProvider.Should().Be("openai");
        result.StartedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateAsync_WhenJobDoesNotExist_ReturnsNull()
    {
        // Arrange
        var updatedJob = new IndexingJob
        {
            Status = "completed"
        };

        // Act
        var result = await _sut.UpdateAsync("non-existent", updatedJob);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_UpdatesErrors()
    {
        // Arrange
        var existingJob = CreateTestJob("job-1", "user-1");
        await _context.IndexingJobs.AddAsync(existingJob);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var errors = new List<string> { "Error processing note 1", "Error processing note 2" };
        var updatedJob = new IndexingJob
        {
            Status = "failed",
            Errors = errors
        };

        // Act
        var result = await _sut.UpdateAsync("job-1", updatedJob);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be("failed");
        result.Errors.Should().HaveCount(2);
        result.Errors.Should().Contain("Error processing note 1");
    }

    [Fact]
    public async Task UpdateAsync_UpdatesCompletedAt()
    {
        // Arrange
        var existingJob = CreateTestJob("job-1", "user-1");
        existingJob.Status = "processing";
        existingJob.StartedAt = DateTime.UtcNow.AddMinutes(-10);
        await _context.IndexingJobs.AddAsync(existingJob);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var completedTime = DateTime.UtcNow;
        var updatedJob = new IndexingJob
        {
            Status = "completed",
            StartedAt = existingJob.StartedAt,
            CompletedAt = completedTime
        };

        // Act
        var result = await _sut.UpdateAsync("job-1", updatedJob);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be("completed");
        result.CompletedAt.Should().BeCloseTo(completedTime, TimeSpan.FromSeconds(1));
    }

    #endregion

    #region GetByUserIdAsync Tests

    [Fact]
    public async Task GetByUserIdAsync_ReturnsOnlyUserJobs()
    {
        // Arrange
        var jobs = new List<IndexingJob>
        {
            CreateTestJob("job-1", "user-1"),
            CreateTestJob("job-2", "user-1"),
            CreateTestJob("job-3", "user-2")
        };
        await _context.IndexingJobs.AddRangeAsync(jobs);
        await _context.SaveChangesAsync();

        // Act
        var result = (await _sut.GetByUserIdAsync("user-1")).ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(j => j.UserId == "user-1");
    }

    [Fact]
    public async Task GetByUserIdAsync_ReturnsOrderedByCreatedAtDescending()
    {
        // Arrange
        var oldJob = CreateTestJob("job-1", "user-1");
        oldJob.CreatedAt = DateTime.UtcNow.AddDays(-10);

        var newJob = CreateTestJob("job-2", "user-1");
        newJob.CreatedAt = DateTime.UtcNow;

        await _context.IndexingJobs.AddAsync(oldJob);
        await _context.IndexingJobs.AddAsync(newJob);
        await _context.SaveChangesAsync();

        // Act
        var result = (await _sut.GetByUserIdAsync("user-1")).ToList();

        // Assert
        result.Should().HaveCount(2);
        result[0].Id.Should().Be("job-2"); // Newer first
        result[1].Id.Should().Be("job-1");
    }

    [Fact]
    public async Task GetByUserIdAsync_WhenNoJobs_ReturnsEmptyList()
    {
        // Act
        var result = await _sut.GetByUserIdAsync("user-with-no-jobs");

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region GetLatestByUserIdAsync Tests

    [Fact]
    public async Task GetLatestByUserIdAsync_ReturnsLatestJob()
    {
        // Arrange
        var oldJob = CreateTestJob("job-1", "user-1");
        oldJob.CreatedAt = DateTime.UtcNow.AddDays(-10);

        var newJob = CreateTestJob("job-2", "user-1");
        newJob.CreatedAt = DateTime.UtcNow;

        await _context.IndexingJobs.AddAsync(oldJob);
        await _context.IndexingJobs.AddAsync(newJob);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetLatestByUserIdAsync("user-1");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("job-2");
    }

    [Fact]
    public async Task GetLatestByUserIdAsync_WhenNoJobs_ReturnsNull()
    {
        // Act
        var result = await _sut.GetLatestByUserIdAsync("user-with-no-jobs");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetLatestByUserIdAsync_ReturnsOnlyUserJob()
    {
        // Arrange
        var user1Job = CreateTestJob("job-1", "user-1");
        user1Job.CreatedAt = DateTime.UtcNow.AddDays(-5);

        var user2Job = CreateTestJob("job-2", "user-2");
        user2Job.CreatedAt = DateTime.UtcNow; // More recent, but different user

        await _context.IndexingJobs.AddAsync(user1Job);
        await _context.IndexingJobs.AddAsync(user2Job);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetLatestByUserIdAsync("user-1");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("job-1");
        result.UserId.Should().Be("user-1");
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WhenJobExists_DeletesAndReturnsTrue()
    {
        // Arrange
        var job = CreateTestJob("job-1", "user-1");
        await _context.IndexingJobs.AddAsync(job);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        var result = await _sut.DeleteAsync("job-1");

        // Assert
        result.Should().BeTrue();
        var deleted = await _context.IndexingJobs.FindAsync("job-1");
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenJobDoesNotExist_ReturnsFalse()
    {
        // Act
        var result = await _sut.DeleteAsync("non-existent");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_DoesNotAffectOtherJobs()
    {
        // Arrange
        var job1 = CreateTestJob("job-1", "user-1");
        var job2 = CreateTestJob("job-2", "user-1");
        await _context.IndexingJobs.AddRangeAsync(job1, job2);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        await _sut.DeleteAsync("job-1");

        // Assert
        var remainingJobs = await _context.IndexingJobs.CountAsync();
        remainingJobs.Should().Be(1);
        var remaining = await _context.IndexingJobs.FirstAsync();
        remaining.Id.Should().Be("job-2");
    }

    #endregion

    #region Helper Methods

    private static IndexingJob CreateTestJob(string id, string userId)
    {
        return new IndexingJob
        {
            Id = id,
            UserId = userId,
            Status = "pending",
            TotalNotes = 0,
            ProcessedNotes = 0,
            TotalChunks = 0,
            ProcessedChunks = 0,
            Errors = new List<string>(),
            CreatedAt = DateTime.UtcNow
        };
    }

    #endregion
}

