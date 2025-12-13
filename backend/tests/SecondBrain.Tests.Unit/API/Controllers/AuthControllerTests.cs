using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.API.Controllers;
using SecondBrain.Application.Commands.Auth.GenerateApiKey;
using SecondBrain.Application.Commands.Auth.Login;
using SecondBrain.Application.Commands.Auth.Register;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.Auth.GetCurrentUser;
using SecondBrain.Core.Common;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class AuthControllerTests
{
    private readonly Mock<IMediator> _mockMediator;
    private readonly AuthController _sut;

    public AuthControllerTests()
    {
        _mockMediator = new Mock<IMediator>();

        _sut = new AuthController(_mockMediator.Object);

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

        var expectedResponse = new AuthResponse
        {
            UserId = "new-user-id",
            Email = "test@example.com",
            DisplayName = "Test User",
            Token = "jwt_token",
            IsNewUser = true
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<RegisterCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Success(expectedResponse));

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

        _mockMediator
            .Setup(m => m.Send(It.IsAny<RegisterCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(Error.Validation("Email and password are required")));

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

        _mockMediator
            .Setup(m => m.Send(It.IsAny<RegisterCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(Error.Validation("Email and password are required")));

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

        _mockMediator
            .Setup(m => m.Send(It.IsAny<RegisterCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(Error.Validation("Invalid email format")));

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

        _mockMediator
            .Setup(m => m.Send(It.IsAny<RegisterCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(Error.Validation("Password must be at least 6 characters")));

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

        _mockMediator
            .Setup(m => m.Send(It.IsAny<RegisterCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(Error.Custom("Conflict", "An account with this email already exists")));

        // Act
        var result = await _sut.Register(request);

        // Assert
        var conflictResult = result.Result.Should().BeOfType<ConflictObjectResult>().Subject;
        conflictResult.Value.Should().BeEquivalentTo(new { error = "An account with this email already exists" });
    }

    [Fact]
    public async Task Register_PassesCorrectCommandToMediator()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "TEST@EXAMPLE.COM",
            Password = "password123",
            Username = "testuser",
            DisplayName = "Test User"
        };

        RegisterCommand? capturedCommand = null;
        _mockMediator
            .Setup(m => m.Send(It.IsAny<RegisterCommand>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<Result<AuthResponse>>, CancellationToken>((cmd, _) => capturedCommand = (RegisterCommand)cmd)
            .ReturnsAsync(Result<AuthResponse>.Success(new AuthResponse()));

        // Act
        await _sut.Register(request);

        // Assert
        capturedCommand.Should().NotBeNull();
        capturedCommand!.Email.Should().Be("TEST@EXAMPLE.COM");
        capturedCommand.Password.Should().Be("password123");
        capturedCommand.Username.Should().Be("testuser");
        capturedCommand.DisplayName.Should().Be("Test User");
    }

    #endregion

    #region Login Tests

    [Fact]
    public async Task Login_WhenValid_ReturnsOkWithAuthResponse()
    {
        // Arrange
        var request = new LoginRequest
        {
            Identifier = "test@example.com",
            Password = "password123"
        };

        var expectedResponse = new AuthResponse
        {
            UserId = "user-123",
            Email = "test@example.com",
            DisplayName = "Test User",
            ApiKey = "api-key-123",
            Token = "jwt_token",
            IsNewUser = false
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<LoginCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Success(expectedResponse));

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
        var request = new LoginRequest { Identifier = "", Password = "password123" };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<LoginCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(Error.Validation("Email/Username and password are required")));

        // Act
        var result = await _sut.Login(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Login_WhenPasswordEmpty_ReturnsBadRequest()
    {
        // Arrange
        var request = new LoginRequest { Identifier = "test@example.com", Password = "" };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<LoginCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(Error.Validation("Email/Username and password are required")));

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
            Identifier = "nonexistent@example.com",
            Password = "password123"
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<LoginCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(Error.Custom("Unauthorized", "Invalid credentials")));

        // Act
        var result = await _sut.Login(request);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().BeEquivalentTo(new { error = "Invalid credentials" });
    }

    [Fact]
    public async Task Login_WhenPasswordIncorrect_ReturnsUnauthorized()
    {
        // Arrange
        var request = new LoginRequest
        {
            Identifier = "test@example.com",
            Password = "wrong_password"
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<LoginCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(Error.Custom("Unauthorized", "Invalid credentials")));

        // Act
        var result = await _sut.Login(request);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().BeEquivalentTo(new { error = "Invalid credentials" });
    }

    [Fact]
    public async Task Login_WhenUserInactive_ReturnsUnauthorized()
    {
        // Arrange
        var request = new LoginRequest
        {
            Identifier = "test@example.com",
            Password = "password123"
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<LoginCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(Error.Custom("Unauthorized", "User account is inactive")));

        // Act
        var result = await _sut.Login(request);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().BeEquivalentTo(new { error = "User account is inactive" });
    }

    [Fact]
    public async Task Login_PassesCorrectCommandToMediator()
    {
        // Arrange
        var request = new LoginRequest
        {
            Identifier = "TEST@EXAMPLE.COM",
            Password = "password123"
        };

        LoginCommand? capturedCommand = null;
        _mockMediator
            .Setup(m => m.Send(It.IsAny<LoginCommand>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<Result<AuthResponse>>, CancellationToken>((cmd, _) => capturedCommand = (LoginCommand)cmd)
            .ReturnsAsync(Result<AuthResponse>.Success(new AuthResponse()));

        // Act
        await _sut.Login(request);

        // Assert
        capturedCommand.Should().NotBeNull();
        capturedCommand!.Identifier.Should().Be("TEST@EXAMPLE.COM");
        capturedCommand.Password.Should().Be("password123");
    }

    #endregion

    #region GetCurrentUser Tests

    [Fact]
    public async Task GetCurrentUser_WhenAuthenticated_ReturnsOkWithUser()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var expectedResponse = new AuthResponse
        {
            UserId = userId,
            Email = "test@example.com",
            DisplayName = "Test User",
            ApiKey = "api-key"
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetCurrentUserQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Success(expectedResponse));

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

        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetCurrentUserQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<AuthResponse>.Failure(Error.NotFound("User not found")));

        // Act
        var result = await _sut.GetCurrentUser();

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().BeEquivalentTo(new { error = "User not found" });
    }

    [Fact]
    public async Task GetCurrentUser_PassesCorrectQueryToMediator()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        GetCurrentUserQuery? capturedQuery = null;
        _mockMediator
            .Setup(m => m.Send(It.IsAny<GetCurrentUserQuery>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<Result<AuthResponse>>, CancellationToken>((q, _) => capturedQuery = (GetCurrentUserQuery)q)
            .ReturnsAsync(Result<AuthResponse>.Success(new AuthResponse()));

        // Act
        await _sut.GetCurrentUser();

        // Assert
        capturedQuery.Should().NotBeNull();
        capturedQuery!.UserId.Should().Be(userId);
    }

    #endregion

    #region GenerateApiKey Tests

    [Fact]
    public async Task GenerateApiKey_WhenAuthenticated_ReturnsNewApiKey()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        var expectedResponse = new ApiKeyResponse
        {
            ApiKey = "abcdef12345678901234567890123456",
            GeneratedAt = DateTime.UtcNow
        };

        _mockMediator
            .Setup(m => m.Send(It.IsAny<GenerateApiKeyCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<ApiKeyResponse>.Success(expectedResponse));

        // Act
        var result = await _sut.GenerateApiKey();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiKeyResponse>().Subject;

        response.ApiKey.Should().NotBeNullOrEmpty();
        response.ApiKey.Should().HaveLength(32);
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

        _mockMediator
            .Setup(m => m.Send(It.IsAny<GenerateApiKeyCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<ApiKeyResponse>.Failure(Error.NotFound("User not found")));

        // Act
        var result = await _sut.GenerateApiKey();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task GenerateApiKey_PassesCorrectCommandToMediator()
    {
        // Arrange
        var userId = "user-123";
        SetupAuthenticatedUser(userId);

        GenerateApiKeyCommand? capturedCommand = null;
        _mockMediator
            .Setup(m => m.Send(It.IsAny<GenerateApiKeyCommand>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<Result<ApiKeyResponse>>, CancellationToken>((cmd, _) => capturedCommand = (GenerateApiKeyCommand)cmd)
            .ReturnsAsync(Result<ApiKeyResponse>.Success(new ApiKeyResponse { ApiKey = "test" }));

        // Act
        await _sut.GenerateApiKey();

        // Assert
        capturedCommand.Should().NotBeNull();
        capturedCommand!.UserId.Should().Be(userId);
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
