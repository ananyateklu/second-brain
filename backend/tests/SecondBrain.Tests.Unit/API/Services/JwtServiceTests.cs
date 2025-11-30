using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.API.Configuration;
using SecondBrain.API.Services;
using SecondBrain.Core.Entities;

namespace SecondBrain.Tests.Unit.API.Services;

public class JwtServiceTests
{
    private readonly JwtSettings _jwtSettings;
    private readonly Mock<ILogger<JwtService>> _mockLogger;
    private readonly JwtService _sut;

    public JwtServiceTests()
    {
        _jwtSettings = new JwtSettings
        {
            SecretKey = "this-is-a-super-secret-key-with-at-least-32-characters",
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            ExpiryMinutes = 60
        };

        _mockLogger = new Mock<ILogger<JwtService>>();
        _sut = new JwtService(Options.Create(_jwtSettings), _mockLogger.Object);
    }

    #region GenerateToken Tests

    [Fact]
    public void GenerateToken_WhenValidUser_ReturnsNonEmptyToken()
    {
        // Arrange
        var user = CreateTestUser();

        // Act
        var token = _sut.GenerateToken(user);

        // Assert
        token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void GenerateToken_TokenContainsCorrectClaims()
    {
        // Arrange
        var user = CreateTestUser();

        // Act
        var token = _sut.GenerateToken(user);

        // Assert
        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtToken = tokenHandler.ReadJwtToken(token);

        jwtToken.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == user.Id);
        jwtToken.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Email && c.Value == user.Email);
        jwtToken.Claims.Should().Contain(c => c.Type == "displayName" && c.Value == user.DisplayName);
        jwtToken.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Jti);
        jwtToken.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Iat);
    }

    [Fact]
    public void GenerateToken_TokenHasCorrectIssuerAndAudience()
    {
        // Arrange
        var user = CreateTestUser();

        // Act
        var token = _sut.GenerateToken(user);

        // Assert
        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtToken = tokenHandler.ReadJwtToken(token);

        jwtToken.Issuer.Should().Be(_jwtSettings.Issuer);
        jwtToken.Audiences.Should().Contain(_jwtSettings.Audience);
    }

    [Fact]
    public void GenerateToken_TokenHasCorrectExpiry()
    {
        // Arrange
        var user = CreateTestUser();
        var beforeGeneration = DateTime.UtcNow;

        // Act
        var token = _sut.GenerateToken(user);
        var afterGeneration = DateTime.UtcNow;

        // Assert
        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtToken = tokenHandler.ReadJwtToken(token);

        var expectedExpiry = beforeGeneration.AddMinutes(_jwtSettings.ExpiryMinutes);
        jwtToken.ValidTo.Should().BeCloseTo(expectedExpiry, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public void GenerateToken_EachTokenHasUniqueJti()
    {
        // Arrange
        var user = CreateTestUser();
        var tokenHandler = new JwtSecurityTokenHandler();

        // Act
        var token1 = _sut.GenerateToken(user);
        var token2 = _sut.GenerateToken(user);

        // Assert
        var jwtToken1 = tokenHandler.ReadJwtToken(token1);
        var jwtToken2 = tokenHandler.ReadJwtToken(token2);

        var jti1 = jwtToken1.Claims.First(c => c.Type == JwtRegisteredClaimNames.Jti).Value;
        var jti2 = jwtToken2.Claims.First(c => c.Type == JwtRegisteredClaimNames.Jti).Value;

        jti1.Should().NotBe(jti2);
    }

    #endregion

    #region ValidateToken Tests

    [Fact]
    public void ValidateToken_WhenValidToken_ReturnsClaimsPrincipal()
    {
        // Arrange
        var user = CreateTestUser();
        var token = _sut.GenerateToken(user);

        // Act
        var principal = _sut.ValidateToken(token);

        // Assert
        principal.Should().NotBeNull();
        principal!.FindFirst(ClaimTypes.NameIdentifier)?.Value.Should().Be(user.Id);
    }

    [Fact]
    public void ValidateToken_WhenInvalidToken_ReturnsNull()
    {
        // Arrange
        var invalidToken = "this-is-not-a-valid-jwt-token";

        // Act
        var principal = _sut.ValidateToken(invalidToken);

        // Assert
        principal.Should().BeNull();
    }

    [Fact]
    public void ValidateToken_WhenTokenFromDifferentKey_ReturnsNull()
    {
        // Arrange
        var differentSettings = new JwtSettings
        {
            SecretKey = "different-secret-key-with-at-least-32-characters-here",
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            ExpiryMinutes = 60
        };
        var differentService = new JwtService(Options.Create(differentSettings), _mockLogger.Object);
        var tokenFromDifferentKey = differentService.GenerateToken(CreateTestUser());

        // Act
        var principal = _sut.ValidateToken(tokenFromDifferentKey);

        // Assert
        principal.Should().BeNull();
    }

    [Fact]
    public void ValidateToken_WhenTokenWithWrongIssuer_ReturnsNull()
    {
        // Arrange - create token with different issuer
        var differentSettings = new JwtSettings
        {
            SecretKey = _jwtSettings.SecretKey,
            Issuer = "DifferentIssuer",
            Audience = _jwtSettings.Audience,
            ExpiryMinutes = 60
        };
        var differentService = new JwtService(Options.Create(differentSettings), _mockLogger.Object);
        var tokenWithDifferentIssuer = differentService.GenerateToken(CreateTestUser());

        // Act
        var principal = _sut.ValidateToken(tokenWithDifferentIssuer);

        // Assert
        principal.Should().BeNull();
    }

    [Fact]
    public void ValidateToken_WhenTokenWithWrongAudience_ReturnsNull()
    {
        // Arrange - create token with different audience
        var differentSettings = new JwtSettings
        {
            SecretKey = _jwtSettings.SecretKey,
            Issuer = _jwtSettings.Issuer,
            Audience = "DifferentAudience",
            ExpiryMinutes = 60
        };
        var differentService = new JwtService(Options.Create(differentSettings), _mockLogger.Object);
        var tokenWithDifferentAudience = differentService.GenerateToken(CreateTestUser());

        // Act
        var principal = _sut.ValidateToken(tokenWithDifferentAudience);

        // Assert
        principal.Should().BeNull();
    }

    [Fact]
    public void ValidateToken_WhenMalformedToken_ReturnsNull()
    {
        // Arrange
        var malformedToken = "header.payload.signature.extra";

        // Act
        var principal = _sut.ValidateToken(malformedToken);

        // Assert
        principal.Should().BeNull();
    }

    [Fact]
    public void ValidateToken_WhenEmptyToken_ReturnsNull()
    {
        // Act
        var principal = _sut.ValidateToken("");

        // Assert
        principal.Should().BeNull();
    }

    [Fact]
    public void ValidateToken_ExtractsCorrectClaimsFromValidToken()
    {
        // Arrange
        var user = new User
        {
            Id = "test-user-id-123",
            Email = "specific@email.com",
            DisplayName = "Specific User Name"
        };
        var token = _sut.GenerateToken(user);

        // Act
        var principal = _sut.ValidateToken(token);

        // Assert
        principal.Should().NotBeNull();

        var subClaim = principal!.FindFirst(ClaimTypes.NameIdentifier);
        subClaim.Should().NotBeNull();
        subClaim!.Value.Should().Be("test-user-id-123");

        var emailClaim = principal.FindFirst(ClaimTypes.Email);
        emailClaim.Should().NotBeNull();
        emailClaim!.Value.Should().Be("specific@email.com");
    }

    #endregion

    #region Helper Methods

    private static User CreateTestUser()
    {
        return new User
        {
            Id = "user-123",
            Email = "test@example.com",
            DisplayName = "Test User",
            IsActive = true
        };
    }

    #endregion
}

