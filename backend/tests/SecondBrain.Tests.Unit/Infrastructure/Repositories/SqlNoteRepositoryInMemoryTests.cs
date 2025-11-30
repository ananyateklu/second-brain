using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Tests.Unit.Infrastructure.Repositories;

/// <summary>
/// Test-specific DbContext that doesn't use PostgreSQL extensions for InMemory testing
/// </summary>
public class TestDbContext : DbContext
{
    public TestDbContext(DbContextOptions<TestDbContext> options)
        : base(options)
    {
    }

    public DbSet<Note> Notes { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<UserPreferences> UserPreferences { get; set; } = null!;
}

/// <summary>
/// Test-specific implementation of INoteRepository using InMemory database
/// Mirrors SqlNoteRepository but without PostgreSQL dependencies
/// </summary>
public class TestNoteRepository : INoteRepository
{
    private readonly TestDbContext _context;
    private readonly ILogger<TestNoteRepository> _logger;

    public TestNoteRepository(TestDbContext context, ILogger<TestNoteRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<Note>> GetAllAsync()
    {
        return await _context.Notes.AsNoTracking().ToListAsync();
    }

    public async Task<Note?> GetByIdAsync(string id)
    {
        return await _context.Notes.AsNoTracking().FirstOrDefaultAsync(n => n.Id == id);
    }

    public async Task<Note> CreateAsync(Note note)
    {
        if (string.IsNullOrWhiteSpace(note.Content))
            throw new ArgumentException("Note content cannot be null or empty", nameof(note));
        if (string.IsNullOrWhiteSpace(note.Title))
            throw new ArgumentException("Note title cannot be null or empty", nameof(note));

        if (string.IsNullOrEmpty(note.Id))
            note.Id = Guid.NewGuid().ToString();

        var now = DateTime.UtcNow;
        if (note.CreatedAt == default || Math.Abs((note.CreatedAt - now).TotalSeconds) < 1)
            note.CreatedAt = now;
        if (note.UpdatedAt == default || Math.Abs((note.UpdatedAt - now).TotalSeconds) < 1)
            note.UpdatedAt = now;

        _context.Notes.Add(note);
        await _context.SaveChangesAsync();
        return note;
    }

    public async Task<Note?> UpdateAsync(string id, Note note)
    {
        var existingNote = await _context.Notes.FirstOrDefaultAsync(n => n.Id == id);
        if (existingNote == null)
            return null;

        existingNote.Title = note.Title;
        existingNote.Content = note.Content;
        existingNote.Tags = note.Tags;
        existingNote.IsArchived = note.IsArchived;
        existingNote.Folder = note.Folder;
        existingNote.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return existingNote;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var note = await _context.Notes.FirstOrDefaultAsync(n => n.Id == id);
        if (note == null)
            return false;

        _context.Notes.Remove(note);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Note>> GetByUserIdAsync(string userId)
    {
        return await _context.Notes.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.UpdatedAt)
            .ToListAsync();
    }

    public async Task<Note?> GetByUserIdAndExternalIdAsync(string userId, string externalId)
    {
        return await _context.Notes.AsNoTracking()
            .FirstOrDefaultAsync(n => n.UserId == userId && n.ExternalId == externalId);
    }
}

public class SqlNoteRepositoryInMemoryTests : IDisposable
{
    private readonly TestDbContext _context;
    private readonly INoteRepository _sut;
    private readonly Mock<ILogger<TestNoteRepository>> _mockLogger;

