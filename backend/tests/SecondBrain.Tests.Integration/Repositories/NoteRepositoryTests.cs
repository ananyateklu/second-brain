using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Infrastructure.Repositories;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.Repositories;

[Collection("PostgreSQL")]
public class NoteRepositoryTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly Mock<ILogger<SqlNoteRepository>> _mockLogger;
    private SqlNoteRepository _sut = null!;

    public NoteRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
        _mockLogger = new Mock<ILogger<SqlNoteRepository>>();
    }

    public async Task InitializeAsync()
    {
        // Clean up notes before each test
        await using var dbContext = _fixture.CreateDbContext();
        dbContext.Notes.RemoveRange(dbContext.Notes);
        await dbContext.SaveChangesAsync();

        // Create a fresh repository for each test
        _sut = new SqlNoteRepository(_fixture.CreateDbContext(), _mockLogger.Object);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WhenValidNote_CreatesAndReturnsNote()
    {
        // Arrange
        var note = CreateTestNote("note-1", "user-123", "Test Note");

        // Act
        var created = await _sut.CreateAsync(note);

        // Assert
        created.Should().NotBeNull();
        created.Id.Should().Be("note-1");
        created.Title.Should().Be("Test Note");
        created.UserId.Should().Be("user-123");
    }

    [Fact]
    public async Task CreateAsync_WhenNoId_GeneratesId()
    {
        // Arrange
        var note = CreateTestNote("", "user-123", "Test Note");
        note.Id = ""; // Ensure ID is empty

        // Act
        var created = await _sut.CreateAsync(note);

        // Assert
        created.Id.Should().NotBeNullOrEmpty();
        Guid.TryParse(created.Id, out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateAsync_SetsTimestamps()
    {
        // Arrange
        var note = CreateTestNote("note-1", "user-123", "Test Note");
        note.CreatedAt = default;
        note.UpdatedAt = default;
        var beforeCreate = DateTime.UtcNow;

        // Act
        var created = await _sut.CreateAsync(note);
        var afterCreate = DateTime.UtcNow;

        // Assert
        created.CreatedAt.Should().BeOnOrAfter(beforeCreate).And.BeOnOrBefore(afterCreate);
        created.UpdatedAt.Should().BeOnOrAfter(beforeCreate).And.BeOnOrBefore(afterCreate);
    }

    [Fact]
    public async Task CreateAsync_WhenEmptyTitle_ThrowsArgumentException()
    {
        // Arrange
        var note = CreateTestNote("note-1", "user-123", "");

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateAsync(note));
    }

    [Fact]
    public async Task CreateAsync_WhenEmptyContent_ThrowsArgumentException()
    {
        // Arrange
        var note = CreateTestNote("note-1", "user-123", "Title");
        note.Content = "";

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _sut.CreateAsync(note));
    }

    [Fact]
    public async Task CreateAsync_PersistsTagsAndFolder()
    {
        // Arrange
        var note = CreateTestNote("note-1", "user-123", "Test Note");
        note.Tags = new List<string> { "tag1", "tag2", "tag3" };
        note.Folder = "Work/Projects";

        // Act
        await _sut.CreateAsync(note);
        var retrieved = await _sut.GetByIdAsync("note-1");

        // Assert
        retrieved!.Tags.Should().BeEquivalentTo(new[] { "tag1", "tag2", "tag3" });
        retrieved.Folder.Should().Be("Work/Projects");
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenNoteExists_ReturnsNote()
    {
        // Arrange
        var note = CreateTestNote("note-1", "user-123", "Test Note");
        await _sut.CreateAsync(note);

        // Act
        var retrieved = await _sut.GetByIdAsync("note-1");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Id.Should().Be("note-1");
        retrieved.Title.Should().Be("Test Note");
    }

    [Fact]
    public async Task GetByIdAsync_WhenNoteDoesNotExist_ReturnsNull()
    {
        // Act
        var retrieved = await _sut.GetByIdAsync("non-existent");

        // Assert
        retrieved.Should().BeNull();
    }

    #endregion

    #region GetByUserIdAsync Tests

    [Fact]
    public async Task GetByUserIdAsync_WhenNotesExist_ReturnsUserNotes()
    {
        // Arrange
        var user1 = "user-1";
        var user2 = "user-2";
        await _sut.CreateAsync(CreateTestNote("note-1", user1, "User 1 Note 1"));
        await _sut.CreateAsync(CreateTestNote("note-2", user1, "User 1 Note 2"));
        await _sut.CreateAsync(CreateTestNote("note-3", user2, "User 2 Note"));

        // Act
        var user1Notes = await _sut.GetByUserIdAsync(user1);

        // Assert
        user1Notes.Should().HaveCount(2);
        user1Notes.Select(n => n.Id).Should().BeEquivalentTo(new[] { "note-1", "note-2" });
    }

    [Fact]
    public async Task GetByUserIdAsync_WhenNoNotes_ReturnsEmptyList()
    {
        // Act
        var notes = await _sut.GetByUserIdAsync("user-with-no-notes");

        // Assert
        notes.Should().BeEmpty();
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WhenNoteExists_UpdatesAndReturnsNote()
    {
        // Arrange
        var note = CreateTestNote("note-1", "user-123", "Original Title");
        await _sut.CreateAsync(note);

        var updateNote = CreateTestNote("note-1", "user-123", "Updated Title");
        updateNote.Content = "Updated Content";
        updateNote.Tags = new List<string> { "updated-tag" };
        updateNote.IsArchived = true;

        // Act
        var updated = await _sut.UpdateAsync("note-1", updateNote);

        // Assert
        updated.Should().NotBeNull();
        updated!.Title.Should().Be("Updated Title");
        updated.Content.Should().Be("Updated Content");
        updated.Tags.Should().Contain("updated-tag");
        updated.IsArchived.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateAsync_WhenNoteDoesNotExist_ReturnsNull()
    {
        // Arrange
        var updateNote = CreateTestNote("non-existent", "user-123", "Title");

        // Act
        var updated = await _sut.UpdateAsync("non-existent", updateNote);

        // Assert
        updated.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_UpdatesTimestamp()
    {
        // Arrange
        var note = CreateTestNote("note-1", "user-123", "Title");
        await _sut.CreateAsync(note);
        var originalNote = await _sut.GetByIdAsync("note-1");
        var originalUpdatedAt = originalNote!.UpdatedAt;

        await Task.Delay(100); // Small delay to ensure timestamp difference

        var updateNote = CreateTestNote("note-1", "user-123", "Updated Title");

        // Act
        var updated = await _sut.UpdateAsync("note-1", updateNote);

        // Assert
        updated!.UpdatedAt.Should().BeAfter(originalUpdatedAt);
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WhenNoteExists_DeletesAndReturnsTrue()
    {
        // Arrange
        var note = CreateTestNote("note-1", "user-123", "Test Note");
        await _sut.CreateAsync(note);

        // Act
        var deleted = await _sut.DeleteAsync("note-1");

        // Assert
        deleted.Should().BeTrue();

        var retrieved = await _sut.GetByIdAsync("note-1");
        retrieved.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenNoteDoesNotExist_ReturnsFalse()
    {
        // Act
        var deleted = await _sut.DeleteAsync("non-existent");

        // Assert
        deleted.Should().BeFalse();
    }

    #endregion

    #region GetByUserIdAndExternalIdAsync Tests

    [Fact]
    public async Task GetByUserIdAndExternalIdAsync_WhenNoteExists_ReturnsNote()
    {
        // Arrange
        var note = CreateTestNote("note-1", "user-123", "Test Note");
        note.ExternalId = "ext-123";
        note.Source = "apple-notes";
        await _sut.CreateAsync(note);

        // Act
        var retrieved = await _sut.GetByUserIdAndExternalIdAsync("user-123", "ext-123");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Id.Should().Be("note-1");
        retrieved.ExternalId.Should().Be("ext-123");
    }

    [Fact]
    public async Task GetByUserIdAndExternalIdAsync_WhenNotFound_ReturnsNull()
    {
        // Act
        var retrieved = await _sut.GetByUserIdAndExternalIdAsync("user-123", "non-existent");

        // Assert
        retrieved.Should().BeNull();
    }

    [Fact]
    public async Task GetByUserIdAndExternalIdAsync_OnlyMatchesCorrectUser()
    {
        // Arrange
        var note = CreateTestNote("note-1", "user-1", "Test Note");
        note.ExternalId = "ext-123";
        await _sut.CreateAsync(note);

        // Act
        var retrievedWrongUser = await _sut.GetByUserIdAndExternalIdAsync("user-2", "ext-123");
        var retrievedCorrectUser = await _sut.GetByUserIdAndExternalIdAsync("user-1", "ext-123");

        // Assert
        retrievedWrongUser.Should().BeNull();
        retrievedCorrectUser.Should().NotBeNull();
    }

    #endregion

    #region GetAllAsync Tests

    [Fact]
    public async Task GetAllAsync_WhenNotesExist_ReturnsAllNotes()
    {
        // Arrange
        await _sut.CreateAsync(CreateTestNote("note-1", "user-1", "Note 1"));
        await _sut.CreateAsync(CreateTestNote("note-2", "user-2", "Note 2"));
        await _sut.CreateAsync(CreateTestNote("note-3", "user-1", "Note 3"));

        // Act
        var allNotes = await _sut.GetAllAsync();

        // Assert
        allNotes.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetAllAsync_WhenNoNotes_ReturnsEmptyList()
    {
        // Act
        var allNotes = await _sut.GetAllAsync();

        // Assert
        allNotes.Should().BeEmpty();
    }

    #endregion

    #region Helper Methods

    private static Note CreateTestNote(string id, string userId, string title)
    {
        return new Note
        {
            Id = id,
            UserId = userId,
            Title = title,
            Content = $"Content for {title}",
            Tags = new List<string>(),
            IsArchived = false,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}

