using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Commands.Auth.GenerateApiKey;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Commands.Auth;

/// <summary>
/// Unit tests for GenerateApiKeyCommandHandler.
/// Tests API key generation/regeneration through CQRS command pattern.
/// </summary>
public class GenerateApiKeyCommandHandlerTests
{
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly Mock<ILogger<GenerateApiKeyCommandHandler>> _mockLogger;
    private readonly GenerateApiKeyCommandHandler _sut;

    public GenerateApiKeyCommandHandlerTests()
    {
        _mockUserRepository = new Mock<IUserRepository>();
        _mockLogger = new Mock<ILogger<GenerateApiKeyCommandHandler>>();
        _sut = new GenerateApiKeyCommandHandler(
            _mockUserRepository.Object,
            _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_ForExistingUser_ReturnsSuccessWithApiKey()
    {
        // Arrange
        var userId = "user-123";
        var command = new GenerateApiKeyCommand(userId);

        var user = CreateTestUser(userId);

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        _mockUserRepository
            .Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.ApiKey.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Handle_GeneratesValidApiKeyFormat()
    {
        // Arrange
        var userId = "user-123";
        var command = new GenerateApiKeyCommand(userId);

        var user = CreateTestUser(userId);

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        _mockUserRepository
            .Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.ApiKey.Should().HaveLength(32); // GUID without dashes
        result.Value!.ApiKey.Should().MatchRegex("^[a-f0-9]{32}$"); // Hex format
    }

    [Fact]
    public async Task Handle_SetsGeneratedAtToCurrentTime()
    {
        // Arrange
        var userId = "user-123";
        var command = new GenerateApiKeyCommand(userId);

        var user = CreateTestUser(userId);
        var beforeCall = DateTime.UtcNow;

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        _mockUserRepository
            .Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);
        var afterCall = DateTime.UtcNow;

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.GeneratedAt.Should().BeOnOrAfter(beforeCall);
        result.Value!.GeneratedAt.Should().BeOnOrBefore(afterCall);
    }

    [Fact]
    public async Task Handle_UpdatesUserInRepository()
    {
        // Arrange
        var userId = "user-123";
        var command = new GenerateApiKeyCommand(userId);

        var user = CreateTestUser(userId);
        user.ApiKey = "old-api-key";

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        User? capturedUser = null;
        _mockUserRepository
            .Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .Callback<string, User>((_, u) => capturedUser = u)
            .ReturnsAsync((User?)null);

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockUserRepository.Verify(r => r.UpdateAsync(userId, It.IsAny<User>()), Times.Once);
        capturedUser.Should().NotBeNull();
        capturedUser!.ApiKey.Should().NotBe("old-api-key");
        capturedUser.ApiKey.Should().HaveLength(32);
    }

    [Fact]
    public async Task Handle_UpdatesUserUpdatedAtTimestamp()
    {
        // Arrange
        var userId = "user-123";
        var command = new GenerateApiKeyCommand(userId);

        var user = CreateTestUser(userId);
        var originalUpdatedAt = user.UpdatedAt;

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        User? capturedUser = null;
        _mockUserRepository
            .Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .Callback<string, User>((_, u) => capturedUser = u)
            .ReturnsAsync((User?)null);

        // Wait a bit to ensure time difference
        await Task.Delay(1);

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        capturedUser.Should().NotBeNull();
        capturedUser!.UpdatedAt.Should().BeAfter(originalUpdatedAt);
    }

    [Fact]
    public async Task Handle_RegeneratesExistingApiKey()
    {
        // Arrange
        var userId = "user-123";
        var command = new GenerateApiKeyCommand(userId);

        var user = CreateTestUser(userId);
        var oldApiKey = "12345678901234567890123456789012";
        user.ApiKey = oldApiKey;

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        _mockUserRepository
            .Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.ApiKey.Should().NotBe(oldApiKey);
    }

    #endregion

    #region Not Found Scenarios

    [Fact]
    public async Task Handle_ForNonExistentUser_ReturnsNotFoundError()
    {
        // Arrange
        var command = new GenerateApiKeyCommand("non-existent-user");

        _mockUserRepository
            .Setup(r => r.GetByIdAsync("non-existent-user"))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("NotFound");
    }

    #endregion

    #region Repository Interaction Tests

    [Fact]
    public async Task Handle_CallsGetByIdAsyncWithCorrectUserId()
    {
        // Arrange
        var userId = "specific-user-id";
        var command = new GenerateApiKeyCommand(userId);

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockUserRepository.Verify(r => r.GetByIdAsync(userId), Times.Once);
    }

    [Fact]
    public async Task Handle_DoesNotCallUpdateIfUserNotFound()
    {
        // Arrange
        var command = new GenerateApiKeyCommand("non-existent");

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockUserRepository.Verify(
            r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<User>()),
            Times.Never);
    }

    #endregion

    #region Exception Handling

    [Fact]
    public async Task Handle_WhenRepositoryThrows_ReturnsInternalError()
    {
        // Arrange
        var command = new GenerateApiKeyCommand("user-123");

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("InternalError");
        result.Error!.Message.Should().Contain("Failed to generate API key");
    }

    [Fact]
    public async Task Handle_WhenUpdateThrows_ReturnsInternalError()
    {
        // Arrange
        var userId = "user-123";
        var command = new GenerateApiKeyCommand(userId);

        var user = CreateTestUser(userId);

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        _mockUserRepository
            .Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ThrowsAsync(new InvalidOperationException("Update failed"));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("InternalError");
    }

    #endregion

    #region Helper Methods

    private static User CreateTestUser(string id)
    {
        return new User
        {
            Id = id,
            Email = "test@example.com",
            Username = "testuser",
            DisplayName = "Test User",
            PasswordHash = "hashed-password",
            IsActive = true,
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };
    }

    #endregion
}
