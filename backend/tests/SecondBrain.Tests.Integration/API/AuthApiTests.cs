using System.Net;
using System.Net.Http.Json;
using SecondBrain.Tests.Integration.Fixtures;

namespace SecondBrain.Tests.Integration.API;

/// <summary>
/// Integration tests for the Authentication API endpoints.
/// </summary>
[Collection("WebApplication")]
public class AuthApiTests
{
    private readonly WebApplicationFactoryFixture _factory;
    private readonly HttpClient _client;

    public AuthApiTests(WebApplicationFactoryFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_WithValidCredentials_ReturnsSuccess()
    {
        // Arrange
        var uniqueEmail = $"newuser_{Guid.NewGuid():N}@example.com";
        var request = new
        {
            email = uniqueEmail,
            password = "SecurePassword123!",
            displayName = "New User"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<AuthResponse>();
        result.Should().NotBeNull();
        result!.Token.Should().NotBeNullOrEmpty();
        result.Email.Should().Be(uniqueEmail);
    }

    [Fact]
    public async Task Register_WithExistingEmail_ReturnsConflict()
    {
        // Arrange - Register first user
        var email = $"duplicate_{Guid.NewGuid():N}@example.com";
        var request = new
        {
            email = email,
            password = "SecurePassword123!",
            displayName = "First User"
        };
        await _client.PostAsJsonAsync("/api/auth/register", request);

        // Act - Try to register with same email
        var duplicateRequest = new
        {
            email = email,
            password = "DifferentPassword123!",
            displayName = "Duplicate User"
        };
        var response = await _client.PostAsJsonAsync("/api/auth/register", duplicateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Register_WithInvalidEmail_ReturnsBadRequest()
    {
        // Arrange
        var request = new
        {
            email = "not-an-email",
            password = "SecurePassword123!",
            displayName = "Invalid Email User"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WithWeakPassword_ReturnsBadRequest()
    {
        // Arrange
        var request = new
        {
            email = $"weakpass_{Guid.NewGuid():N}@example.com",
            password = "123", // Too weak
            displayName = "Weak Password User"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsToken()
    {
        // Arrange - Register a user first
        var email = $"logintest_{Guid.NewGuid():N}@example.com";
        var password = "SecurePassword123!";
        var registerRequest = new
        {
            email = email,
            password = password,
            displayName = "Login Test User"
        };
        await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

        // Act
        var loginRequest = new
        {
            identifier = email,
            password = password
        };
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<AuthResponse>();
        result.Should().NotBeNull();
        result!.Token.Should().NotBeNullOrEmpty();
        result.Email.Should().Be(email);
    }

    [Fact]
    public async Task Login_WithInvalidPassword_ReturnsUnauthorized()
    {
        // Arrange - Register a user first
        var email = $"wrongpass_{Guid.NewGuid():N}@example.com";
        var registerRequest = new
        {
            email = email,
            password = "CorrectPassword123!",
            displayName = "Wrong Password Test"
        };
        await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

        // Act
        var loginRequest = new
        {
            identifier = email,
            password = "WrongPassword123!"
        };
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_WithNonExistentUser_ReturnsUnauthorized()
    {
        // Arrange
        var loginRequest = new
        {
            identifier = "nonexistent@example.com",
            password = "SomePassword123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_WithVersionedRoute_ReturnsToken()
    {
        // Arrange - Register a user first
        var email = $"versiontest_{Guid.NewGuid():N}@example.com";
        var password = "SecurePassword123!";
        var registerRequest = new
        {
            email = email,
            password = password,
            displayName = "Version Test User"
        };
        await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

        // Act - Test versioned route
        var loginRequest = new
        {
            identifier = email,
            password = password
        };
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", loginRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<AuthResponse>();
        result.Should().NotBeNull();
        result!.Token.Should().NotBeNullOrEmpty();
    }

    /// <summary>
    /// DTO for auth responses.
    /// </summary>
    private record AuthResponse
    {
        public string Token { get; init; } = string.Empty;
        public string Email { get; init; } = string.Empty;
        public string UserId { get; init; } = string.Empty;
        public string DisplayName { get; init; } = string.Empty;
    }
}
