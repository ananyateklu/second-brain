using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using SecondBrain.Application.Commands.Auth.Register;
using SecondBrain.Application.Services.Auth;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using Xunit;

namespace SecondBrain.Tests.Unit.Application.Commands.Auth;

/// <summary>
/// Unit tests for RegisterCommandHandler.
/// Tests user registration through CQRS command pattern.
/// </summary>
public class RegisterCommandHandlerTests
{
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly Mock<IJwtService> _mockJwtService;
    private readonly Mock<IPasswordService> _mockPasswordService;
    private readonly Mock<ILogger<RegisterCommandHandler>> _mockLogger;
    private readonly RegisterCommandHandler _sut;

    public RegisterCommandHandlerTests()
    {
        _mockUserRepository = new Mock<IUserRepository>();
        _mockJwtService = new Mock<IJwtService>();
        _mockPasswordService = new Mock<IPasswordService>();
        _mockLogger = new Mock<ILogger<RegisterCommandHandler>>();
        _sut = new RegisterCommandHandler(
            _mockUserRepository.Object,
            _mockJwtService.Object,
            _mockPasswordService.Object,
            _mockLogger.Object);
    }

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithValidData_ReturnsSuccessWithAuthResponse()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "newuser@example.com",
            Password: "SecurePassword123",
            Username: "newuser",
            DisplayName: "New User"
        );

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockUserRepository
            .Setup(r => r.GetByUsernameAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockPasswordService
            .Setup(p => p.HashPassword(command.Password))
            .Returns("hashed-password");

        var createdUser = new User
        {
            Id = "new-user-id",
            Email = command.Email.ToLowerInvariant(),
            Username = command.Username,
            DisplayName = command.DisplayName ?? "New User",
            PasswordHash = "hashed-password",
            IsActive = true
        };

        _mockUserRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync(createdUser);

        _mockJwtService
            .Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("test-jwt-token");

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.UserId.Should().Be("new-user-id");
        result.Value!.Email.Should().Be(command.Email.ToLowerInvariant());
        result.Value!.Username.Should().Be(command.Username);
        result.Value!.Token.Should().Be("test-jwt-token");
        result.Value!.IsNewUser.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_WithMinimalFields_ReturnsSuccess()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "minimal@example.com",
            Password: "password123"
        );

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockPasswordService
            .Setup(p => p.HashPassword(command.Password))
            .Returns("hashed-password");

        var createdUser = new User
        {
            Id = "new-user-id",
            Email = command.Email.ToLowerInvariant(),
            DisplayName = "minimal",
            PasswordHash = "hashed-password",
            IsActive = true
        };

        _mockUserRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync(createdUser);

        _mockJwtService
            .Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("test-jwt-token");

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.IsNewUser.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_UsesEmailPrefixAsDefaultDisplayName()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "john.doe@example.com",
            Password: "password123"
        );

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockPasswordService
            .Setup(p => p.HashPassword(It.IsAny<string>()))
            .Returns("hashed-password");

        User? capturedUser = null;
        _mockUserRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>()))
            .Callback<User>(u => capturedUser = u)
            .ReturnsAsync((User u) => u);

        _mockJwtService
            .Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("token");

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        capturedUser.Should().NotBeNull();
        capturedUser!.DisplayName.Should().Be("john.doe");
    }

    [Fact]
    public async Task Handle_NormalizesEmailToLowercase()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "John.Doe@Example.COM",
            Password: "password123"
        );

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockPasswordService
            .Setup(p => p.HashPassword(It.IsAny<string>()))
            .Returns("hashed-password");

        User? capturedUser = null;
        _mockUserRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>()))
            .Callback<User>(u => capturedUser = u)
            .ReturnsAsync((User u) => u);

        _mockJwtService
            .Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("token");

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        capturedUser.Should().NotBeNull();
        capturedUser!.Email.Should().Be("john.doe@example.com");
    }

    [Fact]
    public async Task Handle_HashesPasswordBeforeStorage()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "test@example.com",
            Password: "MyPlainPassword"
        );

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockPasswordService
            .Setup(p => p.HashPassword("MyPlainPassword"))
            .Returns("securely-hashed-password");

        User? capturedUser = null;
        _mockUserRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>()))
            .Callback<User>(u => capturedUser = u)
            .ReturnsAsync((User u) => u);

        _mockJwtService
            .Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("token");

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        capturedUser.Should().NotBeNull();
        capturedUser!.PasswordHash.Should().Be("securely-hashed-password");
        _mockPasswordService.Verify(p => p.HashPassword("MyPlainPassword"), Times.Once);
    }

    #endregion

    #region Validation Scenarios

    [Fact]
    public async Task Handle_WithEmptyEmail_ReturnsValidationError()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "",
            Password: "password123"
        );

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
        var command = new RegisterCommand(
            Email: "test@example.com",
            Password: ""
        );

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ValidationFailed");
    }

    [Fact]
    public async Task Handle_WithInvalidEmailFormat_ReturnsValidationError()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "invalid-email",
            Password: "password123"
        );

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ValidationFailed");
        result.Error!.Message.Should().Contain("Invalid email");
    }

    [Fact]
    public async Task Handle_WithShortPassword_ReturnsValidationError()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "test@example.com",
            Password: "12345"
        );

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ValidationFailed");
        result.Error!.Message.Should().Contain("6 characters");
    }

    [Theory]
    [InlineData("123456")]
    [InlineData("abcdef")]
    [InlineData("password")]
    public async Task Handle_WithExactlySixCharPassword_ReturnsSuccess(string password)
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "test@example.com",
            Password: password
        );

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockPasswordService
            .Setup(p => p.HashPassword(It.IsAny<string>()))
            .Returns("hashed");

        _mockUserRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        _mockJwtService
            .Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("token");

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
    }

    #endregion

    #region Conflict Scenarios

    [Fact]
    public async Task Handle_WithExistingEmail_ReturnsConflictError()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "existing@example.com",
            Password: "password123"
        );

        var existingUser = new User { Id = "existing-id", Email = command.Email };

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(command.Email))
            .ReturnsAsync(existingUser);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Conflict");
        result.Error!.Message.Should().Contain("email already exists");
    }

    [Fact]
    public async Task Handle_WithExistingUsername_ReturnsConflictError()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "new@example.com",
            Password: "password123",
            Username: "existinguser"
        );

        var existingUser = new User { Id = "existing-id", Username = command.Username };

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockUserRepository
            .Setup(r => r.GetByUsernameAsync(command.Username!))
            .ReturnsAsync(existingUser);

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Conflict");
        result.Error!.Message.Should().Contain("Username is already taken");
    }

    #endregion

    #region Service Interaction Tests

    [Fact]
    public async Task Handle_CallsPasswordServiceWithPlainPassword()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "test@example.com",
            Password: "SecretPassword123"
        );

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockPasswordService
            .Setup(p => p.HashPassword(It.IsAny<string>()))
            .Returns("hashed");

        _mockUserRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        _mockJwtService
            .Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("token");

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockPasswordService.Verify(p => p.HashPassword("SecretPassword123"), Times.Once);
    }

    [Fact]
    public async Task Handle_CreatesUserInRepository()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "test@example.com",
            Password: "password123",
            Username: "testuser",
            DisplayName: "Test User"
        );

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockUserRepository
            .Setup(r => r.GetByUsernameAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockPasswordService
            .Setup(p => p.HashPassword(It.IsAny<string>()))
            .Returns("hashed");

        _mockUserRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);

        _mockJwtService
            .Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("token");

        // Act
        await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockUserRepository.Verify(
            r => r.CreateAsync(It.Is<User>(u =>
                u.Email == command.Email.ToLowerInvariant() &&
                u.Username == command.Username &&
                u.DisplayName == command.DisplayName &&
                u.IsActive == true)),
            Times.Once);
    }

    [Fact]
    public async Task Handle_GeneratesTokenForCreatedUser()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "test@example.com",
            Password: "password123"
        );

        _mockUserRepository
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        _mockPasswordService
            .Setup(p => p.HashPassword(It.IsAny<string>()))
            .Returns("hashed");

        var createdUser = new User { Id = "created-id", Email = command.Email };
        _mockUserRepository
            .Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync(createdUser);

        _mockJwtService
            .Setup(j => j.GenerateToken(createdUser))
            .Returns("new-user-token");

        // Act
        var result = await _sut.Handle(command, CancellationToken.None);

        // Assert
        _mockJwtService.Verify(j => j.GenerateToken(createdUser), Times.Once);
        result.Value!.Token.Should().Be("new-user-token");
    }

    #endregion

    #region Exception Handling

    [Fact]
    public async Task Handle_WhenRepositoryThrows_ReturnsInternalError()
    {
        // Arrange
        var command = new RegisterCommand(
            Email: "test@example.com",
            Password: "password123"
        );

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
}
