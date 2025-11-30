using Microsoft.Extensions.Logging;
using SecondBrain.Core.Entities;
using SecondBrain.Infrastructure.Repositories;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.Repositories;

[Collection("PostgreSQL")]
public class UserRepositoryTests : IAsyncLifetime
{
    private readonly PostgresFixture _fixture;
    private readonly Mock<ILogger<SqlUserRepository>> _mockLogger;
    private SqlUserRepository _sut = null!;

    public UserRepositoryTests(PostgresFixture fixture)
    {
        _fixture = fixture;
        _mockLogger = new Mock<ILogger<SqlUserRepository>>();
    }

    public async Task InitializeAsync()
    {
        // Clean up users before each test
        await using var dbContext = _fixture.CreateDbContext();
        dbContext.Users.RemoveRange(dbContext.Users);
        await dbContext.SaveChangesAsync();

        _sut = new SqlUserRepository(_fixture.CreateDbContext(), _mockLogger.Object);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_WhenValidUser_CreatesAndReturnsUser()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");

        // Act
        var created = await _sut.CreateAsync(user);

        // Assert
        created.Should().NotBeNull();
        created.Email.Should().Be("test@example.com");
        created.Id.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task CreateAsync_WhenNoId_GeneratesId()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        user.Id = "";

        // Act
        var created = await _sut.CreateAsync(user);

        // Assert
        created.Id.Should().NotBeNullOrEmpty();
        Guid.TryParse(created.Id, out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateAsync_SetsTimestamps()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        var beforeCreate = DateTime.UtcNow;

        // Act
        var created = await _sut.CreateAsync(user);
        var afterCreate = DateTime.UtcNow;

        // Assert
        created.CreatedAt.Should().BeOnOrAfter(beforeCreate).And.BeOnOrBefore(afterCreate);
        created.UpdatedAt.Should().BeOnOrAfter(beforeCreate).And.BeOnOrBefore(afterCreate);
    }

    [Fact]
    public async Task CreateAsync_WithPreferences_CreatesUserAndPreferences()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        user.Preferences = new UserPreferences
        {
            ChatProvider = "openai",
            ChatModel = "gpt-4",
            VectorStoreProvider = "postgresql"
        };

        // Act
        var created = await _sut.CreateAsync(user);

        // Assert
        created.Preferences.Should().NotBeNull();
        created.Preferences!.ChatProvider.Should().Be("openai");
        created.Preferences.UserId.Should().Be(created.Id);
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_WhenUserExists_ReturnsUser()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        var created = await _sut.CreateAsync(user);

        // Act
        var retrieved = await _sut.GetByIdAsync(created.Id);

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Email.Should().Be("test@example.com");
    }

    [Fact]
    public async Task GetByIdAsync_WhenUserDoesNotExist_ReturnsNull()
    {
        // Act
        var retrieved = await _sut.GetByIdAsync("non-existent");

        // Assert
        retrieved.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_IncludesPreferences()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        user.Preferences = new UserPreferences { ChatProvider = "claude" };
        var created = await _sut.CreateAsync(user);

        // Act
        var retrieved = await _sut.GetByIdAsync(created.Id);

        // Assert
        retrieved!.Preferences.Should().NotBeNull();
        retrieved.Preferences!.ChatProvider.Should().Be("claude");
    }

    #endregion

    #region GetByEmailAsync Tests

    [Fact]
    public async Task GetByEmailAsync_WhenUserExists_ReturnsUser()
    {
        // Arrange
        var user = CreateTestUser("specific@email.com");
        await _sut.CreateAsync(user);

        // Act
        var retrieved = await _sut.GetByEmailAsync("specific@email.com");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.Email.Should().Be("specific@email.com");
    }

    [Fact]
    public async Task GetByEmailAsync_WhenUserDoesNotExist_ReturnsNull()
    {
        // Act
        var retrieved = await _sut.GetByEmailAsync("nonexistent@email.com");

        // Assert
        retrieved.Should().BeNull();
    }

    #endregion

    #region GetByApiKeyAsync Tests

    [Fact]
    public async Task GetByApiKeyAsync_WhenUserExists_ReturnsUser()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        user.ApiKey = "test-api-key-123";
        await _sut.CreateAsync(user);

