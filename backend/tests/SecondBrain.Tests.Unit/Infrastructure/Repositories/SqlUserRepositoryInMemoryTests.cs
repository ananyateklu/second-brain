using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Infrastructure.Exceptions;

namespace SecondBrain.Tests.Unit.Infrastructure.Repositories;

/// <summary>
/// Extended test DbContext for User repository testing
/// </summary>
public class UserTestDbContext : DbContext
{
    public UserTestDbContext(DbContextOptions<UserTestDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<UserPreferences> UserPreferences { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasOne(u => u.Preferences)
            .WithOne()
            .HasForeignKey<UserPreferences>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

/// <summary>
/// Test-specific implementation of IUserRepository using InMemory database
/// </summary>
public class TestUserRepository : IUserRepository
{
    private readonly UserTestDbContext _context;
    private readonly ILogger<TestUserRepository> _logger;

    public TestUserRepository(UserTestDbContext context, ILogger<TestUserRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        try
        {
            _logger.LogDebug("Retrieving user by ID. UserId: {UserId}", id);
            var user = await _context.Users
                .Include(u => u.Preferences)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                _logger.LogDebug("User not found. UserId: {UserId}", id);
                return null;
            }

            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user by ID. UserId: {UserId}", id);
            throw new RepositoryException($"Failed to retrieve user with ID '{id}'", ex);
        }
    }

    public async Task<User?> GetByApiKeyAsync(string apiKey)
    {
        try
        {
            _logger.LogDebug("Retrieving user by API key");
            var user = await _context.Users
                .Include(u => u.Preferences)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.ApiKey == apiKey);

            if (user == null)
            {
                _logger.LogDebug("User not found by API key");
                return null;
            }

            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user by API key");
            throw new RepositoryException("Failed to retrieve user by API key", ex);
        }
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        try
        {
            _logger.LogDebug("Retrieving user by email. Email: {Email}", email);
            var user = await _context.Users
                .Include(u => u.Preferences)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                _logger.LogDebug("User not found by email. Email: {Email}", email);
                return null;
            }

            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user by email. Email: {Email}", email);
            throw new RepositoryException($"Failed to retrieve user with email '{email}'", ex);
        }
    }

    public async Task<User> CreateAsync(User user)
    {
        try
        {
            _logger.LogDebug("Creating new user. Email: {Email}", user.Email);

            if (string.IsNullOrWhiteSpace(user.Id))
            {
                user.Id = Guid.NewGuid().ToString();
            }

            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;

            if (user.Preferences != null)
            {
                if (string.IsNullOrWhiteSpace(user.Preferences.Id))
                {
                    user.Preferences.Id = Guid.NewGuid().ToString();
                }
                user.Preferences.UserId = user.Id;
            }

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user. Email: {Email}", user.Email);
            throw new RepositoryException("Failed to create user", ex);
        }
    }

    public async Task<User?> UpdateAsync(string id, User user)
    {
        try
        {
            _logger.LogDebug("Updating user. UserId: {UserId}", id);
            var existingUser = await _context.Users
                .Include(u => u.Preferences)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (existingUser == null)
            {
                _logger.LogDebug("User not found for update. UserId: {UserId}", id);
                return null;
            }

            existingUser.Email = user.Email;
            existingUser.DisplayName = user.DisplayName;
            existingUser.ApiKey = user.ApiKey;
            existingUser.PasswordHash = user.PasswordHash;
            existingUser.IsActive = user.IsActive;
            existingUser.UpdatedAt = DateTime.UtcNow;

            if (user.Preferences != null)
            {
                if (existingUser.Preferences == null)
                {
                    user.Preferences.Id = Guid.NewGuid().ToString();
                    user.Preferences.UserId = id;
                    existingUser.Preferences = user.Preferences;
                }
                else
                {
                    existingUser.Preferences.ChatProvider = user.Preferences.ChatProvider;
                    existingUser.Preferences.ChatModel = user.Preferences.ChatModel;
                    existingUser.Preferences.VectorStoreProvider = user.Preferences.VectorStoreProvider;
                    existingUser.Preferences.DefaultNoteView = user.Preferences.DefaultNoteView;
                    existingUser.Preferences.ItemsPerPage = user.Preferences.ItemsPerPage;
                    existingUser.Preferences.FontSize = user.Preferences.FontSize;
                    existingUser.Preferences.EnableNotifications = user.Preferences.EnableNotifications;
                    existingUser.Preferences.OllamaRemoteUrl = user.Preferences.OllamaRemoteUrl;
                    existingUser.Preferences.UseRemoteOllama = user.Preferences.UseRemoteOllama;
                }
            }

            await _context.SaveChangesAsync();
            return existingUser;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user. UserId: {UserId}", id);
            throw new RepositoryException($"Failed to update user with ID '{id}'", ex);
        }
    }

