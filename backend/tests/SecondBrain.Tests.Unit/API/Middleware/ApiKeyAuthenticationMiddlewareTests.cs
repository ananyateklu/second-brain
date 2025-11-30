using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Middleware;
using SecondBrain.API.Services;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Tests.Unit.API.Middleware;

public class ApiKeyAuthenticationMiddlewareTests
{
    private readonly Mock<ILogger<ApiKeyAuthenticationMiddleware>> _mockLogger;
    private readonly Mock<IUserRepository> _mockUserRepository;
    private readonly Mock<IJwtService> _mockJwtService;
    private bool _nextCalled;

    public ApiKeyAuthenticationMiddlewareTests()
    {
        _mockLogger = new Mock<ILogger<ApiKeyAuthenticationMiddleware>>();
        _mockUserRepository = new Mock<IUserRepository>();
        _mockJwtService = new Mock<IJwtService>();
    }

    private async Task NextDelegate(HttpContext context)
    {
        _nextCalled = true;
        await Task.CompletedTask;
    }

    private ApiKeyAuthenticationMiddleware CreateMiddleware()
    {
        _nextCalled = false;
        return new ApiKeyAuthenticationMiddleware(NextDelegate, _mockLogger.Object);
    }

    #region Skip Authentication Tests

    [Theory]
    [InlineData("/health")]
    [InlineData("/health/live")]
    [InlineData("/api/health")]
    [InlineData("/api/health/ready")]
    [InlineData("/api/ai/health")]
    public async Task InvokeAsync_SkipsAuthenticationForHealthEndpoints(string path)
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext(path);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    [Theory]
    [InlineData("/swagger")]
    [InlineData("/swagger/index.html")]
    [InlineData("/openapi")]
    [InlineData("/openapi/v1.json")]
    [InlineData("/api/docs")]
    [InlineData("/scalar")]
    public async Task InvokeAsync_SkipsAuthenticationForSwaggerEndpoints(string path)
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext(path);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    [Theory]
    [InlineData("/auth/login")]
    [InlineData("/auth/register")]
    [InlineData("/api/auth/login")]
    [InlineData("/api/auth/register")]
    public async Task InvokeAsync_SkipsAuthenticationForAuthEndpoints(string path)
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext(path);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    #endregion

    #region Missing Authorization Header Tests