        // Act
        var retrieved = await _sut.GetByApiKeyAsync("test-api-key-123");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.ApiKey.Should().Be("test-api-key-123");
    }

    [Fact]
    public async Task GetByApiKeyAsync_WhenApiKeyDoesNotExist_ReturnsNull()
    {
        // Act
        var retrieved = await _sut.GetByApiKeyAsync("non-existent-key");

        // Assert
        retrieved.Should().BeNull();
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_WhenUserExists_UpdatesAndReturnsUser()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        var created = await _sut.CreateAsync(user);

        var updateUser = new User
        {
            Id = created.Id,
            Email = "updated@email.com",
            DisplayName = "Updated Name",
            ApiKey = "new-api-key",
            IsActive = false
        };

        // Act
        var updated = await _sut.UpdateAsync(created.Id, updateUser);

        // Assert
        updated.Should().NotBeNull();
        updated!.Email.Should().Be("updated@email.com");
        updated.DisplayName.Should().Be("Updated Name");
        updated.ApiKey.Should().Be("new-api-key");
        updated.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateAsync_WhenUserDoesNotExist_ReturnsNull()
    {
        // Arrange
        var updateUser = CreateTestUser("test@example.com");

        // Act
        var updated = await _sut.UpdateAsync("non-existent", updateUser);

        // Assert
        updated.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_UpdatesTimestamp()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        var created = await _sut.CreateAsync(user);
        var originalUpdatedAt = created.UpdatedAt;

        await Task.Delay(100);

        var updateUser = new User
        {
            Email = "updated@email.com",
            DisplayName = "Updated"
        };

        // Act
        var updated = await _sut.UpdateAsync(created.Id, updateUser);

        // Assert
        updated!.UpdatedAt.Should().BeAfter(originalUpdatedAt);
    }

    [Fact]
    public async Task UpdateAsync_WithNewPreferences_CreatesPreferences()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        var created = await _sut.CreateAsync(user);

        var updateUser = new User
        {
            Email = created.Email,
            DisplayName = created.DisplayName,
            Preferences = new UserPreferences { ChatProvider = "gemini" }
        };

        // Act
        var updated = await _sut.UpdateAsync(created.Id, updateUser);

        // Assert
        updated!.Preferences.Should().NotBeNull();
        updated.Preferences!.ChatProvider.Should().Be("gemini");
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_WhenUserExists_DeletesAndReturnsTrue()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        var created = await _sut.CreateAsync(user);

        // Act
        var deleted = await _sut.DeleteAsync(created.Id);

        // Assert
        deleted.Should().BeTrue();

        var retrieved = await _sut.GetByIdAsync(created.Id);
        retrieved.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenUserDoesNotExist_ReturnsFalse()
    {
        // Act
        var deleted = await _sut.DeleteAsync("non-existent");

        // Assert
        deleted.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_CascadeDeletesPreferences()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        user.Preferences = new UserPreferences { ChatProvider = "openai" };
        var created = await _sut.CreateAsync(user);
        var preferencesId = created.Preferences!.Id;

        // Act
        await _sut.DeleteAsync(created.Id);

        // Assert - Verify preferences are also deleted
        await using var dbContext = _fixture.CreateDbContext();
        var preferences = await dbContext.UserPreferences.FindAsync(preferencesId);
        preferences.Should().BeNull();
    }

    #endregion

    #region ResolveUserIdByApiKeyAsync Tests

    [Fact]
    public async Task ResolveUserIdByApiKeyAsync_WhenActiveUser_ReturnsUserId()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        user.ApiKey = "active-api-key";
        user.IsActive = true;
        var created = await _sut.CreateAsync(user);

        // Act
        var userId = await _sut.ResolveUserIdByApiKeyAsync("active-api-key");

        // Assert
        userId.Should().Be(created.Id);
    }

    [Fact]
    public async Task ResolveUserIdByApiKeyAsync_WhenInactiveUser_ReturnsNull()
    {
        // Arrange
        var user = CreateTestUser("test@example.com");
        user.ApiKey = "inactive-api-key";
        user.IsActive = false;
        await _sut.CreateAsync(user);

        // Act
        var userId = await _sut.ResolveUserIdByApiKeyAsync("inactive-api-key");

        // Assert
        userId.Should().BeNull();
    }

    [Fact]
    public async Task ResolveUserIdByApiKeyAsync_WhenNoUser_ReturnsNull()
    {
        // Act
        var userId = await _sut.ResolveUserIdByApiKeyAsync("non-existent-key");

        // Assert
        userId.Should().BeNull();
    }

    #endregion

    #region Helper Methods

    private static User CreateTestUser(string email)
    {
        return new User
        {
            Email = email,
            DisplayName = "Test User",
            PasswordHash = "hashed_password",
            IsActive = true
        };
    }

    #endregion
}