    public async Task<bool> DeleteAsync(string id)
    {
        try
        {
            _logger.LogDebug("Deleting user. UserId: {UserId}", id);
            var user = await _context.Users
                .Include(u => u.Preferences)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
            {
                _logger.LogDebug("User not found for deletion. UserId: {UserId}", id);
                return false;
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user. UserId: {UserId}", id);
            throw new RepositoryException($"Failed to delete user with ID '{id}'", ex);
        }
    }

    public async Task<string?> ResolveUserIdByApiKeyAsync(string apiKey)
    {
        try
        {
            _logger.LogDebug("Resolving user ID by API key");
            var user = await _context.Users
                .AsNoTracking()
                .Where(u => u.ApiKey == apiKey && u.IsActive)
                .Select(u => new { u.Id })
                .FirstOrDefaultAsync();

            if (user == null)
            {
                _logger.LogDebug("No active user found for API key");
                return null;
            }

            return user.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving user ID by API key");
            throw new RepositoryException("Failed to resolve user by API key", ex);
        }
    }
}

public class SqlUserRepositoryInMemoryTests : IDisposable
{
    private readonly UserTestDbContext _context;
    private readonly IUserRepository _sut;
    private readonly Mock<ILogger<TestUserRepository>> _mockLogger;

    public SqlUserRepositoryInMemoryTests()
    {
        var options = new DbContextOptionsBuilder<UserTestDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .EnableSensitiveDataLogging()
            .Options;

        _context = new UserTestDbContext(options);
        _context.Database.EnsureCreated();

        _mockLogger = new Mock<ILogger<TestUserRepository>>();
        _sut = new TestUserRepository(_context, _mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenUserExists_ReturnsUser()
    {
        // Arrange
        var user = CreateTestUser("user-1", "test@example.com");
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByIdAsync("user-1");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("user-1");
        result.Email.Should().Be("test@example.com");
    }

    [Fact]
    public async Task GetByIdAsync_WhenUserDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByIdAsync("non-existent");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_IncludesPreferences()
    {
        // Arrange
        var user = CreateTestUser("user-1", "test@example.com");
        user.Preferences = CreateTestPreferences("pref-1", "user-1");
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByIdAsync("user-1");

        // Assert
        result.Should().NotBeNull();
        result!.Preferences.Should().NotBeNull();
        result.Preferences!.ChatProvider.Should().Be("openai");
    }

    #endregion

    #region GetByApiKeyAsync Tests

    [Fact]
    public async Task GetByApiKeyAsync_WhenUserExists_ReturnsUser()
    {
        // Arrange
        var user = CreateTestUser("user-1", "test@example.com");
        user.ApiKey = "test-api-key-123";
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByApiKeyAsync("test-api-key-123");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("user-1");
    }

    [Fact]
    public async Task GetByApiKeyAsync_WhenApiKeyDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByApiKeyAsync("non-existent-key");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByApiKeyAsync_IncludesPreferences()
    {
        // Arrange
        var user = CreateTestUser("user-1", "test@example.com");
        user.ApiKey = "test-api-key-123";
        user.Preferences = CreateTestPreferences("pref-1", "user-1");
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByApiKeyAsync("test-api-key-123");

        // Assert
        result.Should().NotBeNull();
        result!.Preferences.Should().NotBeNull();
    }

    #endregion

    #region GetByEmailAsync Tests

    [Fact]
    public async Task GetByEmailAsync_WhenUserExists_ReturnsUser()
    {
        // Arrange
        var user = CreateTestUser("user-1", "specific@example.com");
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByEmailAsync("specific@example.com");

        // Assert
        result.Should().NotBeNull();
        result!.Email.Should().Be("specific@example.com");
    }

    [Fact]
    public async Task GetByEmailAsync_WhenEmailDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await _sut.GetByEmailAsync("nonexistent@example.com");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByEmailAsync_IncludesPreferences()
    {
        // Arrange
        var user = CreateTestUser("user-1", "test@example.com");
        user.Preferences = CreateTestPreferences("pref-1", "user-1");
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.GetByEmailAsync("test@example.com");

        // Assert
        result.Should().NotBeNull();
        result!.Preferences.Should().NotBeNull();
    }

    #endregion

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WithValidUser_CreatesAndReturnsUser()
    {
        // Arrange
        var user = new User
        {
            Email = "new@example.com",
            DisplayName = "New User",
            IsActive = true
        };

        // Act
        var result = await _sut.CreateAsync(user);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeNullOrEmpty();
        result.Email.Should().Be("new@example.com");
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        result.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        // Verify persisted
        var persisted = await _context.Users.FindAsync(result.Id);
        persisted.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateAsync_WithExistingId_UsesProvidedId()
    {
        // Arrange
        var user = new User
        {
            Id = "custom-user-id",
            Email = "user@example.com",
            DisplayName = "User"
        };

        // Act
        var result = await _sut.CreateAsync(user);

        // Assert
        result.Id.Should().Be("custom-user-id");
    }

    [Fact]
    public async Task CreateAsync_WithPreferences_SetsPreferencesIdAndUserId()
    {
        // Arrange
        var user = new User
        {
            Email = "user@example.com",
            DisplayName = "User",
            Preferences = new UserPreferences
            {
                ChatProvider = "anthropic",
                ChatModel = "claude-3"
            }
        };

        // Act
        var result = await _sut.CreateAsync(user);

        // Assert
        result.Preferences.Should().NotBeNull();
        result.Preferences!.Id.Should().NotBeNullOrEmpty();
        result.Preferences.UserId.Should().Be(result.Id);
    }

    [Fact]
    public async Task CreateAsync_WithoutPreferences_CreatesUserWithoutPreferences()
    {
        // Arrange
        var user = new User
        {
            Email = "user@example.com",
            DisplayName = "User"
        };

        // Act
        var result = await _sut.CreateAsync(user);

        // Assert
        result.Preferences.Should().BeNull();
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WhenUserExists_UpdatesAndReturnsUser()
    {
        // Arrange
        var existingUser = CreateTestUser("user-1", "old@example.com");
        await _context.Users.AddAsync(existingUser);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var updatedUser = new User
        {
            Email = "new@example.com",
            DisplayName = "Updated Name",
            ApiKey = "new-api-key",
            IsActive = false
        };

        // Act
        var result = await _sut.UpdateAsync("user-1", updatedUser);

        // Assert
        result.Should().NotBeNull();
        result!.Email.Should().Be("new@example.com");
        result.DisplayName.Should().Be("Updated Name");
        result.ApiKey.Should().Be("new-api-key");
        result.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateAsync_WhenUserDoesNotExist_ReturnsNull()
    {
        // Arrange
        var updatedUser = new User
        {
            Email = "user@example.com"
        };

        // Act
        var result = await _sut.UpdateAsync("non-existent", updatedUser);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_UpdatesTimestamp()
    {
        // Arrange
        var existingUser = CreateTestUser("user-1", "test@example.com");
        existingUser.UpdatedAt = DateTime.UtcNow.AddDays(-10);
        await _context.Users.AddAsync(existingUser);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var beforeUpdate = DateTime.UtcNow;

        // Act
        var result = await _sut.UpdateAsync("user-1", new User
        {
            Email = "updated@example.com"
        });

        // Assert
        result!.UpdatedAt.Should().BeOnOrAfter(beforeUpdate);
    }

    [Fact]
    public async Task UpdateAsync_WithNewPreferences_CreatesPreferences()
    {
        // Arrange
        var existingUser = CreateTestUser("user-1", "test@example.com");
        // No preferences initially
        await _context.Users.AddAsync(existingUser);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var updatedUser = new User
        {
            Email = "test@example.com",
            Preferences = new UserPreferences
            {
                ChatProvider = "openai",
                ChatModel = "gpt-4"
            }
        };

        // Act
        var result = await _sut.UpdateAsync("user-1", updatedUser);

        // Assert
        result!.Preferences.Should().NotBeNull();
        result.Preferences!.ChatProvider.Should().Be("openai");
        result.Preferences.UserId.Should().Be("user-1");
    }

    [Fact]
    public async Task UpdateAsync_WithExistingPreferences_UpdatesPreferences()
    {
        // Arrange
        var existingUser = CreateTestUser("user-1", "test@example.com");
        existingUser.Preferences = CreateTestPreferences("pref-1", "user-1");
        existingUser.Preferences.ChatProvider = "openai";
        await _context.Users.AddAsync(existingUser);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var updatedUser = new User
        {
            Email = "test@example.com",
            Preferences = new UserPreferences
            {
                ChatProvider = "anthropic",
                ChatModel = "claude-3",
                EnableNotifications = true
            }
        };

        // Act
        var result = await _sut.UpdateAsync("user-1", updatedUser);

        // Assert
        result!.Preferences.Should().NotBeNull();
        result.Preferences!.ChatProvider.Should().Be("anthropic");
        result.Preferences.ChatModel.Should().Be("claude-3");
        result.Preferences.EnableNotifications.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateAsync_UpdatesPasswordHash()
    {
        // Arrange
        var existingUser = CreateTestUser("user-1", "test@example.com");
        existingUser.PasswordHash = "old-hash";
        await _context.Users.AddAsync(existingUser);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        var updatedUser = new User
        {
            Email = "test@example.com",
            PasswordHash = "new-hash"
        };

        // Act
        var result = await _sut.UpdateAsync("user-1", updatedUser);

        // Assert
        result!.PasswordHash.Should().Be("new-hash");
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WhenUserExists_DeletesAndReturnsTrue()
    {
        // Arrange
        var user = CreateTestUser("user-1", "test@example.com");
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        var result = await _sut.DeleteAsync("user-1");

        // Assert
        result.Should().BeTrue();
        var deleted = await _context.Users.FindAsync("user-1");
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenUserDoesNotExist_ReturnsFalse()
    {
        // Act
        var result = await _sut.DeleteAsync("non-existent");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_CascadesDeleteToPreferences()
    {
        // Arrange
        var user = CreateTestUser("user-1", "test@example.com");
        user.Preferences = CreateTestPreferences("pref-1", "user-1");
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();

        // Act
        await _sut.DeleteAsync("user-1");

        // Assert
        var remainingPreferences = await _context.UserPreferences.CountAsync();
        remainingPreferences.Should().Be(0);
    }

    #endregion

    #region ResolveUserIdByApiKeyAsync Tests

    [Fact]
    public async Task ResolveUserIdByApiKeyAsync_WhenActiveUserExists_ReturnsUserId()
    {
        // Arrange
        var user = CreateTestUser("user-1", "test@example.com");
        user.ApiKey = "valid-api-key";
        user.IsActive = true;
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.ResolveUserIdByApiKeyAsync("valid-api-key");

        // Assert
        result.Should().Be("user-1");
    }

    [Fact]
    public async Task ResolveUserIdByApiKeyAsync_WhenUserIsInactive_ReturnsNull()
    {
        // Arrange
        var user = CreateTestUser("user-1", "test@example.com");
        user.ApiKey = "valid-api-key";
        user.IsActive = false;
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sut.ResolveUserIdByApiKeyAsync("valid-api-key");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task ResolveUserIdByApiKeyAsync_WhenApiKeyDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await _sut.ResolveUserIdByApiKeyAsync("non-existent-key");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task ResolveUserIdByApiKeyAsync_OnlyReturnsActiveUsers()
    {
        // Arrange
        var activeUser = CreateTestUser("active-user", "active@example.com");
        activeUser.ApiKey = "api-key-1";
        activeUser.IsActive = true;

        var inactiveUser = CreateTestUser("inactive-user", "inactive@example.com");
        inactiveUser.ApiKey = "api-key-2";
        inactiveUser.IsActive = false;

        await _context.Users.AddRangeAsync(activeUser, inactiveUser);
        await _context.SaveChangesAsync();

        // Act
        var activeResult = await _sut.ResolveUserIdByApiKeyAsync("api-key-1");
        var inactiveResult = await _sut.ResolveUserIdByApiKeyAsync("api-key-2");

        // Assert
        activeResult.Should().Be("active-user");
        inactiveResult.Should().BeNull();
    }

    #endregion

    #region Helper Methods

    private static User CreateTestUser(string id, string email)
    {
        return new User
        {
            Id = id,
            Email = email,
            DisplayName = $"User {id}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static UserPreferences CreateTestPreferences(string id, string userId)
    {
        return new UserPreferences
        {
            Id = id,
            UserId = userId,
            ChatProvider = "openai",
            ChatModel = "gpt-4",
            VectorStoreProvider = "postgres",
            DefaultNoteView = "grid",
            ItemsPerPage = 20,
            FontSize = "medium",
            EnableNotifications = false
        };
    }

    #endregion
}