    [Fact]
    public async Task InvokeAsync_WhenNoAuthorizationHeader_Returns401()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        _nextCalled.Should().BeFalse();
    }

    #endregion

    #region JWT Authentication Tests

    [Fact]
    public async Task InvokeAsync_WithValidJwtToken_AuthenticatesUser()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "Bearer valid-token";

        var userId = "user-123";
        var user = CreateTestUser(userId, true);
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId)
        }));

        _mockJwtService.Setup(s => s.ValidateToken("valid-token")).Returns(claims);
        _mockUserRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        _nextCalled.Should().BeTrue();
        context.Items["UserId"].Should().Be(userId);
        context.Items["AuthMethod"].Should().Be("JWT");
    }

    [Fact]
    public async Task InvokeAsync_WithEmptyBearerToken_Returns401()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "Bearer ";

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        _nextCalled.Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_WithInvalidJwtToken_Returns401()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "Bearer invalid-token";

        _mockJwtService.Setup(s => s.ValidateToken("invalid-token")).Returns((ClaimsPrincipal?)null);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        _nextCalled.Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_WhenJwtTokenMissingUserIdClaim_Returns401()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "Bearer token-without-userid";

        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("other-claim", "value")
        }));

        _mockJwtService.Setup(s => s.ValidateToken("token-without-userid")).Returns(claims);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        _nextCalled.Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_WhenJwtUserNotFound_Returns401()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "Bearer valid-token";

        var userId = "non-existent-user";
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId)
        }));

        _mockJwtService.Setup(s => s.ValidateToken("valid-token")).Returns(claims);
        _mockUserRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync((User?)null);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        _nextCalled.Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_WhenJwtUserIsInactive_Returns401()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "Bearer valid-token";

        var userId = "user-123";
        var user = CreateTestUser(userId, isActive: false);
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId)
        }));

        _mockJwtService.Setup(s => s.ValidateToken("valid-token")).Returns(claims);
        _mockUserRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        _nextCalled.Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_WhenJwtValidationThrows_Returns401()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "Bearer exception-token";

        _mockJwtService.Setup(s => s.ValidateToken("exception-token"))
            .Throws(new Exception("Token validation failed"));

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        _nextCalled.Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_WithSubClaim_ExtractsUserId()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "Bearer valid-token";

        var userId = "user-with-sub";
        var user = CreateTestUser(userId, true);
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("sub", userId)
        }));

        _mockJwtService.Setup(s => s.ValidateToken("valid-token")).Returns(claims);
        _mockUserRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        _nextCalled.Should().BeTrue();
        context.Items["UserId"].Should().Be(userId);
    }

    #endregion

    #region API Key Authentication Tests

    [Fact]
    public async Task InvokeAsync_WithValidApiKey_AuthenticatesUser()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "ApiKey valid-api-key";

        var userId = "user-123";
        _mockUserRepository.Setup(r => r.ResolveUserIdByApiKeyAsync("valid-api-key"))
            .ReturnsAsync(userId);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        _nextCalled.Should().BeTrue();
        context.Items["UserId"].Should().Be(userId);
        context.Items["ApiKey"].Should().Be("valid-api-key");
        context.Items["AuthMethod"].Should().Be("ApiKey");
    }

    [Fact]
    public async Task InvokeAsync_WithEmptyApiKey_Returns401()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "ApiKey ";

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        _nextCalled.Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_WithInvalidApiKey_Returns401()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "ApiKey invalid-api-key";

        _mockUserRepository.Setup(r => r.ResolveUserIdByApiKeyAsync("invalid-api-key"))
            .ReturnsAsync((string?)null);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        _nextCalled.Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_WhenApiKeyLookupThrows_Returns500()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "ApiKey exception-key";

        _mockUserRepository.Setup(r => r.ResolveUserIdByApiKeyAsync("exception-key"))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
        _nextCalled.Should().BeFalse();
    }

    #endregion

    #region Invalid Authorization Format Tests

    [Fact]
    public async Task InvokeAsync_WithInvalidAuthorizationFormat_Returns401()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "InvalidFormat some-token";

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        _nextCalled.Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_WithOnlyToken_Returns401()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "some-token-without-prefix";

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        _nextCalled.Should().BeFalse();
    }

    #endregion

    #region Case Sensitivity Tests

    [Theory]
    [InlineData("bearer valid-token")]
    [InlineData("BEARER valid-token")]
    [InlineData("Bearer valid-token")]
    public async Task InvokeAsync_BearerPrefixIsCaseInsensitive(string authHeader)
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = authHeader;

        var userId = "user-123";
        var user = CreateTestUser(userId, true);
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId)
        }));

        _mockJwtService.Setup(s => s.ValidateToken("valid-token")).Returns(claims);
        _mockUserRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    [Theory]
    [InlineData("apikey valid-api-key")]
    [InlineData("APIKEY valid-api-key")]
    [InlineData("ApiKey valid-api-key")]
    public async Task InvokeAsync_ApiKeyPrefixIsCaseInsensitive(string authHeader)
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = authHeader;

        _mockUserRepository.Setup(r => r.ResolveUserIdByApiKeyAsync("valid-api-key"))
            .ReturnsAsync("user-123");

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    #endregion

    #region User Context Tests

    [Fact]
    public async Task InvokeAsync_WithJwt_StoresUserObjectInContext()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes");
        context.Request.Headers["Authorization"] = "Bearer valid-token";

        var userId = "user-123";
        var user = CreateTestUser(userId, true);
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId)
        }));

        _mockJwtService.Setup(s => s.ValidateToken("valid-token")).Returns(claims);
        _mockUserRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);

        // Act
        await middleware.InvokeAsync(context, _mockUserRepository.Object, _mockJwtService.Object);

        // Assert
        context.Items["User"].Should().Be(user);
    }

    #endregion

    #region Helper Methods

    private static DefaultHttpContext CreateHttpContext(string path)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static User CreateTestUser(string userId, bool isActive)
    {
        return new User
        {
            Id = userId,
            DisplayName = "testuser",
            Email = "test@example.com",
            PasswordHash = "hash",
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };
    }

    #endregion
}

