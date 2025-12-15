using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Infrastructure.Repositories;

/// <summary>
/// Test DbContext for Note image repository testing.
/// </summary>
public class NoteImageTestDbContext : DbContext
{
    public NoteImageTestDbContext(DbContextOptions<NoteImageTestDbContext> options)
        : base(options)
    {
    }

    public DbSet<NoteImage> NoteImages { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<NoteImage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NoteId).IsRequired();
            entity.Property(e => e.UserId).IsRequired();
        });
    }
}

/// <summary>
/// Test implementation of INoteImageRepository using InMemory database.
/// </summary>
public class TestNoteImageRepository : INoteImageRepository
{
    private readonly NoteImageTestDbContext _context;
    private readonly ILogger<TestNoteImageRepository> _logger;

    public TestNoteImageRepository(NoteImageTestDbContext context, ILogger<TestNoteImageRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<NoteImage>> GetByNoteIdAsync(string noteId, CancellationToken cancellationToken = default)
    {
        return await _context.NoteImages
            .Where(i => i.NoteId == noteId)
            .OrderBy(i => i.ImageIndex)
            .ToListAsync(cancellationToken);
    }

    public async Task<NoteImage?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _context.NoteImages.FindAsync(new object[] { id }, cancellationToken);
    }

    public async Task<List<NoteImage>> GetPendingDescriptionAsync(int limit = 50, CancellationToken cancellationToken = default)
    {
        return await _context.NoteImages
            .Where(i => i.Description == null)
            .OrderBy(i => i.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<NoteImage> CreateAsync(NoteImage image, CancellationToken cancellationToken = default)
    {
        _context.NoteImages.Add(image);
        await _context.SaveChangesAsync(cancellationToken);
        return image;
    }

    public async Task<List<NoteImage>> CreateManyAsync(IEnumerable<NoteImage> images, CancellationToken cancellationToken = default)
    {
        var imageList = images.ToList();
        if (imageList.Count == 0)
        {
            return imageList;
        }

        _context.NoteImages.AddRange(imageList);
        await _context.SaveChangesAsync(cancellationToken);
        return imageList;
    }

    public async Task<NoteImage?> UpdateAsync(NoteImage image, CancellationToken cancellationToken = default)
    {
        var existing = await _context.NoteImages.FindAsync(new object[] { image.Id }, cancellationToken);
        if (existing == null)
        {
            return null;
        }

        existing.Base64Data = image.Base64Data;
        existing.MediaType = image.MediaType;
        existing.FileName = image.FileName;
        existing.AltText = image.AltText;
        existing.ImageIndex = image.ImageIndex;
        existing.Description = image.Description;
        existing.DescriptionProvider = image.DescriptionProvider;
        existing.DescriptionModel = image.DescriptionModel;
        existing.DescriptionGeneratedAt = image.DescriptionGeneratedAt;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return existing;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var image = await _context.NoteImages.FindAsync(new object[] { id }, cancellationToken);
        if (image == null)
        {
            return false;
        }

        _context.NoteImages.Remove(image);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<int> DeleteByNoteIdAsync(string noteId, CancellationToken cancellationToken = default)
    {
        var images = await _context.NoteImages
            .Where(i => i.NoteId == noteId)
            .ToListAsync(cancellationToken);

        if (images.Count == 0)
        {
            return 0;
        }

        _context.NoteImages.RemoveRange(images);
        await _context.SaveChangesAsync(cancellationToken);
        return images.Count;
    }

    public async Task<bool> UpdateDescriptionAsync(
        string imageId,
        string description,
        string provider,
        string model,
        CancellationToken cancellationToken = default)
    {
        var image = await _context.NoteImages.FindAsync(new object[] { imageId }, cancellationToken);
        if (image == null)
        {
            return false;
        }

        image.Description = description;
        image.DescriptionProvider = provider;
        image.DescriptionModel = model;
        image.DescriptionGeneratedAt = DateTime.UtcNow;
        image.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogDebug("Updated description for image {ImageId} using {Provider}/{Model}", imageId, provider, model);
        return true;
    }
}

/// <summary>
/// Unit tests for SqlNoteImageRepository.
/// Tests CRUD operations and image description management.
/// </summary>
public class SqlNoteImageRepositoryInMemoryTests : IDisposable
{
    private readonly NoteImageTestDbContext _context;
    private readonly TestNoteImageRepository _sut;
    private readonly Mock<ILogger<TestNoteImageRepository>> _mockLogger;
    private bool _disposed;

    public SqlNoteImageRepositoryInMemoryTests()
    {
        var options = new DbContextOptionsBuilder<NoteImageTestDbContext>()
            .UseInMemoryDatabase(databaseName: $"NoteImageTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new NoteImageTestDbContext(options);
        _mockLogger = new Mock<ILogger<TestNoteImageRepository>>();
        _sut = new TestNoteImageRepository(_context, _mockLogger.Object);
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
    public async Task CreateAsync_WithValidImage_ReturnsCreatedImage()
    {
        // Arrange
        var image = CreateTestImage("note-1", "user-1");

        // Act
        var result = await _sut.CreateAsync(image);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.NoteId.Should().Be("note-1");
        result.UserId.Should().Be("user-1");
    }

    [Fact]
    public async Task CreateAsync_WithAllFields_PersistsAllData()
    {
        // Arrange
        var image = new NoteImage
        {
            Id = Guid.NewGuid().ToString(),
            NoteId = "note-1",
            UserId = "user-1",
            Base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            MediaType = "image/png",
            FileName = "test-image.png",
            ImageIndex = 0,
            AltText = "A test image",
            Description = "This is a test image description",
            DescriptionProvider = "gemini",
            DescriptionModel = "gemini-1.5-flash",
            DescriptionGeneratedAt = DateTime.UtcNow
        };

        // Act
        var result = await _sut.CreateAsync(image);
        var retrieved = await _sut.GetByIdAsync(result.Id);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Base64Data.Should().NotBeEmpty();
        retrieved.MediaType.Should().Be("image/png");
        retrieved.FileName.Should().Be("test-image.png");
        retrieved.AltText.Should().Be("A test image");
        retrieved.Description.Should().Be("This is a test image description");
        retrieved.DescriptionProvider.Should().Be("gemini");
        retrieved.DescriptionModel.Should().Be("gemini-1.5-flash");
        retrieved.DescriptionGeneratedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateAsync_MultipleImages_CreatesAllImages()
    {
        // Arrange
        var image1 = CreateTestImage("note-1", "user-1", 0);
        var image2 = CreateTestImage("note-1", "user-1", 1);
        var image3 = CreateTestImage("note-2", "user-1", 0);

        // Act
        await _sut.CreateAsync(image1);
        await _sut.CreateAsync(image2);
        await _sut.CreateAsync(image3);

        var note1Images = await _sut.GetByNoteIdAsync("note-1");
        var note2Images = await _sut.GetByNoteIdAsync("note-2");

        // Assert
        note1Images.Should().HaveCount(2);
        note2Images.Should().HaveCount(1);
    }

    #endregion

    #region CreateManyAsync Tests

    [Fact]
    public async Task CreateManyAsync_WithMultipleImages_CreatesAllImages()
    {
        // Arrange
        var images = new List<NoteImage>
        {
            CreateTestImage("note-1", "user-1", 0),
            CreateTestImage("note-1", "user-1", 1),
            CreateTestImage("note-1", "user-1", 2)
        };

        // Act
        var result = await _sut.CreateManyAsync(images);

        // Assert
        result.Should().HaveCount(3);
        var retrieved = await _sut.GetByNoteIdAsync("note-1");
        retrieved.Should().HaveCount(3);
    }

    [Fact]
    public async Task CreateManyAsync_WithEmptyList_ReturnsEmptyList()
    {
        // Arrange
        var images = new List<NoteImage>();

        // Act
        var result = await _sut.CreateManyAsync(images);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateManyAsync_PreservesImageOrder()
    {
        // Arrange
        var images = new List<NoteImage>
        {
            CreateTestImage("note-1", "user-1", 2),
            CreateTestImage("note-1", "user-1", 0),
            CreateTestImage("note-1", "user-1", 1)
        };

        // Act
        await _sut.CreateManyAsync(images);
        var retrieved = await _sut.GetByNoteIdAsync("note-1");

        // Assert
        retrieved.Should().HaveCount(3);
        retrieved[0].ImageIndex.Should().Be(0);
        retrieved[1].ImageIndex.Should().Be(1);
        retrieved[2].ImageIndex.Should().Be(2);
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenExists_ReturnsImage()
    {
        // Arrange
        var image = CreateTestImage("note-1", "user-1");
        var created = await _sut.CreateAsync(image);

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

    #region GetByNoteIdAsync Tests

    [Fact]
    public async Task GetByNoteIdAsync_ReturnsImagesForNote()
    {
        // Arrange
        var image1 = CreateTestImage("note-1", "user-1", 0);
        var image2 = CreateTestImage("note-1", "user-1", 1);
        var image3 = CreateTestImage("note-2", "user-1", 0);

        await _sut.CreateAsync(image1);
        await _sut.CreateAsync(image2);
        await _sut.CreateAsync(image3);

        // Act
        var result = await _sut.GetByNoteIdAsync("note-1");

        // Assert
        result.Should().HaveCount(2);
        result.All(i => i.NoteId == "note-1").Should().BeTrue();
    }

    [Fact]
    public async Task GetByNoteIdAsync_ReturnsOrderedByImageIndex()
    {
        // Arrange
        var image1 = CreateTestImage("note-1", "user-1", 2);
        var image2 = CreateTestImage("note-1", "user-1", 0);
        var image3 = CreateTestImage("note-1", "user-1", 1);

        await _sut.CreateAsync(image1);
        await _sut.CreateAsync(image2);
        await _sut.CreateAsync(image3);

        // Act
        var result = await _sut.GetByNoteIdAsync("note-1");

        // Assert
        result.Should().HaveCount(3);
        result[0].ImageIndex.Should().Be(0);
        result[1].ImageIndex.Should().Be(1);
        result[2].ImageIndex.Should().Be(2);
    }

    [Fact]
    public async Task GetByNoteIdAsync_WithNonExistentNote_ReturnsEmpty()
    {
        // Arrange
        await _sut.CreateAsync(CreateTestImage("note-1", "user-1"));

        // Act
        var result = await _sut.GetByNoteIdAsync("non-existent-note");

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region GetPendingDescriptionAsync Tests

    [Fact]
    public async Task GetPendingDescriptionAsync_ReturnsImagesWithoutDescription()
    {
        // Arrange
        var imageWithDesc = CreateTestImage("note-1", "user-1");
        imageWithDesc.Description = "Has description";

        var imageWithoutDesc = CreateTestImage("note-1", "user-1");
        imageWithoutDesc.Description = null;

        await _sut.CreateAsync(imageWithDesc);
        await _sut.CreateAsync(imageWithoutDesc);

        // Act
        var result = await _sut.GetPendingDescriptionAsync();

        // Assert
        result.Should().HaveCount(1);
        result[0].Description.Should().BeNull();
    }

    [Fact]
    public async Task GetPendingDescriptionAsync_RespectsLimit()
    {
        // Arrange
        for (int i = 0; i < 10; i++)
        {
            var image = CreateTestImage("note-1", "user-1", i);
            image.Description = null;
            await _sut.CreateAsync(image);
        }

        // Act
        var result = await _sut.GetPendingDescriptionAsync(limit: 5);

        // Assert
        result.Should().HaveCount(5);
    }

    [Fact]
    public async Task GetPendingDescriptionAsync_ReturnsOrderedByCreatedAt()
    {
        // Arrange
        var image1 = CreateTestImage("note-1", "user-1");
        image1.CreatedAt = DateTime.UtcNow.AddHours(-2);
        image1.Description = null;
        image1.FileName = "first.png";

        var image2 = CreateTestImage("note-1", "user-1");
        image2.CreatedAt = DateTime.UtcNow.AddHours(-1);
        image2.Description = null;
        image2.FileName = "second.png";

        var image3 = CreateTestImage("note-1", "user-1");
        image3.CreatedAt = DateTime.UtcNow;
        image3.Description = null;
        image3.FileName = "third.png";

        await _sut.CreateAsync(image3);
        await _sut.CreateAsync(image1);
        await _sut.CreateAsync(image2);

        // Act
        var result = await _sut.GetPendingDescriptionAsync();

        // Assert
        result.Should().HaveCount(3);
        result[0].FileName.Should().Be("first.png");
        result[1].FileName.Should().Be("second.png");
        result[2].FileName.Should().Be("third.png");
    }

    [Fact]
    public async Task GetPendingDescriptionAsync_WithAllDescribed_ReturnsEmpty()
    {
        // Arrange
        var image = CreateTestImage("note-1", "user-1");
        image.Description = "Has description";
        await _sut.CreateAsync(image);

        // Act
        var result = await _sut.GetPendingDescriptionAsync();

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WithValidUpdate_UpdatesFields()
    {
        // Arrange
        var image = CreateTestImage("note-1", "user-1");
        var created = await _sut.CreateAsync(image);

        var updateImage = new NoteImage
        {
            Id = created.Id,
            Base64Data = "newBase64Data",
            MediaType = "image/jpeg",
            FileName = "updated.jpg",
            AltText = "Updated alt text",
            ImageIndex = 5,
            Description = "Updated description",
            DescriptionProvider = "openai",
            DescriptionModel = "gpt-4-vision",
            DescriptionGeneratedAt = DateTime.UtcNow
        };

        // Act
        var result = await _sut.UpdateAsync(updateImage);

        // Assert
        result.Should().NotBeNull();
        result!.Base64Data.Should().Be("newBase64Data");
        result.MediaType.Should().Be("image/jpeg");
        result.FileName.Should().Be("updated.jpg");
        result.AltText.Should().Be("Updated alt text");
        result.ImageIndex.Should().Be(5);
        result.Description.Should().Be("Updated description");
        result.DescriptionProvider.Should().Be("openai");
        result.DescriptionModel.Should().Be("gpt-4-vision");
    }

    [Fact]
    public async Task UpdateAsync_WhenNotExists_ReturnsNull()
    {
        // Arrange
        var updateImage = new NoteImage
        {
            Id = "non-existent-id",
            Base64Data = "data"
        };

        // Act
        var result = await _sut.UpdateAsync(updateImage);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_SetsUpdatedAtTimestamp()
    {
        // Arrange
        var image = CreateTestImage("note-1", "user-1");
        var created = await _sut.CreateAsync(image);
        var originalUpdatedAt = created.UpdatedAt;

        await Task.Delay(50);

        var updateImage = new NoteImage
        {
            Id = created.Id,
            Base64Data = "newData",
            MediaType = "image/png"
        };

        // Act
        var result = await _sut.UpdateAsync(updateImage);

        // Assert
        result.Should().NotBeNull();
        result!.UpdatedAt.Should().BeAfter(originalUpdatedAt);
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WhenExists_DeletesAndReturnsTrue()
    {
        // Arrange
        var image = CreateTestImage("note-1", "user-1");
        var created = await _sut.CreateAsync(image);

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
    public async Task DeleteAsync_DoesNotAffectOtherImages()
    {
        // Arrange
        var image1 = CreateTestImage("note-1", "user-1", 0);
        var image2 = CreateTestImage("note-1", "user-1", 1);

        var created1 = await _sut.CreateAsync(image1);
        var created2 = await _sut.CreateAsync(image2);

        // Act
        await _sut.DeleteAsync(created1.Id);
        var remaining = await _sut.GetByNoteIdAsync("note-1");

        // Assert
        remaining.Should().HaveCount(1);
        remaining[0].Id.Should().Be(created2.Id);
    }

    #endregion

    #region DeleteByNoteIdAsync Tests

    [Fact]
    public async Task DeleteByNoteIdAsync_DeletesAllImagesForNote()
    {
        // Arrange
        var image1 = CreateTestImage("note-1", "user-1", 0);
        var image2 = CreateTestImage("note-1", "user-1", 1);
        var image3 = CreateTestImage("note-2", "user-1", 0);

        await _sut.CreateAsync(image1);
        await _sut.CreateAsync(image2);
        await _sut.CreateAsync(image3);

        // Act
        var result = await _sut.DeleteByNoteIdAsync("note-1");
        var note1Images = await _sut.GetByNoteIdAsync("note-1");
        var note2Images = await _sut.GetByNoteIdAsync("note-2");

        // Assert
        result.Should().Be(2);
        note1Images.Should().BeEmpty();
        note2Images.Should().HaveCount(1);
    }

    [Fact]
    public async Task DeleteByNoteIdAsync_WithNoImages_ReturnsZero()
    {
        // Act
        var result = await _sut.DeleteByNoteIdAsync("non-existent-note");

        // Assert
        result.Should().Be(0);
    }

    [Fact]
    public async Task DeleteByNoteIdAsync_ReturnsCorrectCount()
    {
        // Arrange
        for (int i = 0; i < 5; i++)
        {
            await _sut.CreateAsync(CreateTestImage("note-1", "user-1", i));
        }

        // Act
        var result = await _sut.DeleteByNoteIdAsync("note-1");

        // Assert
        result.Should().Be(5);
    }

    #endregion

    #region UpdateDescriptionAsync Tests

    [Fact]
    public async Task UpdateDescriptionAsync_WhenExists_UpdatesAndReturnsTrue()
    {
        // Arrange
        var image = CreateTestImage("note-1", "user-1");
        image.Description = null;
        var created = await _sut.CreateAsync(image);

        // Act
        var result = await _sut.UpdateDescriptionAsync(
            created.Id,
            "A detailed description of the image",
            "gemini",
            "gemini-1.5-flash");

        var retrieved = await _sut.GetByIdAsync(created.Id);

        // Assert
        result.Should().BeTrue();
        retrieved.Should().NotBeNull();
        retrieved!.Description.Should().Be("A detailed description of the image");
        retrieved.DescriptionProvider.Should().Be("gemini");
        retrieved.DescriptionModel.Should().Be("gemini-1.5-flash");
        retrieved.DescriptionGeneratedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateDescriptionAsync_WhenNotExists_ReturnsFalse()
    {
        // Act
        var result = await _sut.UpdateDescriptionAsync(
            "non-existent-id",
            "description",
            "provider",
            "model");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateDescriptionAsync_OverwritesExistingDescription()
    {
        // Arrange
        var image = CreateTestImage("note-1", "user-1");
        image.Description = "Old description";
        image.DescriptionProvider = "old-provider";
        image.DescriptionModel = "old-model";
        var created = await _sut.CreateAsync(image);

        // Act
        var result = await _sut.UpdateDescriptionAsync(
            created.Id,
            "New description",
            "new-provider",
            "new-model");

        var retrieved = await _sut.GetByIdAsync(created.Id);

        // Assert
        result.Should().BeTrue();
        retrieved!.Description.Should().Be("New description");
        retrieved.DescriptionProvider.Should().Be("new-provider");
        retrieved.DescriptionModel.Should().Be("new-model");
    }

    [Fact]
    public async Task UpdateDescriptionAsync_SetsTimestamps()
    {
        // Arrange
        var image = CreateTestImage("note-1", "user-1");
        var created = await _sut.CreateAsync(image);
        var beforeUpdate = DateTime.UtcNow;

        await Task.Delay(10);

        // Act
        await _sut.UpdateDescriptionAsync(
            created.Id,
            "description",
            "provider",
            "model");

        var retrieved = await _sut.GetByIdAsync(created.Id);

        // Assert
        retrieved!.DescriptionGeneratedAt.Should().BeAfter(beforeUpdate);
        retrieved.UpdatedAt.Should().BeAfter(beforeUpdate);
    }

    #endregion

    #region Helper Methods

    private static NoteImage CreateTestImage(string noteId, string userId, int index = 0)
    {
        return new NoteImage
        {
            Id = Guid.NewGuid().ToString(),
            NoteId = noteId,
            UserId = userId,
            Base64Data = "dGVzdEJhc2U2NA==", // "testBase64" in base64
            MediaType = "image/png",
            FileName = $"image-{index}.png",
            ImageIndex = index,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
