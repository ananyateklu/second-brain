using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Commands.Auth.Login;
using SecondBrain.Application.Services.Auth;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Commands.Auth;

/// <summary>
/// Unit tests for LoginCommandHandler.
/// Tests user login with email/username and password through CQRS command pattern.
/// </summary>
public class LoginCommandHandlerTests
{
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly Mock<IJwtService> _mockJwtService;
    private readonly Mock<IPasswordService> _mockPasswordService;
    private readonly Mock<ILogger<LoginCommandHandler>> _mockLogger;
    private readonly LoginCommandHandler _sut;

    public LoginCommandHandlerTests()
    {
        _mockUserRepository = new Mock<IUserRepository>();
        _mockJwtService = new Mock<IJwtService>();
        _mockPasswordService = new Mock<IPasswordService>();
        _mockLogger = new Mock<ILogger<LoginCommandHandler>>();
        _sut = new LoginCommandHandler(
            _mockUserRepository.Object,
            _mockJwtService.Object,
            _mockPasswordService.Object,
            _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithValidEmail_ReturnsSuccessWithAuthResponse()
    {
        // Arrange
        var email = "test@example.com";
        var password = "SecurePassword123";
        var command = new LoginCommand(email, password);

        var user = CreateTestUser("user-123", email, "testuser");

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(email.ToLowerInvariant()))
            .ReturnsAsync(user);

        _mockPasswordService
            .Setup(p => p.VerifyPassword(password, user.PasswordHash!))
            .Returns(true);

        _mockJwtService
            .Setup(j => j.GenerateToken(user))
            .Returns("test-jwt-token");

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.UserId.Should().Be("user-123");
        result.Value!.Email.Should().Be(email);
        result.Value!.Token.Should().Be("test-jwt-token");
        result.Value!.IsNewUser.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_WithValidUsername_ReturnsSuccessWithAuthResponse()
    {
        // Arrange
        var username = "testuser";
        var password = "SecurePassword123";
        var command = new LoginCommand(username, password);

        var user = CreateTestUser("user-123", "test@example.com", username);

        _mockUserRepository
            .Setup(r => r.GetByUsernameAsync(username))
            .ReturnsAsync(user);

        _mockPasswordService
            .Setup(p => p.VerifyPassword(password, user.PasswordHash!))
            .Returns(true);

        _mockJwtService
            .Setup(j => j.GenerateToken(user))
            .Returns("test-jwt-token");

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Username.Should().Be(username);
    }

    [Fact]
    public async Task Handle_ReturnsCompleteAuthResponse()
    {
        // Arrange
        var email = "test@example.com";
        var password = "SecurePassword123";
        var command = new LoginCommand(email, password);

        var user = CreateTestUser("user-123", email, "testuser");
        user.DisplayName = "Test User";
        user.ApiKey = "api-key-123";

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(email.ToLowerInvariant()))
            .ReturnsAsync(user);

        _mockPasswordService
            .Setup(p => p.VerifyPassword(password, user.PasswordHash!))
            .Returns(true);

        _mockJwtService
            .Setup(j => j.GenerateToken(user))
            .Returns("test-jwt-token");

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.DisplayName.Should().Be("Test User");
        result.Value!.ApiKey.Should().Be("api-key-123");
    }

    #endregion

    #region Validation Scenarios

    [Fact]
    public async Task Handle_WithEmptyIdentifier_ReturnsValidationError()
    {
        // Arrange
        var command = new LoginCommand("", "password");

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ValidationFailed");
    }

    [Fact]
    public async Task Handle_WithEmptyPassword_ReturnsValidationError()
    {
        // Arrange
        var command = new LoginCommand("test@example.com", "");

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ValidationFailed");
    }

    [Fact]
    public async Task Handle_WithWhitespaceCredentials_ReturnsValidationError()
    {
        // Arrange
        var command = new LoginCommand("   ", "   ");

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ValidationFailed");
    }

    #endregion

    #region Authentication Failure Scenarios

    [Fact]
    public async Task Handle_WithNonExistentEmail_ReturnsUnauthorizedError()
    {
        // Arrange
        var command = new LoginCommand("nonexistent@example.com", "password");

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Unauthorized");
        result.Error!.Message.Should().Contain("Invalid credentials");
    }

    [Fact]
    public async Task Handle_WithNonExistentUsername_ReturnsUnauthorizedError()
    {
        // Arrange
        var command = new LoginCommand("nonexistentuser", "password");

        _mockUserRepository
            .Setup(r => r.GetByUsernameAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Unauthorized");
    }

    [Fact]
    public async Task Handle_WithWrongPassword_ReturnsUnauthorizedError()
    {
        // Arrange
        var email = "test@example.com";
        var command = new LoginCommand(email, "wrongpassword");

        var user = CreateTestUser("user-123", email, "testuser");

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(email.ToLowerInvariant()))
            .ReturnsAsync(user);

        _mockPasswordService
            .Setup(p => p.VerifyPassword("wrongpassword", user.PasswordHash!))
            .Returns(false);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Unauthorized");
        result.Error!.Message.Should().Contain("Invalid credentials");
    }

    [Fact]
    public async Task Handle_WithNoPasswordHash_ReturnsUnauthorizedError()
    {
        // Arrange
        var email = "test@example.com";
        var command = new LoginCommand(email, "password");

        var user = CreateTestUser("user-123", email, "testuser");
        user.PasswordHash = null;

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(email.ToLowerInvariant()))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Unauthorized");
    }

    [Fact]
    public async Task Handle_WithInactiveUser_ReturnsUnauthorizedError()
    {
        // Arrange
        var email = "test@example.com";
        var command = new LoginCommand(email, "password");

        var user = CreateTestUser("user-123", email, "testuser");
        user.IsActive = false;

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(email.ToLowerInvariant()))
            .ReturnsAsync(user);

        _mockPasswordService
            .Setup(p => p.VerifyPassword("password", user.PasswordHash!))
            .Returns(true);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Unauthorized");
        result.Error!.Message.Should().Contain("inactive");
    }

    #endregion

    #region Repository Interaction Tests

    [Fact]
    public async Task Handle_WithEmailIdentifier_CallsGetByEmailAsync()
    {
        // Arrange
        var email = "test@example.com";
        var command = new LoginCommand(email, "password");

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(email.ToLowerInvariant()))
            .ReturnsAsync((User?)null);

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockUserRepository.Verify(r => r.GetByEmailAsync(email.ToLowerInvariant()), Times.Once);
        _mockUserRepository.Verify(r => r.GetByUsernameAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WithUsernameIdentifier_CallsGetByUsernameAsync()
    {
        // Arrange
        var username = "testuser";
        var command = new LoginCommand(username, "password");

        _mockUserRepository
            .Setup(r => r.GetByUsernameAsync(username))
            .ReturnsAsync((User?)null);

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockUserRepository.Verify(r => r.GetByUsernameAsync(username), Times.Once);
        _mockUserRepository.Verify(r => r.GetByEmailAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Exception Handling

    [Fact]
    public async Task Handle_WhenRepositoryThrows_ReturnsInternalError()
    {
        // Arrange
        var command = new LoginCommand("test@example.com", "password");

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("Database error"));

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("InternalError");
    }

    #endregion

    #region Helper Methods

    private static User CreateTestUser(string id, string email, string username)
    {
        return new User
        {
            Id = id,
            Email = email,
            Username = username,
            PasswordHash = "hashed-password",
            DisplayName = "Test User",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    #endregion
}
