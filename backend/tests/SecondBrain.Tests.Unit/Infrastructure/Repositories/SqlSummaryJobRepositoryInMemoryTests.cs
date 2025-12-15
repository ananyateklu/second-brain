using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Exceptions;
using Xunit;

namespace SecondBrain.Tests.Unit.Infrastructure.Repositories;

/// <summary>
/// Test DbContext for Summary job repository testing.
/// </summary>
public class SummaryJobTestDbContext : DbContext
{
    public SummaryJobTestDbContext(DbContextOptions<SummaryJobTestDbContext> options)
        : base(options)
    {
    }

    public DbSet<SummaryJob> SummaryJobs { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<SummaryJob>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
            entity.Property(e => e.Status).IsRequired();
        });
    }
}

/// <summary>
/// Test implementation of ISummaryJobRepository using InMemory database.
/// </summary>
public class TestSummaryJobRepository : ISummaryJobRepository
{
    private readonly SummaryJobTestDbContext _context;
    private readonly ILogger<TestSummaryJobRepository> _logger;

    public TestSummaryJobRepository(SummaryJobTestDbContext context, ILogger<TestSummaryJobRepository> logger)
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

/// <summary>
/// Unit tests for SqlSummaryJobRepository.
/// Tests CRUD operations and job status queries.
/// </summary>
public class SqlSummaryJobRepositoryInMemoryTests : IDisposable
{
    private readonly SummaryJobTestDbContext _context;
    private readonly TestSummaryJobRepository _sut;
    private readonly Mock<ILogger<TestSummaryJobRepository>> _mockLogger;
    private bool _disposed;

    public SqlSummaryJobRepositoryInMemoryTests()
    {
        var options = new DbContextOptionsBuilder<SummaryJobTestDbContext>()
            .UseInMemoryDatabase(databaseName: $"SummaryJobTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new SummaryJobTestDbContext(options);
        _mockLogger = new Mock<ILogger<TestSummaryJobRepository>>();
        _sut = new TestSummaryJobRepository(_context, _mockLogger.Object);
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                _context.Database.EnsureDeleted();
                _context.Dispose();
            }
            _disposed = true;
        }
    }

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WithValidJob_ReturnsCreatedJob()
    {
        // Arrange
        var job = CreateTestJob("user-1");

        // Act
        var result = await _sut.CreateAsync(job);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.UserId.Should().Be("user-1");
        result.Status.Should().Be(SummaryJobStatus.Pending);
    }

