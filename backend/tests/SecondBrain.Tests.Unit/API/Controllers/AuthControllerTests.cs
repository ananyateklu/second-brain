using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Controllers;
using SecondBrain.API.Services;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class AuthControllerTests
{
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly Mock<IJwtService> _mockJwtService;
    private readonly Mock<IPasswordService> _mockPasswordService;
    private readonly Mock<ILogger<AuthController>> _mockLogger;
    private readonly AuthController _sut;

    public AuthControllerTests()
    {
        _mockUserRepository = new Mock<IUserRepository>();
        _mockJwtService = new Mock<IJwtService>();
        _mockPasswordService = new Mock<IPasswordService>();
        _mockLogger = new Mock<ILogger<AuthController>>();

        _sut = new AuthController(
            _mockUserRepository.Object,
            _mockJwtService.Object,
            _mockPasswordService.Object,
            _mockLogger.Object
        );

        // Setup default HttpContext
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    #region Register Tests

    [Fact]
    public async Task Register_WhenValid_ReturnsOkWithAuthResponse()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "password123",
            DisplayName = "Test User"
        };

        _mockUserRepository.Setup(r => r.GetByEmailAsync("test@example.com"))
            .ReturnsAsync((User?)null);

        _mockPasswordService.Setup(p => p.HashPassword("password123"))
            .Returns("hashed_password");

        _mockUserRepository.Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) =>
            {
                u.Id = "new-user-id";
                return u;
            });

        _mockJwtService.Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("jwt_token");

        // Act
        var result = await _sut.Register(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<AuthResponse>().Subject;

        response.UserId.Should().Be("new-user-id");
        response.Email.Should().Be("test@example.com");
        response.DisplayName.Should().Be("Test User");
        response.Token.Should().Be("jwt_token");
        response.IsNewUser.Should().BeTrue();
    }

    [Fact]
    public async Task Register_WhenEmailEmpty_ReturnsBadRequest()
    {
        // Arrange
        var request = new RegisterRequest { Email = "", Password = "password123" };

        // Act
        var result = await _sut.Register(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Register_WhenPasswordEmpty_ReturnsBadRequest()
    {
        // Arrange
        var request = new RegisterRequest { Email = "test@example.com", Password = "" };

        // Act
        var result = await _sut.Register(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Register_WhenEmailInvalid_ReturnsBadRequest()
    {
        // Arrange
        var request = new RegisterRequest { Email = "invalid-email", Password = "password123" };

        // Act
        var result = await _sut.Register(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Register_WhenPasswordTooShort_ReturnsBadRequest()
    {
        // Arrange
        var request = new RegisterRequest { Email = "test@example.com", Password = "12345" };

        // Act
        var result = await _sut.Register(request);

        // Assert
        var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { error = "Password must be at least 6 characters" });
    }

    [Fact]
    public async Task Register_WhenEmailAlreadyExists_ReturnsConflict()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "existing@example.com",
            Password = "password123"
        };

        _mockUserRepository.Setup(r => r.GetByEmailAsync("existing@example.com"))
            .ReturnsAsync(new User { Id = "existing-user", Email = "existing@example.com" });

        // Act
        var result = await _sut.Register(request);

        // Assert
        var conflictResult = result.Result.Should().BeOfType<ConflictObjectResult>().Subject;
        conflictResult.Value.Should().BeEquivalentTo(new { error = "An account with this email already exists" });
    }

    [Fact]
    public async Task Register_NormalizesEmailToLowercase()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "TEST@EXAMPLE.COM",
            Password = "password123"
        };

        User? capturedUser = null;
        _mockUserRepository.Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);
        _mockPasswordService.Setup(p => p.HashPassword(It.IsAny<string>()))
            .Returns("hash");
        _mockUserRepository.Setup(r => r.CreateAsync(It.IsAny<User>()))
            .Callback<User>(u => capturedUser = u)
            .ReturnsAsync((User u) => u);
        _mockJwtService.Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("token");

        // Act
        await _sut.Register(request);

        // Assert
        capturedUser.Should().NotBeNull();
        capturedUser!.Email.Should().Be("test@example.com");
    }

    [Fact]
    public async Task Register_WhenNoDisplayName_UsesEmailPrefix()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "john.doe@example.com",
            Password = "password123"
        };

        User? capturedUser = null;
        _mockUserRepository.Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);
        _mockPasswordService.Setup(p => p.HashPassword(It.IsAny<string>()))
            .Returns("hash");
        _mockUserRepository.Setup(r => r.CreateAsync(It.IsAny<User>()))
            .Callback<User>(u => capturedUser = u)
            .ReturnsAsync((User u) => u);
        _mockJwtService.Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("token");

        // Act
        await _sut.Register(request);

        // Assert
        capturedUser!.DisplayName.Should().Be("john.doe");
    }

    [Fact]
    public async Task Register_SetsUserAsActive()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "password123"
        };

        User? capturedUser = null;
        _mockUserRepository.Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);
        _mockPasswordService.Setup(p => p.HashPassword(It.IsAny<string>()))
            .Returns("hash");
        _mockUserRepository.Setup(r => r.CreateAsync(It.IsAny<User>()))
            .Callback<User>(u => capturedUser = u)
            .ReturnsAsync((User u) => u);
        _mockJwtService.Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("token");

        // Act
        await _sut.Register(request);

        // Assert
        capturedUser!.IsActive.Should().BeTrue();
    }

    #endregion

    #region Login Tests

    [Fact]
    public async Task Login_WhenValid_ReturnsOkWithAuthResponse()
    {
        // Arrange
        var request = new LoginRequest
        {
            Email = "test@example.com",
            Password = "password123"
        };

        var user = new User
        {
            Id = "user-123",
            Email = "test@example.com",
            PasswordHash = "hashed_password",
            DisplayName = "Test User",
            IsActive = true,
            ApiKey = "api-key-123"
        };

        _mockUserRepository.Setup(r => r.GetByEmailAsync("test@example.com"))
            .ReturnsAsync(user);
        _mockPasswordService.Setup(p => p.VerifyPassword("password123", "hashed_password"))
            .Returns(true);
        _mockJwtService.Setup(j => j.GenerateToken(user))
            .Returns("jwt_token");

        // Act
        var result = await _sut.Login(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<AuthResponse>().Subject;

        response.UserId.Should().Be("user-123");
        response.Email.Should().Be("test@example.com");
        response.Token.Should().Be("jwt_token");
        response.ApiKey.Should().Be("api-key-123");
        response.IsNewUser.Should().BeFalse();
    }

    [Fact]
    public async Task Login_WhenEmailEmpty_ReturnsBadRequest()
    {
        // Arrange
        var request = new LoginRequest { Email = "", Password = "password123" };

        // Act
        var result = await _sut.Login(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Login_WhenPasswordEmpty_ReturnsBadRequest()
    {
        // Arrange
        var request = new LoginRequest { Email = "test@example.com", Password = "" };

        // Act
        var result = await _sut.Login(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Login_WhenUserNotFound_ReturnsUnauthorized()
    {
        // Arrange
        var request = new LoginRequest
        {
            Email = "nonexistent@example.com",
            Password = "password123"
        };

        _mockUserRepository.Setup(r => r.GetByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.Login(request);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().BeEquivalentTo(new { error = "Invalid email or password" });
    }

    [Fact]
    public async Task Login_WhenPasswordIncorrect_ReturnsUnauthorized()
    {
        // Arrange
        var request = new LoginRequest
        {
            Email = "test@example.com",
            Password = "wrong_password"
        };

        var user = new User
        {
            Id = "user-123",
            Email = "test@example.com",
            PasswordHash = "hashed_password",
            IsActive = true
        };

        _mockUserRepository.Setup(r => r.GetByEmailAsync("test@example.com"))
            .ReturnsAsync(user);
        _mockPasswordService.Setup(p => p.VerifyPassword("wrong_password", "hashed_password"))
            .Returns(false);

        // Act
        var result = await _sut.Login(request);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().BeEquivalentTo(new { error = "Invalid email or password" });
    }

    [Fact]
    public async Task Login_WhenUserHasNoPasswordHash_ReturnsUnauthorized()
    {
        // Arrange
        var request = new LoginRequest
        {
            Email = "test@example.com",
            Password = "password123"
        };

        var user = new User
        {
            Id = "user-123",
            Email = "test@example.com",
            PasswordHash = null,
            IsActive = true
        };

        _mockUserRepository.Setup(r => r.GetByEmailAsync("test@example.com"))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.Login(request);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Login_WhenUserInactive_ReturnsUnauthorized()
    {
        // Arrange
        var request = new LoginRequest
        {
            Email = "test@example.com",
            Password = "password123"
        };

        var user = new User
        {
            Id = "user-123",
            Email = "test@example.com",
            PasswordHash = "hashed_password",
            IsActive = false
        };

        _mockUserRepository.Setup(r => r.GetByEmailAsync("test@example.com"))
            .ReturnsAsync(user);
        _mockPasswordService.Setup(p => p.VerifyPassword("password123", "hashed_password"))
            .Returns(true);

        // Act
        var result = await _sut.Login(request);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().BeEquivalentTo(new { error = "User account is inactive" });
    }

    [Fact]
    public async Task Login_NormalizesEmailToLowercase()
    {
        // Arrange
        var request = new LoginRequest
        {
            Email = "TEST@EXAMPLE.COM",
            Password = "password123"
        };

        var user = new User
        {
            Id = "user-123",
            Email = "test@example.com",
            PasswordHash = "hash",
            IsActive = true
        };

        _mockUserRepository.Setup(r => r.GetByEmailAsync("test@example.com"))
            .ReturnsAsync(user);
        _mockPasswordService.Setup(p => p.VerifyPassword(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(true);
        _mockJwtService.Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns("token");

        // Act
        await _sut.Login(request);

        // Assert
        _mockUserRepository.Verify(r => r.GetByEmailAsync("test@example.com"), Times.Once);
    }

    #endregion

    #region GetCurrentUser Tests

    [Fact]
    public async Task GetCurrentUser_WhenAuthenticated_ReturnsOkWithUser()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            DisplayName = "Test User",
            ApiKey = "api-key"
        };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetCurrentUser();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<AuthResponse>().Subject;

        response.UserId.Should().Be(userId);
        response.Email.Should().Be("test@example.com");
        response.DisplayName.Should().Be("Test User");
        response.ApiKey.Should().Be("api-key");
    }

    [Fact]
    public async Task GetCurrentUser_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange - no UserId in HttpContext
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        // Act
        var result = await _sut.GetCurrentUser();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task GetCurrentUser_WhenUserNotFound_ReturnsUnauthorized()
    {
        // Arrange
        var userId = "non-existent";
        SetupAuthenticatedUser(userId);

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.GetCurrentUser();

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().BeEquivalentTo(new { error = "User not found" });
    }

    #endregion

    #region GenerateApiKey Tests

    [Fact]
    public async Task GenerateApiKey_WhenAuthenticated_ReturnsNewApiKey()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var user = new User
        {
            Id = userId,
            Email = "test@example.com"
        };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string id, User u) => u);

        // Act
        var result = await _sut.GenerateApiKey();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiKeyResponse>().Subject;

        response.ApiKey.Should().NotBeNullOrEmpty();
        response.ApiKey.Should().HaveLength(32); // GUID without hyphens
    }

    [Fact]
    public async Task GenerateApiKey_WhenNotAuthenticated_ReturnsUnauthorized()
    {
        // Arrange
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        // Act
        var result = await _sut.GenerateApiKey();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task GenerateApiKey_WhenUserNotFound_ReturnsUnauthorized()
    {
        // Arrange
        var userId = "non-existent";
        SetupAuthenticatedUser(userId);

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync((User?)null);

        // Act
        var result = await _sut.GenerateApiKey();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task GenerateApiKey_UpdatesUserUpdatedAt()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var originalTime = new DateTime(2023, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var user = new User
        {
            Id = userId,
            Email = "test@example.com",
            UpdatedAt = originalTime
        };

        _mockUserRepository.Setup(r => r.GetByIdAsync(userId))
            .ReturnsAsync(user);
        _mockUserRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>()))
            .ReturnsAsync((string id, User u) => u);

        var beforeGenerate = DateTime.UtcNow;

        // Act
        await _sut.GenerateApiKey();

        // Assert
        user.UpdatedAt.Should().BeOnOrAfter(beforeGenerate);
    }

    #endregion

    #region Helper Methods

    private void SetupAuthenticatedUser(string userId)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Items["UserId"] = userId;
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    #endregion
}