    public SqlNoteRepositoryInMemoryTests()
    {
        var options = new DbContextOptionsBuilder<TestDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .EnableSensitiveDataLogging()
            .Options;

        _context = new TestDbContext(options);
        _context.Database.EnsureCreated();

        _mockLogger = new Mock<ILogger<TestNoteRepository>>();
        _sut = new TestNoteRepository(_context, _mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region GetAllAsync Tests

    [Fact]
    public async Task GetAllAsync_WhenNoNotes_ReturnsEmptyList()
    {
        // Act
        var result = await _sut.GetAllAsync();

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAllAsync_WithNotes_ReturnsAllNotes()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateTestNote("1", "user-1", "Note 1"),
            CreateTestNote("2", "user-1", "Note 2"),
            CreateTestNote("3", "user-2", "Note 3")
        };
        await _context.Notes.AddRangeAsync(notes);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetAllAsync();

        // Assert
        result.Should().HaveCount(3);
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenNoteExists_ReturnsNote()
    {
        // Arrange
        var note = CreateTestNote("note-id", "user-1", "Test Note");
        await _context.Notes.AddAsync(note);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByIdAsync("note-id");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("note-id");
        result.Title.Should().Be("Test Note");
    }

    [Fact]
    public async Task GetByIdAsync_WhenNoteDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByIdAsync("non-existent-id");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WithValidNote_CreatesAndReturnsNote()
    {
        // Arrange
        var note = new Note
        {
            Title = "New Note",
            Content = "Note content",
            UserId = "user-1",
            Tags = new List<string> { "tag1" }
        };

        // Act
        var result = await _sut.CreateAsync(note);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.Title.Should().Be("New Note");
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        // Verify persisted
        var persisted = await _context.Notes.FindAsync(result.Id);
        persisted.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateAsync_WithExistingId_UsesProvidedId()
    {
        // Arrange
        var note = new Note
        {
            Id = "custom-id",
            Title = "New Note",
            Content = "Content",
            UserId = "user-1"
        };

        // Act
        var result = await _sut.CreateAsync(note);

        // Assert
        result.Id.Should().Be("custom-id");
    }

    [Fact]
    public async Task CreateAsync_WithNullTitle_ThrowsArgumentException()
    {
        // Arrange
        var note = new Note
        {
            Title = null!,
            Content = "Content",
            UserId = "user-1"
        };

        // Act
        var act = async () => await _sut.CreateAsync(note);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*title*");
    }

    [Fact]
    public async Task CreateAsync_WithEmptyTitle_ThrowsArgumentException()
    {
        // Arrange
        var note = new Note
        {
            Title = "   ",
            Content = "Content",
            UserId = "user-1"
        };

        // Act
        var act = async () => await _sut.CreateAsync(note);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_WithNullContent_ThrowsArgumentException()
    {
        // Arrange
        var note = new Note
        {
            Title = "Title",
            Content = null!,
            UserId = "user-1"
        };

        // Act
        var act = async () => await _sut.CreateAsync(note);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*content*");
    }

    [Fact]
    public async Task CreateAsync_WithEmptyContent_ThrowsArgumentException()
    {
        // Arrange
        var note = new Note
        {
            Title = "Title",
            Content = "",
            UserId = "user-1"
        };

        // Act
        var act = async () => await _sut.CreateAsync(note);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_PreservesProvidedTimestamps()
    {
        // Arrange
        var customCreatedAt = DateTime.UtcNow.AddDays(-30);
        var customUpdatedAt = DateTime.UtcNow.AddDays(-1);
        var note = new Note
        {
            Title = "Imported Note",
            Content = "Content",
            UserId = "user-1",
            CreatedAt = customCreatedAt,
            UpdatedAt = customUpdatedAt
        };

        // Act
        var result = await _sut.CreateAsync(note);

        // Assert
        result.CreatedAt.Should().BeCloseTo(customCreatedAt, TimeSpan.FromSeconds(1));
        result.UpdatedAt.Should().BeCloseTo(customUpdatedAt, TimeSpan.FromSeconds(1));
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WhenNoteExists_UpdatesAndReturnsNote()
    {
        // Arrange
        var existingNote = CreateTestNote("note-id", "user-1", "Original Title");
        await _context.Notes.AddAsync(existingNote);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var updatedNote = new Note
        {
            Id = "note-id",
            Title = "Updated Title",
            Content = "Updated Content",
            UserId = "user-1",
            Tags = new List<string> { "new-tag" }
        };

        // Act
        var result = await _sut.UpdateAsync("note-id", updatedNote);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Updated Title");
        result.Content.Should().Be("Updated Content");
    }

    [Fact]
    public async Task UpdateAsync_WhenNoteDoesNotExist_ReturnsNull()
    {
        // Arrange
        var updatedNote = new Note
        {
            Title = "Updated Title",
            Content = "Updated Content"
        };

        // Act
        var result = await _sut.UpdateAsync("non-existent", updatedNote);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_UpdatesTimestamp()
    {
        // Arrange
        var existingNote = CreateTestNote("note-id", "user-1", "Title");
        existingNote.UpdatedAt = DateTime.UtcNow.AddDays(-10);
        await _context.Notes.AddAsync(existingNote);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var updatedNote = new Note
        {
            Title = "Updated Title",
            Content = "Updated Content"
        };

        var beforeUpdate = DateTime.UtcNow;

        // Act
        var result = await _sut.UpdateAsync("note-id", updatedNote);

        // Assert
        result!.UpdatedAt.Should().BeOnOrAfter(beforeUpdate);
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WhenNoteExists_DeletesAndReturnsTrue()
    {
        // Arrange
        var note = CreateTestNote("note-id", "user-1", "Test Note");
        await _context.Notes.AddAsync(note);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        var result = await _sut.DeleteAsync("note-id");

        // Assert
        result.Should().BeTrue();
        var deleted = await _context.Notes.FindAsync("note-id");
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenNoteDoesNotExist_ReturnsFalse()
    {
        // Act
        var result = await _sut.DeleteAsync("non-existent");

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region GetByUserIdAsync Tests

    [Fact]
    public async Task GetByUserIdAsync_ReturnsOnlyUserNotes()
    {
        // Arrange
        var notes = new List<Note>
        {
            CreateTestNote("1", "user-1", "User 1 Note 1"),
            CreateTestNote("2", "user-1", "User 1 Note 2"),
            CreateTestNote("3", "user-2", "User 2 Note")
        };
        await _context.Notes.AddRangeAsync(notes);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByUserIdAsync("user-1");

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(n => n.UserId == "user-1");
    }

    [Fact]
    public async Task GetByUserIdAsync_WhenNoNotesForUser_ReturnsEmptyList()
    {
        // Arrange
        var note = CreateTestNote("1", "user-1", "User 1 Note");
        await _context.Notes.AddAsync(note);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByUserIdAsync("user-2");

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region GetByUserIdAndExternalIdAsync Tests

    [Fact]
    public async Task GetByUserIdAndExternalIdAsync_WhenExists_ReturnsNote()
    {
        // Arrange
        var note = CreateTestNote("1", "user-1", "Test Note");
        note.ExternalId = "external-123";
        await _context.Notes.AddAsync(note);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByUserIdAndExternalIdAsync("user-1", "external-123");

        // Assert
        result.Should().NotBeNull();
        result!.ExternalId.Should().Be("external-123");
    }

    [Fact]
    public async Task GetByUserIdAndExternalIdAsync_WhenNotExists_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByUserIdAndExternalIdAsync("user-1", "non-existent");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByUserIdAndExternalIdAsync_WhenDifferentUser_ReturnsNull()
    {
        // Arrange
        var note = CreateTestNote("1", "user-1", "Test Note");
        note.ExternalId = "external-123";
        await _context.Notes.AddAsync(note);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByUserIdAndExternalIdAsync("user-2", "external-123");

        // Assert
        result.Should().BeNull();
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
            Tags = new List<string> { "test" },
            IsArchived = false,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
