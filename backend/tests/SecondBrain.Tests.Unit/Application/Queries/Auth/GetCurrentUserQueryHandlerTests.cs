using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Queries.Auth.GetCurrentUser;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Queries.Auth;

/// <summary>
/// Unit tests for GetCurrentUserQueryHandler.
/// Tests current user retrieval through CQRS query pattern.
/// </summary>
public class GetCurrentUserQueryHandlerTests
{
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly Mock<ILogger<GetCurrentUserQueryHandler>> _mockLogger;
    private readonly GetCurrentUserQueryHandler _sut;

    public GetCurrentUserQueryHandlerTests()
    {
        _mockUserRepository = new Mock<IUserRepository>();
        _mockLogger = new Mock<ILogger<GetCurrentUserQueryHandler>>();
        _sut = new GetCurrentUserQueryHandler(
            _mockUserRepository.Object,
            _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_ForExistingUser_ReturnsSuccessWithAuthResponse()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetCurrentUserQuery(userId);

        var user = CreateTestUser(userId);

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.UserId.Should().Be(userId);
    }

    [Fact]
    public async Task Handle_ReturnsCompleteUserInformation()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetCurrentUserQuery(userId);

        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            Username = "testuser",
            DisplayName = "Test User",
            ApiKey = "api-key-123",
            IsActive = true
        };

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.UserId.Should().Be(userId);
        result.Value!.Email.Should().Be("test@example.com");
        result.Value!.Username.Should().Be("testuser");
        result.Value!.DisplayName.Should().Be("Test User");
        result.Value!.ApiKey.Should().Be("api-key-123");
    }

    [Fact]
    public async Task Handle_SetsIsNewUserToFalse()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetCurrentUserQuery(userId);

        var user = CreateTestUser(userId);

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.IsNewUser.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_DoesNotIncludeToken()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetCurrentUserQuery(userId);

        var user = CreateTestUser(userId);

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Token.Should().BeNull();
    }

    [Fact]
    public async Task Handle_WithNullableFieldsAsNull_ReturnsSuccessfully()
    {
        // Arrange
        var userId = "user-123";
        var query = new GetCurrentUserQuery(userId);

        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            Username = null,
            DisplayName = "Test",
            ApiKey = null,
            IsActive = true
        };

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Username.Should().BeNull();
        result.Value!.ApiKey.Should().BeNull();
    }

    #endregion

    #region Not Found Scenarios

    [Fact]
    public async Task Handle_ForNonExistentUser_ReturnsNotFoundError()
    {
        // Arrange
        var query = new GetCurrentUserQuery("non-existent-user");

        _mockUserRepository
            .Setup(r => r.GetByIdAsync("non-existent-user"))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("NotFound");
        result.Error!.Message.Should().Contain("User not found");
    }

    [Fact]
    public async Task Handle_WhenRepositoryReturnsNull_ReturnsFailure()
    {
        // Arrange
        var query = new GetCurrentUserQuery("any-id");

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
    }

    #endregion

    #region Repository Interaction Tests

    [Fact]
    public async Task Handle_CallsRepositoryWithCorrectUserId()
    {
        // Arrange
        var userId = "specific-user-id";
        var query = new GetCurrentUserQuery(userId);

        var user = CreateTestUser(userId);
        _mockUserRepository
            .Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert
        _mockUserRepository.Verify(r => r.GetByIdAsync(userId), Times.Once);
    }

    [Fact]
    public async Task Handle_OnlyCallsRepositoryOnce()
    {
        // Arrange
        var query = new GetCurrentUserQuery("user-123");

        var user = CreateTestUser("user-123");
        _mockUserRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<string>()))
            .ReturnsAsync(user);

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert
        _mockUserRepository.Verify(r => r.GetByIdAsync(It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task Handle_DoesNotCallOtherRepositoryMethods()
    {
        // Arrange
        var query = new GetCurrentUserQuery("user-123");

        var user = CreateTestUser("user-123");
        _mockUserRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<string>()))
            .ReturnsAsync(user);

        // Act
        await _sut.Handle(query, CancellationToken.None);

        // Assert - Only GetByIdAsync should be called
        _mockUserRepository.Verify(r => r.GetByEmailAsync(It.IsAny<string>()), Times.Never);
        _mockUserRepository.Verify(r => r.CreateAsync(It.IsAny<User>()), Times.Never);
        _mockUserRepository.Verify(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<User>()), Times.Never);
        _mockUserRepository.Verify(r => r.DeleteAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Exception Handling

    [Fact]
    public async Task Handle_WhenRepositoryThrows_ReturnsInternalError()
    {
        // Arrange
        var query = new GetCurrentUserQuery("user-123");

        _mockUserRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act
        var result = await _sut.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("InternalError");
        result.Error!.Message.Should().Contain("Failed to retrieve user information");
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
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
