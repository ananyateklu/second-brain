using Microsoft.Extensions.Logging;
using Moq;
using NpgsqlTypes;
using SecondBrain.Core.Entities;
using SecondBrain.Infrastructure.Repositories;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.Repositories;

[Collection("PostgreSQL")]
public class NoteVersionRepositoryTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly Mock<ILogger<SqlNoteVersionRepository>> _mockLogger;
    private SqlNoteVersionRepository _sut = null!;

    public NoteVersionRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
        _mockLogger = new Mock<ILogger<SqlNoteVersionRepository>>();
    }

    public async Task InitializeAsync()
    {
        // Clean up note versions data before each test
        await using var dbContext = _fixture.CreateDbContext();
        dbContext.NoteVersions.RemoveRange(dbContext.NoteVersions);
        dbContext.Notes.RemoveRange(dbContext.Notes);
        await dbContext.SaveChangesAsync();

        // Create a fresh repository for each test
        _sut = new SqlNoteVersionRepository(_fixture.CreateDbContext(), _mockLogger.Object);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    #region GetCurrentVersionAsync Tests

    [Fact]
    public async Task GetCurrentVersionAsync_WhenVersionExists_ReturnsCurrentVersion()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1, isCurrent: true);

        // Act
        var result = await _sut.GetCurrentVersionAsync(noteId);

        // Assert
        result.Should().NotBeNull();
        result!.NoteId.Should().Be(noteId);
        result.VersionNumber.Should().Be(1);
        result.ValidPeriod.UpperBoundInfinite.Should().BeTrue();
    }

    [Fact]
    public async Task GetCurrentVersionAsync_WhenNoCurrentVersion_ReturnsNull()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1, isCurrent: false);

        // Act
        var result = await _sut.GetCurrentVersionAsync(noteId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetCurrentVersionAsync_WithMultipleVersions_ReturnsOnlyCurrentVersion()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1, isCurrent: false);
        await CreateTestVersionAsync(noteId, versionNumber: 2, isCurrent: false);
        await CreateTestVersionAsync(noteId, versionNumber: 3, isCurrent: true);

        // Act
        var result = await _sut.GetCurrentVersionAsync(noteId);

        // Assert
        result.Should().NotBeNull();
        result!.VersionNumber.Should().Be(3);
    }

    #endregion

    #region GetVersionHistoryAsync Tests

    [Fact]
    public async Task GetVersionHistoryAsync_WhenNoVersions_ReturnsEmptyList()
    {
        // Act
        var result = await _sut.GetVersionHistoryAsync("non-existent-note");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetVersionHistoryAsync_ReturnsAllVersions()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1);
        await CreateTestVersionAsync(noteId, versionNumber: 2);
        await CreateTestVersionAsync(noteId, versionNumber: 3);

        // Act
        var result = await _sut.GetVersionHistoryAsync(noteId);

        // Assert
        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetVersionHistoryAsync_ReturnsVersionsOrderedByCreatedAtDescending()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1, createdAt: DateTime.UtcNow.AddMinutes(-10));
        await CreateTestVersionAsync(noteId, versionNumber: 2, createdAt: DateTime.UtcNow.AddMinutes(-5));
        await CreateTestVersionAsync(noteId, versionNumber: 3, createdAt: DateTime.UtcNow);

        // Act
        var result = await _sut.GetVersionHistoryAsync(noteId);

        // Assert
        result.Should().HaveCount(3);
        result[0].VersionNumber.Should().Be(3);
        result[1].VersionNumber.Should().Be(2);
        result[2].VersionNumber.Should().Be(1);
    }

    [Fact]
    public async Task GetVersionHistoryAsync_ReturnsOnlyVersionsForSpecificNote()
    {
        // Arrange
        var noteId1 = CreateNoteId();
        var noteId2 = CreateNoteId();
        await CreateTestVersionAsync(noteId1, versionNumber: 1);
        await CreateTestVersionAsync(noteId1, versionNumber: 2);
        await CreateTestVersionAsync(noteId2, versionNumber: 1);

        // Act
        var result = await _sut.GetVersionHistoryAsync(noteId1);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(v => v.NoteId.Should().Be(noteId1));
    }

    #endregion

    #region GetVersionHistoryAsync Paginated Tests

    [Fact]
    public async Task GetVersionHistoryAsync_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        var noteId = CreateNoteId();
        for (int i = 1; i <= 5; i++)
        {
            await CreateTestVersionAsync(noteId, versionNumber: i, createdAt: DateTime.UtcNow.AddMinutes(-i));
        }

        // Act
        var result = await _sut.GetVersionHistoryAsync(noteId, skip: 1, take: 2);

        // Assert
        result.Should().HaveCount(2);
        result[0].VersionNumber.Should().Be(4); // Second most recent
        result[1].VersionNumber.Should().Be(3); // Third most recent
    }

    [Fact]
    public async Task GetVersionHistoryAsync_WithSkipBeyondCount_ReturnsEmpty()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1);
        await CreateTestVersionAsync(noteId, versionNumber: 2);

        // Act
        var result = await _sut.GetVersionHistoryAsync(noteId, skip: 10, take: 5);

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region GetVersionCountAsync Tests

    [Fact]
    public async Task GetVersionCountAsync_WhenNoVersions_ReturnsZero()
    {
        // Act
        var result = await _sut.GetVersionCountAsync("non-existent-note");

        // Assert
        result.Should().Be(0);
    }

    [Fact]
    public async Task GetVersionCountAsync_ReturnsCorrectCount()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1);
        await CreateTestVersionAsync(noteId, versionNumber: 2);
        await CreateTestVersionAsync(noteId, versionNumber: 3);

        // Act
        var result = await _sut.GetVersionCountAsync(noteId);

        // Assert
        result.Should().Be(3);
    }

    [Fact]
    public async Task GetVersionCountAsync_CountsOnlySpecificNoteVersions()
    {
        // Arrange
        var noteId1 = CreateNoteId();
        var noteId2 = CreateNoteId();
        await CreateTestVersionAsync(noteId1, versionNumber: 1);
        await CreateTestVersionAsync(noteId1, versionNumber: 2);
        await CreateTestVersionAsync(noteId2, versionNumber: 1);

        // Act
        var result = await _sut.GetVersionCountAsync(noteId1);

        // Assert
        result.Should().Be(2);
    }

    #endregion

    #region GetVersionByNumberAsync Tests

    [Fact]
    public async Task GetVersionByNumberAsync_WhenVersionExists_ReturnsVersion()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1);
        await CreateTestVersionAsync(noteId, versionNumber: 2);

        // Act
        var result = await _sut.GetVersionByNumberAsync(noteId, versionNumber: 2);

        // Assert
        result.Should().NotBeNull();
        result!.VersionNumber.Should().Be(2);
    }

    [Fact]
    public async Task GetVersionByNumberAsync_WhenVersionDoesNotExist_ReturnsNull()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1);

        // Act
        var result = await _sut.GetVersionByNumberAsync(noteId, versionNumber: 99);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetVersionByNumberAsync_PreservesAllFields()
    {
        // Arrange
        var noteId = CreateNoteId();
        var version = await CreateTestVersionAsync(noteId, versionNumber: 1);

        // Act
        var result = await _sut.GetVersionByNumberAsync(noteId, versionNumber: 1);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be(version.Title);
        result.Content.Should().Be(version.Content);
        result.ModifiedBy.Should().Be(version.ModifiedBy);
        result.ChangeSummary.Should().Be(version.ChangeSummary);
    }

    #endregion

    #region GetVersionsByUserAsync Tests

    [Fact]
    public async Task GetVersionsByUserAsync_WhenNoVersions_ReturnsEmptyList()
    {
        // Act
        var result = await _sut.GetVersionsByUserAsync("user-123", skip: 0, take: 10);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetVersionsByUserAsync_ReturnsVersionsByUser()
    {
        // Arrange
        var noteId1 = CreateNoteId();
        var noteId2 = CreateNoteId();
        await CreateTestVersionAsync(noteId1, versionNumber: 1, modifiedBy: "user-123");
        await CreateTestVersionAsync(noteId1, versionNumber: 2, modifiedBy: "user-123");
        await CreateTestVersionAsync(noteId2, versionNumber: 1, modifiedBy: "user-456");

        // Act
        var result = await _sut.GetVersionsByUserAsync("user-123", skip: 0, take: 10);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(v => v.ModifiedBy.Should().Be("user-123"));
    }

    [Fact]
    public async Task GetVersionsByUserAsync_ReturnsVersionsOrderedByCreatedAtDescending()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1, modifiedBy: "user-123", createdAt: DateTime.UtcNow.AddMinutes(-10));
        await CreateTestVersionAsync(noteId, versionNumber: 2, modifiedBy: "user-123", createdAt: DateTime.UtcNow);

        // Act
        var result = await _sut.GetVersionsByUserAsync("user-123", skip: 0, take: 10);

        // Assert
        result.Should().HaveCount(2);
        result[0].VersionNumber.Should().Be(2);
        result[1].VersionNumber.Should().Be(1);
    }

    [Fact]
    public async Task GetVersionsByUserAsync_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        var noteId = CreateNoteId();
        for (int i = 1; i <= 5; i++)
        {
            await CreateTestVersionAsync(noteId, versionNumber: i, modifiedBy: "user-123", createdAt: DateTime.UtcNow.AddMinutes(-i));
        }

        // Act
        var result = await _sut.GetVersionsByUserAsync("user-123", skip: 2, take: 2);

        // Assert
        result.Should().HaveCount(2);
        result[0].VersionNumber.Should().Be(3);
        result[1].VersionNumber.Should().Be(2);
    }

    #endregion

    #region GetVersionDiffAsync Tests

    [Fact]
    public async Task GetVersionDiffAsync_WhenBothVersionsExist_ReturnsBoth()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1, title: "Original Title");
        await CreateTestVersionAsync(noteId, versionNumber: 2, title: "Updated Title");

        // Act
        var result = await _sut.GetVersionDiffAsync(noteId, fromVersion: 1, toVersion: 2);

        // Assert
        result.Should().NotBeNull();
        result!.Value.From.Title.Should().Be("Original Title");
        result.Value.To.Title.Should().Be("Updated Title");
    }

    [Fact]
    public async Task GetVersionDiffAsync_WhenFromVersionMissing_ReturnsNull()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 2);

        // Act
        var result = await _sut.GetVersionDiffAsync(noteId, fromVersion: 1, toVersion: 2);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetVersionDiffAsync_WhenToVersionMissing_ReturnsNull()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1);

        // Act
        var result = await _sut.GetVersionDiffAsync(noteId, fromVersion: 1, toVersion: 2);

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region CreateInitialVersionAsync Tests

    [Fact]
    public async Task CreateInitialVersionAsync_CreatesVersionWithCorrectData()
    {
        // Arrange
        var note = CreateTestNote();

        // Act
        var version = await _sut.CreateInitialVersionAsync(note, createdBy: "user-123");

        // Assert
        version.Should().NotBeNull();
        version.NoteId.Should().Be(note.Id);
        version.Title.Should().Be(note.Title);
        version.Content.Should().Be(note.Content);
        version.ModifiedBy.Should().Be("user-123");
        version.VersionNumber.Should().Be(1);
        version.ChangeSummary.Should().Be("Initial version");
    }

    [Fact]
    public async Task CreateInitialVersionAsync_CreatesVersionWithInfiniteUpperBound()
    {
        // Arrange
        var note = CreateTestNote();

        // Act
        var version = await _sut.CreateInitialVersionAsync(note, createdBy: "user-123");

        // Assert
        version.ValidPeriod.UpperBoundInfinite.Should().BeTrue();
    }

    [Fact]
    public async Task CreateInitialVersionAsync_PreservesNoteFields()
    {
        // Arrange
        var note = CreateTestNote();
        note.Tags = new List<string> { "tag1", "tag2" };
        note.IsArchived = true;
        note.Folder = "test-folder";

        // Act
        var version = await _sut.CreateInitialVersionAsync(note, createdBy: "user-123");

        // Assert
        version.Tags.Should().BeEquivalentTo(new[] { "tag1", "tag2" });
        version.IsArchived.Should().BeTrue();
        version.Folder.Should().Be("test-folder");
    }

    #endregion

    #region DeleteAllVersionsAsync Tests

    [Fact]
    public async Task DeleteAllVersionsAsync_WhenNoVersions_ReturnsZero()
    {
        // Act
        var result = await _sut.DeleteAllVersionsAsync("non-existent-note");

        // Assert
        result.Should().Be(0);
    }

    [Fact]
    public async Task DeleteAllVersionsAsync_DeletesAllVersionsForNote()
    {
        // Arrange
        var noteId = CreateNoteId();
        await CreateTestVersionAsync(noteId, versionNumber: 1);
        await CreateTestVersionAsync(noteId, versionNumber: 2);
        await CreateTestVersionAsync(noteId, versionNumber: 3);

        // Act
        var deleted = await _sut.DeleteAllVersionsAsync(noteId);

        // Assert
        deleted.Should().Be(3);

        // Verify they're gone
        var remaining = await _sut.GetVersionHistoryAsync(noteId);
        remaining.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteAllVersionsAsync_OnlyDeletesSpecificNoteVersions()
    {
        // Arrange
        var noteId1 = CreateNoteId();
        var noteId2 = CreateNoteId();
        await CreateTestVersionAsync(noteId1, versionNumber: 1);
        await CreateTestVersionAsync(noteId1, versionNumber: 2);
        await CreateTestVersionAsync(noteId2, versionNumber: 1);

        // Act
        var deleted = await _sut.DeleteAllVersionsAsync(noteId1);

        // Assert
        deleted.Should().Be(2);

        // Verify noteId2 versions are still there
        var remaining = await _sut.GetVersionHistoryAsync(noteId2);
        remaining.Should().ContainSingle();
    }

    #endregion

    #region Helper Methods

    private static string CreateNoteId() => Guid.NewGuid().ToString();

    private async Task<NoteVersion> CreateTestVersionAsync(
        string noteId,
        int versionNumber,
        bool isCurrent = true,
        string? title = null,
        string? modifiedBy = null,
        DateTime? createdAt = null)
    {
        var now = createdAt ?? DateTime.UtcNow;
        var version = new NoteVersion
        {
            Id = Guid.NewGuid().ToString(),
            NoteId = noteId,
            ValidPeriod = isCurrent
                ? new NpgsqlRange<DateTime>(now, true, false, default, false, true) // [now, infinity)
                : new NpgsqlRange<DateTime>(now.AddMinutes(-10), true, false, now, false, false), // [now-10, now)
            Title = title ?? $"Test Note v{versionNumber}",
            Content = $"Content for version {versionNumber}",
            Tags = new List<string> { "test" },
            IsArchived = false,
            Folder = null,
            ModifiedBy = modifiedBy ?? "test-user",
            VersionNumber = versionNumber,
            ChangeSummary = $"Version {versionNumber}",
            Source = "test",
            ImageIds = new List<string>(),
            CreatedAt = now
        };

        await using var dbContext = _fixture.CreateDbContext();
        dbContext.NoteVersions.Add(version);
        await dbContext.SaveChangesAsync();

        return version;
    }

    private static Note CreateTestNote()
    {
        return new Note
        {
            Id = Guid.NewGuid().ToString(),
            Title = "Test Note",
            Content = "Test content",
            UserId = "test-user",
            Tags = new List<string>(),
            IsArchived = false,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
