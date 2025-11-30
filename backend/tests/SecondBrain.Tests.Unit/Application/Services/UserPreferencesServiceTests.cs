using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Tests.Unit.Application.Services;

public class UserPreferencesServiceTests
{
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly Mock<ILogger<UserPreferencesService>> _mockLogger;
    private readonly UserPreferencesService _sut;

    public UserPreferencesServiceTests()
    {
        _mockUserRepository = new Mock<IUserRepository>();
        _mockLogger = new Mock<ILogger<UserPreferencesService>>();
        _sut = new UserPreferencesService(_mockUserRepository.Object, _mockLogger.Object);
    }

    #region GetPreferencesAsync Tests

    [Fact]
    public async Task GetPreferencesAsync_WhenUserNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var userId = "non-existent-user";
        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.GetPreferencesAsync(userId);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>()
            .WithMessage($"User with ID {userId} not found");
    }

    [Fact]
    public async Task GetPreferencesAsync_WhenUserHasPreferences_ReturnsPreferences()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        user.Preferences!.ChatProvider = "OpenAI";
        user.Preferences.ChatModel = "gpt-4";
        user.Preferences.VectorStoreProvider = "Pinecone";

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetPreferencesAsync(userId);

        // Assert
        result.Should().NotBeNull();
        result.ChatProvider.Should().Be("OpenAI");
        result.ChatModel.Should().Be("gpt-4");
        result.VectorStoreProvider.Should().Be("Pinecone");
    }

    [Fact]
    public async Task GetPreferencesAsync_WhenUserHasNoPreferences_InitializesPreferences()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithoutPreferences(userId);

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetPreferencesAsync(userId);

        // Assert
        result.Should().NotBeNull();
        _mockUserRepository.Verify(r => r.UpdateAsync(userId, It.Is<User>(u => u.Preferences != null)), Times.Once);
    }

    [Fact]
    public async Task GetPreferencesAsync_WhenPreferencesNull_ReturnsDefaultValues()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithoutPreferences(userId);

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetPreferencesAsync(userId);

        // Assert
        result.VectorStoreProvider.Should().Be("PostgreSQL");
        result.DefaultNoteView.Should().Be("list");
        result.ItemsPerPage.Should().Be(20);
        result.FontSize.Should().Be("medium");
        result.EnableNotifications.Should().BeTrue();
    }

    [Fact]
    public async Task GetPreferencesAsync_MapsAllFieldsCorrectly()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        user.Preferences!.ChatProvider = "Claude";
        user.Preferences.ChatModel = "claude-3-opus";
        user.Preferences.VectorStoreProvider = "PostgreSQL";
        user.Preferences.DefaultNoteView = "grid";
        user.Preferences.ItemsPerPage = 50;
        user.Preferences.FontSize = "large";
        user.Preferences.EnableNotifications = false;
        user.Preferences.OllamaRemoteUrl = "http://localhost:11434";
        user.Preferences.UseRemoteOllama = true;

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetPreferencesAsync(userId);

        // Assert
        result.ChatProvider.Should().Be("Claude");
        result.ChatModel.Should().Be("claude-3-opus");
        result.VectorStoreProvider.Should().Be("PostgreSQL");
        result.DefaultNoteView.Should().Be("grid");
        result.ItemsPerPage.Should().Be(50);
        result.FontSize.Should().Be("large");
        result.EnableNotifications.Should().BeFalse();
        result.OllamaRemoteUrl.Should().Be("http://localhost:11434");
        result.UseRemoteOllama.Should().BeTrue();
    }

    #endregion

    #region UpdatePreferencesAsync Tests

    [Fact]
    public async Task UpdatePreferencesAsync_WhenUserNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var userId = "non-existent-user";
        var request = new UpdateUserPreferencesRequest();
        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>()
            .WithMessage($"User with ID {userId} not found");
    }

    [Fact]
    public async Task UpdatePreferencesAsync_WhenUpdateFails_ThrowsException()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var request = new UpdateUserPreferencesRequest { ChatProvider = "OpenAI" };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((User?)null);

        // Act
        var act = async () => await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        await act.Should().ThrowAsync<Exception>()
            .WithMessage("Failed to update user preferences");
    }

    [Fact]
    public async Task UpdatePreferencesAsync_UpdatesChatProvider()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var request = new UpdateUserPreferencesRequest { ChatProvider = "OpenAI" };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.ChatProvider.Should().Be("OpenAI");
        _mockUserRepository.Verify(r => r.UpdateAsync(userId, It.Is<User>(u =>
            u.Preferences!.ChatProvider == "OpenAI")), Times.Once);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_UpdatesChatModel()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var request = new UpdateUserPreferencesRequest { ChatModel = "gpt-4o" };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.ChatModel.Should().Be("gpt-4o");
    }

    [Fact]
    public async Task UpdatePreferencesAsync_UpdatesVectorStoreProvider()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var request = new UpdateUserPreferencesRequest { VectorStoreProvider = "Pinecone" };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.VectorStoreProvider.Should().Be("Pinecone");
    }

    [Fact]
    public async Task UpdatePreferencesAsync_UpdatesDefaultNoteView()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var request = new UpdateUserPreferencesRequest { DefaultNoteView = "grid" };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.DefaultNoteView.Should().Be("grid");
    }

    [Fact]
    public async Task UpdatePreferencesAsync_UpdatesItemsPerPage()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var request = new UpdateUserPreferencesRequest { ItemsPerPage = 50 };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.ItemsPerPage.Should().Be(50);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_UpdatesFontSize()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var request = new UpdateUserPreferencesRequest { FontSize = "large" };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.FontSize.Should().Be("large");
    }

    [Fact]
    public async Task UpdatePreferencesAsync_UpdatesEnableNotifications()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var request = new UpdateUserPreferencesRequest { EnableNotifications = false };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.EnableNotifications.Should().BeFalse();
    }

    [Fact]
    public async Task UpdatePreferencesAsync_UpdatesOllamaRemoteUrl()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var request = new UpdateUserPreferencesRequest { OllamaRemoteUrl = "http://my-server:11434" };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.OllamaRemoteUrl.Should().Be("http://my-server:11434");
    }

    [Fact]
    public async Task UpdatePreferencesAsync_UpdatesUseRemoteOllama()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var request = new UpdateUserPreferencesRequest { UseRemoteOllama = true };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.UseRemoteOllama.Should().BeTrue();
    }

    [Fact]
    public async Task UpdatePreferencesAsync_UpdatesMultipleFields()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var request = new UpdateUserPreferencesRequest
        {
            ChatProvider = "Claude",
            ChatModel = "claude-3-opus",
            VectorStoreProvider = "Pinecone",
            ItemsPerPage = 100
        };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.ChatProvider.Should().Be("Claude");
        result.ChatModel.Should().Be("claude-3-opus");
        result.VectorStoreProvider.Should().Be("Pinecone");
        result.ItemsPerPage.Should().Be(100);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_DoesNotUpdateNullFields()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        user.Preferences!.ChatProvider = "OpenAI";
        user.Preferences.ChatModel = "gpt-4";

        var request = new UpdateUserPreferencesRequest
        {
            ChatProvider = null, // Should not update
            ChatModel = "gpt-4o" // Should update
        };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.ChatProvider.Should().Be("OpenAI"); // Unchanged
        result.ChatModel.Should().Be("gpt-4o"); // Updated
    }

    [Fact]
    public async Task UpdatePreferencesAsync_InitializesPreferencesIfNull()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithoutPreferences(userId);
        var request = new UpdateUserPreferencesRequest { ChatProvider = "OpenAI" };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.Should().NotBeNull();
        result.ChatProvider.Should().Be("OpenAI");
    }

    [Fact]
    public async Task UpdatePreferencesAsync_UpdatesTimestamp()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        var originalUpdateTime = user.UpdatedAt;
        var request = new UpdateUserPreferencesRequest { ChatProvider = "OpenAI" };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        _mockUserRepository.Verify(r => r.UpdateAsync(userId, It.Is<User>(u =>
            u.UpdatedAt >= originalUpdateTime)), Times.Once);
    }

    [Fact]
    public async Task UpdatePreferencesAsync_EmptyRequest_ReturnsCurrentPreferences()
    {
        // Arrange
        var userId = "user-123";
        var user = CreateUserWithPreferences(userId);
        user.Preferences!.ChatProvider = "OpenAI";
        var request = new UpdateUserPreferencesRequest(); // All null

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string _, User u) => u);

        // Act
        var result = await _sut.UpdatePreferencesAsync(userId, request);

        // Assert
        result.ChatProvider.Should().Be("OpenAI"); // Unchanged
    }

    #endregion

    #region Helper Methods

    private static User CreateUserWithPreferences(string userId)
    {
        return new User
        {
            Id = userId,
            Email = $"{userId}@test.com",
            DisplayName = "Test User",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-1),
            IsActive = true,
            Preferences = new UserPreferences
            {
                Id = $"pref-{userId}",
                UserId = userId,
                ChatProvider = null,
                ChatModel = null,
                VectorStoreProvider = "PostgreSQL",
                DefaultNoteView = "list",
                ItemsPerPage = 20,
                FontSize = "medium",
                EnableNotifications = true,
                OllamaRemoteUrl = null,
                UseRemoteOllama = false
            }
        };
    }

    private static User CreateUserWithoutPreferences(string userId)
    {
        return new User
        {
            Id = userId,
            Email = $"{userId}@test.com",
            DisplayName = "Test User",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-1),
            IsActive = true,
            Preferences = null
        };
    }

    #endregion
}