    [Fact]
    public async Task CreateAsync_WithoutId_GeneratesId()
    {
        // Arrange
        var job = new SummaryJob
        {
            UserId = "user-1",
            Status = SummaryJobStatus.Pending
        };

        // Act
        var result = await _sut.CreateAsync(job);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task CreateAsync_WithAllFields_PersistsAllData()
    {
        // Arrange
        var startedAt = DateTime.UtcNow.AddMinutes(-5);
        var job = new SummaryJob
        {
            Id = UuidV7.NewId(),
            UserId = "user-1",
            Status = SummaryJobStatus.Running,
            TotalNotes = 100,
            ProcessedNotes = 50,
            SuccessCount = 45,
            FailureCount = 3,
            SkippedCount = 2,
            Errors = new List<string> { "Error 1", "Error 2" },
            StartedAt = startedAt
        };

        // Act
        var result = await _sut.CreateAsync(job);
        var retrieved = await _sut.GetByIdAsync(result.Id);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Status.Should().Be(SummaryJobStatus.Running);
        retrieved.TotalNotes.Should().Be(100);
        retrieved.ProcessedNotes.Should().Be(50);
        retrieved.SuccessCount.Should().Be(45);
        retrieved.FailureCount.Should().Be(3);
        retrieved.SkippedCount.Should().Be(2);
        retrieved.Errors.Should().HaveCount(2);
        retrieved.StartedAt.Should().BeCloseTo(startedAt, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task CreateAsync_SetsCreatedAtTimestamp()
    {
        // Arrange
        var before = DateTime.UtcNow;
        var job = CreateTestJob("user-1");

        // Act
        var result = await _sut.CreateAsync(job);
        var after = DateTime.UtcNow;

        // Assert
        result.CreatedAt.Should().BeOnOrAfter(before);
        result.CreatedAt.Should().BeOnOrBefore(after);
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenExists_ReturnsJob()
    {
        // Arrange
        var job = CreateTestJob("user-1");
        var created = await _sut.CreateAsync(job);

        // Act
        var result = await _sut.GetByIdAsync(created.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(created.Id);
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotExists_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByIdAsync("non-existent-id");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WithValidUpdate_UpdatesFields()
    {
        // Arrange
        var job = CreateTestJob("user-1");
        var created = await _sut.CreateAsync(job);

        var completedAt = DateTime.UtcNow;
        var updateJob = new SummaryJob
        {
            Status = SummaryJobStatus.Completed,
            TotalNotes = 100,
            ProcessedNotes = 100,
            SuccessCount = 95,
            FailureCount = 5,
            SkippedCount = 0,
            Errors = new List<string> { "Some error" },
            StartedAt = DateTime.UtcNow.AddMinutes(-10),
            CompletedAt = completedAt
        };

        // Act
        var result = await _sut.UpdateAsync(created.Id, updateJob);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(SummaryJobStatus.Completed);
        result.TotalNotes.Should().Be(100);
        result.ProcessedNotes.Should().Be(100);
        result.SuccessCount.Should().Be(95);
        result.FailureCount.Should().Be(5);
        result.CompletedAt.Should().BeCloseTo(completedAt, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task UpdateAsync_WhenNotExists_ReturnsNull()
    {
        // Arrange
        var updateJob = new SummaryJob
        {
            Status = SummaryJobStatus.Completed
        };

        // Act
        var result = await _sut.UpdateAsync("non-existent-id", updateJob);

        // Assert
        result.Should().BeNull();
    }

    [Theory]
    [InlineData(SummaryJobStatus.Pending)]
    [InlineData(SummaryJobStatus.Running)]
    [InlineData(SummaryJobStatus.Completed)]
    [InlineData(SummaryJobStatus.Failed)]
    [InlineData(SummaryJobStatus.Cancelled)]
    public async Task UpdateAsync_WithDifferentStatuses_UpdatesStatus(string status)
    {
        // Arrange
        var job = CreateTestJob("user-1");
        var created = await _sut.CreateAsync(job);

        var updateJob = new SummaryJob
        {
            Status = status,
            Errors = new List<string>()
        };

        // Act
        var result = await _sut.UpdateAsync(created.Id, updateJob);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(status);
    }

    [Fact]
    public async Task UpdateAsync_WithErrors_UpdatesErrorsList()
    {
        // Arrange
        var job = CreateTestJob("user-1");
        var created = await _sut.CreateAsync(job);

        var errors = new List<string>
        {
            "Error processing note-1: Invalid format",
            "Error processing note-5: AI service unavailable",
            "Error processing note-10: Content too long"
        };

        var updateJob = new SummaryJob
        {
            Status = SummaryJobStatus.Failed,
            FailureCount = 3,
            Errors = errors
        };

        // Act
        var result = await _sut.UpdateAsync(created.Id, updateJob);
        var retrieved = await _sut.GetByIdAsync(created.Id);

        // Assert
        retrieved!.Errors.Should().HaveCount(3);
        retrieved.Errors.Should().Contain("Error processing note-1: Invalid format");
        retrieved.Errors.Should().Contain("Error processing note-5: AI service unavailable");
    }

    #endregion

    #region GetByUserIdAsync Tests

    [Fact]
    public async Task GetByUserIdAsync_ReturnsUserJobs()
    {
        // Arrange
        var job1 = CreateTestJob("user-1");
        var job2 = CreateTestJob("user-1");
        var job3 = CreateTestJob("user-2");

        await _sut.CreateAsync(job1);
        await _sut.CreateAsync(job2);
        await _sut.CreateAsync(job3);

        // Act
        var result = await _sut.GetByUserIdAsync("user-1");

        // Assert
        var jobs = result.ToList();
        jobs.Should().HaveCount(2);
        jobs.All(j => j.UserId == "user-1").Should().BeTrue();
    }

    [Fact]
    public async Task GetByUserIdAsync_ReturnsOrderedByCreatedAtDescending()
    {
        // Arrange
        var job1 = CreateTestJob("user-1");
        job1.TotalNotes = 10;
        var job2 = CreateTestJob("user-1");
        job2.TotalNotes = 20;
        var job3 = CreateTestJob("user-1");
        job3.TotalNotes = 30;

        await _sut.CreateAsync(job1);
        await Task.Delay(10);
        await _sut.CreateAsync(job2);
        await Task.Delay(10);
        await _sut.CreateAsync(job3);

        // Act
        var result = await _sut.GetByUserIdAsync("user-1");

        // Assert
        var jobs = result.ToList();
        jobs.Should().HaveCount(3);
        // Latest job should be first
        jobs[0].TotalNotes.Should().Be(30);
    }

    [Fact]
    public async Task GetByUserIdAsync_WithNonExistentUser_ReturnsEmpty()
    {
        // Arrange
        await _sut.CreateAsync(CreateTestJob("user-1"));

        // Act
        var result = await _sut.GetByUserIdAsync("non-existent-user");

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region GetLatestByUserIdAsync Tests

    [Fact]
    public async Task GetLatestByUserIdAsync_ReturnsLatestJob()
    {
        // Arrange
        var job1 = CreateTestJob("user-1");
        job1.TotalNotes = 10;
        var job2 = CreateTestJob("user-1");
        job2.TotalNotes = 20;
        var job3 = CreateTestJob("user-1");
        job3.TotalNotes = 30;

        await _sut.CreateAsync(job1);
        await Task.Delay(10);
        await _sut.CreateAsync(job2);
        await Task.Delay(10);
        await _sut.CreateAsync(job3);

        // Act
        var result = await _sut.GetLatestByUserIdAsync("user-1");

        // Assert
        result.Should().NotBeNull();
        result!.TotalNotes.Should().Be(30);
    }

    [Fact]
    public async Task GetLatestByUserIdAsync_WithNoJobs_ReturnsNull()
    {
        // Act
        var result = await _sut.GetLatestByUserIdAsync("non-existent-user");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetLatestByUserIdAsync_ReturnsCorrectUserJob()
    {
        // Arrange
        var user1Job = CreateTestJob("user-1");
        user1Job.TotalNotes = 100;
        var user2Job = CreateTestJob("user-2");
        user2Job.TotalNotes = 200;

        await _sut.CreateAsync(user1Job);
        await Task.Delay(10);
        await _sut.CreateAsync(user2Job);

        // Act
        var result = await _sut.GetLatestByUserIdAsync("user-1");

        // Assert
        result.Should().NotBeNull();
        result!.UserId.Should().Be("user-1");
        result.TotalNotes.Should().Be(100);
    }

    #endregion

    #region GetActiveByUserIdAsync Tests

    [Fact]
    public async Task GetActiveByUserIdAsync_WithPendingJob_ReturnsJob()
    {
        // Arrange
        var pendingJob = CreateTestJob("user-1");
        pendingJob.Status = SummaryJobStatus.Pending;
        await _sut.CreateAsync(pendingJob);

        // Act
        var result = await _sut.GetActiveByUserIdAsync("user-1");

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(SummaryJobStatus.Pending);
    }

    [Fact]
    public async Task GetActiveByUserIdAsync_WithRunningJob_ReturnsJob()
    {
        // Arrange
        var runningJob = CreateTestJob("user-1");
        runningJob.Status = SummaryJobStatus.Running;
        await _sut.CreateAsync(runningJob);

        // Act
        var result = await _sut.GetActiveByUserIdAsync("user-1");

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(SummaryJobStatus.Running);
    }

    [Fact]
    public async Task GetActiveByUserIdAsync_WithCompletedJob_ReturnsNull()
    {
        // Arrange
        var completedJob = CreateTestJob("user-1");
        completedJob.Status = SummaryJobStatus.Completed;
        await _sut.CreateAsync(completedJob);

        // Act
        var result = await _sut.GetActiveByUserIdAsync("user-1");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetActiveByUserIdAsync_WithFailedJob_ReturnsNull()
    {
        // Arrange
        var failedJob = CreateTestJob("user-1");
        failedJob.Status = SummaryJobStatus.Failed;
        await _sut.CreateAsync(failedJob);

        // Act
        var result = await _sut.GetActiveByUserIdAsync("user-1");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetActiveByUserIdAsync_WithCancelledJob_ReturnsNull()
    {
        // Arrange
        var cancelledJob = CreateTestJob("user-1");
        cancelledJob.Status = SummaryJobStatus.Cancelled;
        await _sut.CreateAsync(cancelledJob);

        // Act
        var result = await _sut.GetActiveByUserIdAsync("user-1");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetActiveByUserIdAsync_WithMultipleActiveJobs_ReturnsLatest()
    {
        // Arrange
        var pendingJob = CreateTestJob("user-1");
        pendingJob.Status = SummaryJobStatus.Pending;
        pendingJob.TotalNotes = 50;

        var runningJob = CreateTestJob("user-1");
        runningJob.Status = SummaryJobStatus.Running;
        runningJob.TotalNotes = 100;

        await _sut.CreateAsync(pendingJob);
        await Task.Delay(10);
        await _sut.CreateAsync(runningJob);

        // Act
        var result = await _sut.GetActiveByUserIdAsync("user-1");

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(SummaryJobStatus.Running);
        result.TotalNotes.Should().Be(100);
    }

    [Fact]
    public async Task GetActiveByUserIdAsync_OnlyReturnsRequestedUserJob()
    {
        // Arrange
        var user1RunningJob = CreateTestJob("user-1");
        user1RunningJob.Status = SummaryJobStatus.Running;

        var user2RunningJob = CreateTestJob("user-2");
        user2RunningJob.Status = SummaryJobStatus.Running;

        await _sut.CreateAsync(user1RunningJob);
        await _sut.CreateAsync(user2RunningJob);

        // Act
        var result = await _sut.GetActiveByUserIdAsync("user-1");

        // Assert
        result.Should().NotBeNull();
        result!.UserId.Should().Be("user-1");
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WhenExists_DeletesAndReturnsTrue()
    {
        // Arrange
        var job = CreateTestJob("user-1");
        var created = await _sut.CreateAsync(job);

        // Act
        var result = await _sut.DeleteAsync(created.Id);
        var retrieved = await _sut.GetByIdAsync(created.Id);

        // Assert
        result.Should().BeTrue();
        retrieved.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenNotExists_ReturnsFalse()
    {
        // Act
        var result = await _sut.DeleteAsync("non-existent-id");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_DoesNotAffectOtherJobs()
    {
        // Arrange
        var job1 = CreateTestJob("user-1");
        var job2 = CreateTestJob("user-1");

        var created1 = await _sut.CreateAsync(job1);
        var created2 = await _sut.CreateAsync(job2);

        // Act
        await _sut.DeleteAsync(created1.Id);
        var remaining = await _sut.GetByUserIdAsync("user-1");

        // Assert
        remaining.Should().HaveCount(1);
        remaining.First().Id.Should().Be(created2.Id);
    }

    #endregion

    #region Helper Methods

    private static SummaryJob CreateTestJob(string userId)
    {
        return new SummaryJob
        {
            Id = UuidV7.NewId(),
            UserId = userId,
            Status = SummaryJobStatus.Pending,
            TotalNotes = 0,
            ProcessedNotes = 0,
            SuccessCount = 0,
            FailureCount = 0,
            SkippedCount = 0,
            Errors = new List<string>()
        };
    }

    #endregion
}
