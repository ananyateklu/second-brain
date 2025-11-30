using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Infrastructure.Repositories;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.Repositories;

[Collection("PostgreSQL")]
public class IndexingJobRepositoryTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly Mock<ILogger<SqlIndexingJobRepository>> _mockLogger;
    private SqlIndexingJobRepository _sut = null!;

    public IndexingJobRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
        _mockLogger = new Mock<ILogger<SqlIndexingJobRepository>>();
    }

    public async Task InitializeAsync()
    {
        // Clean up indexing jobs before each test
        await using var dbContext = _fixture.CreateDbContext();
        dbContext.IndexingJobs.RemoveRange(dbContext.IndexingJobs);
        await dbContext.SaveChangesAsync();

        // Create a fresh repository for each test
        _sut = new SqlIndexingJobRepository(_fixture.CreateDbContext(), _mockLogger.Object);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WhenValidJob_CreatesAndReturnsJob()
    {
        // Arrange
        var job = CreateTestJob("job-1", "user-123");

        // Act
        var created = await _sut.CreateAsync(job);

        // Assert
        created.Should().NotBeNull();
        created.Id.Should().Be("job-1");
        created.UserId.Should().Be("user-123");
        created.Status.Should().Be(IndexingStatus.Pending);
        created.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CreateAsync_WhenNoId_GeneratesId()
    {
        // Arrange
        var job = CreateTestJob("", "user-123");
        job.Id = "";

        // Act
        var created = await _sut.CreateAsync(job);

        // Assert
        created.Id.Should().NotBeNullOrEmpty();
        Guid.TryParse(created.Id, out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateAsync_SetsTimestamp()
    {
        // Arrange
        var job = CreateTestJob("job-1", "user-123");
        job.CreatedAt = default;
        var beforeCreate = DateTime.UtcNow;

        // Act
        var created = await _sut.CreateAsync(job);
        var afterCreate = DateTime.UtcNow;

        // Assert
        created.CreatedAt.Should().BeOnOrAfter(beforeCreate).And.BeOnOrBefore(afterCreate);
    }

    [Fact]
    public async Task CreateAsync_PersistsAllProperties()
    {
        // Arrange
        var job = CreateTestJob("job-1", "user-123");
        job.TotalNotes = 100;
        job.ProcessedNotes = 0;
        job.TotalChunks = 500;
        job.ProcessedChunks = 0;
        job.EmbeddingProvider = "openai";
        job.Errors = new List<string>();

        // Act
        await _sut.CreateAsync(job);
        var retrieved = await _sut.GetByIdAsync("job-1");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.TotalNotes.Should().Be(100);
        retrieved.ProcessedNotes.Should().Be(0);
        retrieved.TotalChunks.Should().Be(500);
        retrieved.ProcessedChunks.Should().Be(0);
        retrieved.EmbeddingProvider.Should().Be("openai");
        retrieved.Errors.Should().BeEmpty();
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenJobExists_ReturnsJob()
    {
        // Arrange
        var job = CreateTestJob("job-1", "user-123");
        await _sut.CreateAsync(job);

        // Act
        var retrieved = await _sut.GetByIdAsync("job-1");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Id.Should().Be("job-1");
        retrieved.UserId.Should().Be("user-123");
    }

    [Fact]
    public async Task GetByIdAsync_WhenJobDoesNotExist_ReturnsNull()
    {
        // Act
        var retrieved = await _sut.GetByIdAsync("non-existent");

        // Assert
        retrieved.Should().BeNull();
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WhenJobExists_UpdatesAndReturnsJob()
    {
        // Arrange
        var job = CreateTestJob("job-1", "user-123");
        await _sut.CreateAsync(job);

        var updateJob = CreateTestJob("job-1", "user-123");
        updateJob.Status = IndexingStatus.Running;
        updateJob.TotalNotes = 50;
        updateJob.ProcessedNotes = 25;
        updateJob.TotalChunks = 200;
        updateJob.ProcessedChunks = 100;
        updateJob.Errors = new List<string> { "Error 1" };
        updateJob.EmbeddingProvider = "gemini";
        updateJob.StartedAt = DateTime.UtcNow;
        updateJob.CompletedAt = null;

        // Act
        var updated = await _sut.UpdateAsync("job-1", updateJob);

        // Assert
        updated.Should().NotBeNull();
        updated!.Status.Should().Be(IndexingStatus.Running);
        updated.TotalNotes.Should().Be(50);
        updated.ProcessedNotes.Should().Be(25);
        updated.TotalChunks.Should().Be(200);
        updated.ProcessedChunks.Should().Be(100);
        updated.Errors.Should().Contain("Error 1");
        updated.EmbeddingProvider.Should().Be("gemini");
        updated.StartedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateAsync_WhenJobDoesNotExist_ReturnsNull()
    {
        // Arrange
        var updateJob = CreateTestJob("non-existent", "user-123");

        // Act
        var updated = await _sut.UpdateAsync("non-existent", updateJob);

        // Assert
        updated.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_UpdatesAllFields()
    {
        // Arrange
        var job = CreateTestJob("job-1", "user-123");
        job.Status = IndexingStatus.Pending;
        job.TotalNotes = 10;
        job.ProcessedNotes = 0;
        await _sut.CreateAsync(job);

        var updateJob = CreateTestJob("job-1", "user-123");
        updateJob.Status = IndexingStatus.Completed;
        updateJob.TotalNotes = 10;
        updateJob.ProcessedNotes = 10;
        updateJob.TotalChunks = 50;
        updateJob.ProcessedChunks = 50;
        updateJob.Errors = new List<string>();
        updateJob.CompletedAt = DateTime.UtcNow;

        // Act
        var updated = await _sut.UpdateAsync("job-1", updateJob);

        // Assert
        updated!.Status.Should().Be(IndexingStatus.Completed);
        updated.ProcessedNotes.Should().Be(10);
        updated.ProcessedChunks.Should().Be(50);
        updated.CompletedAt.Should().NotBeNull();
    }

    #endregion

    #region GetByUserIdAsync Tests

    [Fact]
    public async Task GetByUserIdAsync_WhenJobsExist_ReturnsAllJobsForUser()
    {
        // Arrange
        var user1Jobs = new List<IndexingJob>
        {
            CreateTestJob("job-1", "user-123"),
            CreateTestJob("job-2", "user-123"),
            CreateTestJob("job-3", "user-123")
        };
        var user2Job = CreateTestJob("job-4", "user-456");

        foreach (var job in user1Jobs)
        {
            await _sut.CreateAsync(job);
        }
        await _sut.CreateAsync(user2Job);

        // Act
        var result = await _sut.GetByUserIdAsync("user-123");

        // Assert
        result.Should().HaveCount(3);
        result.Select(j => j.Id).Should().BeEquivalentTo(new[] { "job-1", "job-2", "job-3" });
    }

    [Fact]
    public async Task GetByUserIdAsync_ReturnsJobsOrderedByCreatedAtDescending()
    {
        // Arrange
        var job1 = CreateTestJob("job-1", "user-123");
        await _sut.CreateAsync(job1);
        await Task.Delay(10);

        var job2 = CreateTestJob("job-2", "user-123");
        await _sut.CreateAsync(job2);
        await Task.Delay(10);

        var job3 = CreateTestJob("job-3", "user-123");
        await _sut.CreateAsync(job3);

        // Act
        var result = (await _sut.GetByUserIdAsync("user-123")).ToList();

        // Assert
        result.Should().HaveCount(3);
        result[0].Id.Should().Be("job-3");
        result[1].Id.Should().Be("job-2");
        result[2].Id.Should().Be("job-1");
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
    public async Task GetLatestByUserIdAsync_WhenJobsExist_ReturnsLatestJob()
    {
        // Arrange
        var job1 = CreateTestJob("job-1", "user-123");
        await _sut.CreateAsync(job1);
        await Task.Delay(10);

        var job2 = CreateTestJob("job-2", "user-123");
        await _sut.CreateAsync(job2);
        await Task.Delay(10);

        var job3 = CreateTestJob("job-3", "user-123");
        await _sut.CreateAsync(job3);

        // Act
        var result = await _sut.GetLatestByUserIdAsync("user-123");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("job-3");
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
    public async Task GetLatestByUserIdAsync_OnlyReturnsJobsForSpecifiedUser()
    {
        // Arrange
        var user1Job = CreateTestJob("job-1", "user-123");
        await _sut.CreateAsync(user1Job);
        await Task.Delay(10);

        var user2Job = CreateTestJob("job-2", "user-456");
        await _sut.CreateAsync(user2Job);

        // Act
        var user1Latest = await _sut.GetLatestByUserIdAsync("user-123");
        var user2Latest = await _sut.GetLatestByUserIdAsync("user-456");

        // Assert
        user1Latest!.Id.Should().Be("job-1");
        user2Latest!.Id.Should().Be("job-2");
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WhenJobExists_DeletesAndReturnsTrue()
    {
        // Arrange
        var job = CreateTestJob("job-1", "user-123");
        await _sut.CreateAsync(job);

        // Act
        var deleted = await _sut.DeleteAsync("job-1");

        // Assert
        deleted.Should().BeTrue();

        var retrieved = await _sut.GetByIdAsync("job-1");
        retrieved.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenJobDoesNotExist_ReturnsFalse()
    {
        // Act
        var deleted = await _sut.DeleteAsync("non-existent");

        // Assert
        deleted.Should().BeFalse();
    }

    #endregion

    #region Helper Methods

    private static IndexingJob CreateTestJob(string id, string userId)
    {
        return new IndexingJob
        {
            Id = id,
            UserId = userId,
            Status = IndexingStatus.Pending,
            TotalNotes = 0,
            ProcessedNotes = 0,
            TotalChunks = 0,
            ProcessedChunks = 0,
            Errors = new List<string>(),
            EmbeddingProvider = "openai",
            CreatedAt = DateTime.UtcNow
        };
    }

    #endregion
}

