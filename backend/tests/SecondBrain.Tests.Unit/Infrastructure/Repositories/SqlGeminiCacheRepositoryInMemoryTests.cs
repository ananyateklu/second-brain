using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Infrastructure.Repositories;

/// <summary>
/// Test DbContext for Gemini cache repository testing.
/// </summary>
public class GeminiCacheTestDbContext : DbContext
{
    public GeminiCacheTestDbContext(DbContextOptions<GeminiCacheTestDbContext> options)
        : base(options)
    {
    }

    public DbSet<GeminiContextCache> GeminiContextCaches { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<GeminiContextCache>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
            entity.Property(e => e.CacheName).IsRequired();
            entity.Property(e => e.Model).IsRequired();
            entity.Property(e => e.ContentHash).IsRequired();
        });
    }
}

/// <summary>
/// Test implementation of IGeminiCacheRepository using InMemory database.
/// </summary>
public class TestGeminiCacheRepository : IGeminiCacheRepository
{
    private readonly GeminiCacheTestDbContext _context;
    private readonly ILogger<TestGeminiCacheRepository> _logger;

    public TestGeminiCacheRepository(GeminiCacheTestDbContext context, ILogger<TestGeminiCacheRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<GeminiContextCache> CreateAsync(GeminiContextCache entity, CancellationToken cancellationToken = default)
    {
        _context.GeminiContextCaches.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<GeminiContextCache?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _context.GeminiContextCaches
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    public async Task<GeminiContextCache?> GetByCacheNameAsync(string cacheName, CancellationToken cancellationToken = default)
    {
        return await _context.GeminiContextCaches
            .FirstOrDefaultAsync(c => c.CacheName == cacheName, cancellationToken);
    }

    public async Task<GeminiContextCache?> UpdateAsync(GeminiContextCache entity, CancellationToken cancellationToken = default)
    {
        var existing = await _context.GeminiContextCaches
            .FirstOrDefaultAsync(c => c.Id == entity.Id, cancellationToken);

        if (existing == null)
            return null;

        existing.ExpiresAt = entity.ExpiresAt;
        existing.TokenCount = entity.TokenCount;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return existing;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.GeminiContextCaches
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (entity == null)
            return false;

        _context.GeminiContextCaches.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IEnumerable<GeminiContextCache>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _context.GeminiContextCaches
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<GeminiContextCache?> FindByContentHashAsync(
        string contentHash,
        string model,
        string userId,
        CancellationToken cancellationToken = default)
    {
        return await _context.GeminiContextCaches
            .Where(c => c.UserId == userId
                     && c.ContentHash == contentHash
                     && c.Model == model
                     && c.ExpiresAt > DateTime.UtcNow)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IEnumerable<GeminiContextCache>> GetExpiredCachesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.GeminiContextCaches
            .Where(c => c.ExpiresAt <= DateTime.UtcNow)
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// Unit tests for SqlGeminiCacheRepository.
/// Tests CRUD operations and cache lookup/expiration logic.
/// </summary>
public class SqlGeminiCacheRepositoryInMemoryTests : IDisposable
{
    private readonly GeminiCacheTestDbContext _context;
    private readonly TestGeminiCacheRepository _sut;
    private readonly Mock<ILogger<TestGeminiCacheRepository>> _mockLogger;
    private bool _disposed;

    public SqlGeminiCacheRepositoryInMemoryTests()
    {
        var options = new DbContextOptionsBuilder<GeminiCacheTestDbContext>()
            .UseInMemoryDatabase(databaseName: $"GeminiCacheTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new GeminiCacheTestDbContext(options);
        _mockLogger = new Mock<ILogger<TestGeminiCacheRepository>>();
        _sut = new TestGeminiCacheRepository(_context, _mockLogger.Object);
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
    public async Task CreateAsync_WithValidCache_ReturnsCreatedCache()
    {
        // Arrange
        var cache = CreateTestCache("user-1", "gemini-2.0-flash");

        // Act
        var result = await _sut.CreateAsync(cache);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.UserId.Should().Be("user-1");
        result.Model.Should().Be("gemini-2.0-flash");
    }

    [Fact]
    public async Task CreateAsync_WithAllFields_PersistsAllData()
    {
        // Arrange
        var expiresAt = DateTime.UtcNow.AddHours(1);
        var cache = new GeminiContextCache
        {
            Id = Guid.CreateVersion7().ToString(),
            UserId = "user-1",
            CacheName = "cachedContents/abc123",
            DisplayName = "RAG System Prompt",
            Model = "gemini-2.0-flash",
            ContentHash = "sha256hash123",
            TokenCount = 5000,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _sut.CreateAsync(cache);
        var retrieved = await _sut.GetByIdAsync(result.Id);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.CacheName.Should().Be("cachedContents/abc123");
        retrieved.DisplayName.Should().Be("RAG System Prompt");
        retrieved.Model.Should().Be("gemini-2.0-flash");
        retrieved.ContentHash.Should().Be("sha256hash123");
        retrieved.TokenCount.Should().Be(5000);
        retrieved.ExpiresAt.Should().BeCloseTo(expiresAt, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task CreateAsync_MultipleCaches_CreatesAllCaches()
    {
        // Arrange
        var cache1 = CreateTestCache("user-1", "gemini-2.0-flash");
        var cache2 = CreateTestCache("user-1", "gemini-2.0-flash-exp");
        var cache3 = CreateTestCache("user-2", "gemini-2.0-flash");

        // Act
        await _sut.CreateAsync(cache1);
        await _sut.CreateAsync(cache2);
        await _sut.CreateAsync(cache3);

        var user1Caches = await _sut.GetByUserIdAsync("user-1");
        var user2Caches = await _sut.GetByUserIdAsync("user-2");

        // Assert
        user1Caches.Should().HaveCount(2);
        user2Caches.Should().HaveCount(1);
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenExists_ReturnsCache()
    {
        // Arrange
        var cache = CreateTestCache("user-1", "gemini-2.0-flash");
        var created = await _sut.CreateAsync(cache);

        // Act
        var result = await _sut.GetByIdAsync(created.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(created.Id);
        result.Model.Should().Be("gemini-2.0-flash");
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotExists_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByIdAsync(Guid.NewGuid().ToString());

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region GetByCacheNameAsync Tests

    [Fact]
    public async Task GetByCacheNameAsync_WhenExists_ReturnsCache()
    {
        // Arrange
        var cache = CreateTestCache("user-1", "gemini-2.0-flash");
        cache.CacheName = "cachedContents/unique123";
        await _sut.CreateAsync(cache);

        // Act
        var result = await _sut.GetByCacheNameAsync("cachedContents/unique123");

        // Assert
        result.Should().NotBeNull();
        result!.CacheName.Should().Be("cachedContents/unique123");
    }

    [Fact]
    public async Task GetByCacheNameAsync_WhenNotExists_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByCacheNameAsync("non-existent-cache");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByCacheNameAsync_IsCaseSensitive()
    {
        // Arrange
        var cache = CreateTestCache("user-1", "gemini-2.0-flash");
        cache.CacheName = "cachedContents/ABC123";
        await _sut.CreateAsync(cache);

        // Act
        var resultExact = await _sut.GetByCacheNameAsync("cachedContents/ABC123");
        var resultLowercase = await _sut.GetByCacheNameAsync("cachedcontents/abc123");

        // Assert
        resultExact.Should().NotBeNull();
        resultLowercase.Should().BeNull();
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WithValidUpdate_UpdatesFields()
    {
        // Arrange
        var cache = CreateTestCache("user-1", "gemini-2.0-flash");
        cache.ExpiresAt = DateTime.UtcNow.AddHours(1);
        cache.TokenCount = 1000;
        var created = await _sut.CreateAsync(cache);

        var newExpiresAt = DateTime.UtcNow.AddHours(2);
        var updateCache = new GeminiContextCache
        {
            Id = created.Id,
            ExpiresAt = newExpiresAt,
            TokenCount = 2000
        };

        // Act
        var result = await _sut.UpdateAsync(updateCache);

        // Assert
        result.Should().NotBeNull();
        result!.ExpiresAt.Should().BeCloseTo(newExpiresAt, TimeSpan.FromSeconds(1));
        result.TokenCount.Should().Be(2000);
    }

    [Fact]
    public async Task UpdateAsync_WhenNotExists_ReturnsNull()
    {
        // Arrange
        var updateCache = new GeminiContextCache
        {
            Id = Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };

        // Act
        var result = await _sut.UpdateAsync(updateCache);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_SetsUpdatedAtTimestamp()
    {
        // Arrange
        var cache = CreateTestCache("user-1", "gemini-2.0-flash");
        var originalUpdatedAt = cache.UpdatedAt;
        var created = await _sut.CreateAsync(cache);

        await Task.Delay(50); // Small delay to ensure different timestamp

        var updateCache = new GeminiContextCache
        {
            Id = created.Id,
            ExpiresAt = DateTime.UtcNow.AddHours(2),
            TokenCount = 3000
        };

        // Act
        var result = await _sut.UpdateAsync(updateCache);

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
        var cache = CreateTestCache("user-1", "gemini-2.0-flash");
        var created = await _sut.CreateAsync(cache);

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
        var result = await _sut.DeleteAsync(Guid.NewGuid().ToString());

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_DoesNotAffectOtherCaches()
    {
        // Arrange
        var cache1 = CreateTestCache("user-1", "gemini-2.0-flash");
        var cache2 = CreateTestCache("user-1", "gemini-2.0-flash-exp");

        var created1 = await _sut.CreateAsync(cache1);
        var created2 = await _sut.CreateAsync(cache2);

        // Act
        await _sut.DeleteAsync(created1.Id);
        var remaining = await _sut.GetByUserIdAsync("user-1");

        // Assert
        remaining.Should().HaveCount(1);
        remaining.First().Id.Should().Be(created2.Id);
    }

    #endregion

    #region GetByUserIdAsync Tests

    [Fact]
    public async Task GetByUserIdAsync_ReturnsUserCaches()
    {
        // Arrange
        var cache1 = CreateTestCache("user-1", "gemini-2.0-flash");
        var cache2 = CreateTestCache("user-1", "gemini-2.0-flash-exp");
        var cache3 = CreateTestCache("user-2", "gemini-2.0-flash");

        await _sut.CreateAsync(cache1);
        await _sut.CreateAsync(cache2);
        await _sut.CreateAsync(cache3);

        // Act
        var result = await _sut.GetByUserIdAsync("user-1");

        // Assert
        var caches = result.ToList();
        caches.Should().HaveCount(2);
        caches.All(c => c.UserId == "user-1").Should().BeTrue();
    }

    [Fact]
    public async Task GetByUserIdAsync_ReturnsOrderedByCreatedAtDescending()
    {
        // Arrange
        var cache1 = CreateTestCache("user-1", "model-1");
        cache1.CreatedAt = DateTime.UtcNow.AddHours(-2);
        var cache2 = CreateTestCache("user-1", "model-2");
        cache2.CreatedAt = DateTime.UtcNow.AddHours(-1);
        var cache3 = CreateTestCache("user-1", "model-3");
        cache3.CreatedAt = DateTime.UtcNow;

        await _sut.CreateAsync(cache1);
        await _sut.CreateAsync(cache2);
        await _sut.CreateAsync(cache3);

        // Act
        var result = await _sut.GetByUserIdAsync("user-1");

        // Assert
        var caches = result.ToList();
        caches.Should().HaveCount(3);
        caches[0].Model.Should().Be("model-3");
        caches[1].Model.Should().Be("model-2");
        caches[2].Model.Should().Be("model-1");
    }

    [Fact]
    public async Task GetByUserIdAsync_WithNonExistentUser_ReturnsEmpty()
    {
        // Arrange
        await _sut.CreateAsync(CreateTestCache("user-1", "gemini-2.0-flash"));

        // Act
        var result = await _sut.GetByUserIdAsync("non-existent-user");

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region FindByContentHashAsync Tests

    [Fact]
    public async Task FindByContentHashAsync_WithMatchingCache_ReturnsCache()
    {
        // Arrange
        var cache = CreateTestCache("user-1", "gemini-2.0-flash");
        cache.ContentHash = "unique-hash-123";
        cache.ExpiresAt = DateTime.UtcNow.AddHours(1);
        await _sut.CreateAsync(cache);

        // Act
        var result = await _sut.FindByContentHashAsync(
            "unique-hash-123",
            "gemini-2.0-flash",
            "user-1");

        // Assert
        result.Should().NotBeNull();
        result!.ContentHash.Should().Be("unique-hash-123");
    }

    [Fact]
    public async Task FindByContentHashAsync_WithExpiredCache_ReturnsNull()
    {
        // Arrange
        var cache = CreateTestCache("user-1", "gemini-2.0-flash");
        cache.ContentHash = "expired-hash";
        cache.ExpiresAt = DateTime.UtcNow.AddHours(-1); // Already expired
        await _sut.CreateAsync(cache);

        // Act
        var result = await _sut.FindByContentHashAsync(
            "expired-hash",
            "gemini-2.0-flash",
            "user-1");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task FindByContentHashAsync_WithDifferentModel_ReturnsNull()
    {
        // Arrange
        var cache = CreateTestCache("user-1", "gemini-2.0-flash");
        cache.ContentHash = "model-specific-hash";
        cache.ExpiresAt = DateTime.UtcNow.AddHours(1);
        await _sut.CreateAsync(cache);

        // Act
        var result = await _sut.FindByContentHashAsync(
            "model-specific-hash",
            "gemini-2.0-flash-exp", // Different model
            "user-1");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task FindByContentHashAsync_WithDifferentUser_ReturnsNull()
    {
        // Arrange
        var cache = CreateTestCache("user-1", "gemini-2.0-flash");
        cache.ContentHash = "user-specific-hash";
        cache.ExpiresAt = DateTime.UtcNow.AddHours(1);
        await _sut.CreateAsync(cache);

        // Act
        var result = await _sut.FindByContentHashAsync(
            "user-specific-hash",
            "gemini-2.0-flash",
            "user-2"); // Different user

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task FindByContentHashAsync_WithNonExistentHash_ReturnsNull()
    {
        // Arrange
        await _sut.CreateAsync(CreateTestCache("user-1", "gemini-2.0-flash"));

        // Act
        var result = await _sut.FindByContentHashAsync(
            "non-existent-hash",
            "gemini-2.0-flash",
            "user-1");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region GetExpiredCachesAsync Tests

    [Fact]
    public async Task GetExpiredCachesAsync_ReturnsOnlyExpiredCaches()
    {
        // Arrange
        var expiredCache = CreateTestCache("user-1", "gemini-2.0-flash");
        expiredCache.ExpiresAt = DateTime.UtcNow.AddHours(-1);

        var validCache = CreateTestCache("user-1", "gemini-2.0-flash-exp");
        validCache.ExpiresAt = DateTime.UtcNow.AddHours(1);

        await _sut.CreateAsync(expiredCache);
        await _sut.CreateAsync(validCache);

        // Act
        var result = await _sut.GetExpiredCachesAsync();

        // Assert
        var caches = result.ToList();
        caches.Should().HaveCount(1);
        caches[0].Id.Should().Be(expiredCache.Id);
    }

    [Fact]
    public async Task GetExpiredCachesAsync_WithNoExpiredCaches_ReturnsEmpty()
    {
        // Arrange
        var cache1 = CreateTestCache("user-1", "gemini-2.0-flash");
        cache1.ExpiresAt = DateTime.UtcNow.AddHours(1);
        var cache2 = CreateTestCache("user-2", "gemini-2.0-flash");
        cache2.ExpiresAt = DateTime.UtcNow.AddHours(2);

        await _sut.CreateAsync(cache1);
        await _sut.CreateAsync(cache2);

        // Act
        var result = await _sut.GetExpiredCachesAsync();

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetExpiredCachesAsync_ReturnsAllExpiredCaches()
    {
        // Arrange
        var expired1 = CreateTestCache("user-1", "model-1");
        expired1.ExpiresAt = DateTime.UtcNow.AddDays(-1);
        var expired2 = CreateTestCache("user-1", "model-2");
        expired2.ExpiresAt = DateTime.UtcNow.AddHours(-2);
        var expired3 = CreateTestCache("user-2", "model-1");
        expired3.ExpiresAt = DateTime.UtcNow.AddMinutes(-30);

        await _sut.CreateAsync(expired1);
        await _sut.CreateAsync(expired2);
        await _sut.CreateAsync(expired3);

        // Act
        var result = await _sut.GetExpiredCachesAsync();

        // Assert
        result.Should().HaveCount(3);
    }

    #endregion

    #region Helper Methods

    private static GeminiContextCache CreateTestCache(string userId, string model)
    {
        return new GeminiContextCache
        {
            Id = Guid.CreateVersion7().ToString(),
            UserId = userId,
            CacheName = $"cachedContents/{Guid.NewGuid():N}",
            DisplayName = "Test Cache",
            Model = model,
            ContentHash = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
