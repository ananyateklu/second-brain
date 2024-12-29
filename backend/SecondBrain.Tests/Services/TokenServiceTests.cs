using Xunit;
using Moq;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using SecondBrain.Api.Services;
using SecondBrain.Api.Configuration;
using SecondBrain.Api.Gamification;
using SecondBrain.Data;
using SecondBrain.Data.Entities;
using FluentAssertions;

namespace SecondBrain.Tests.Services;

public class TokenServiceTests
{
    private readonly TokenService _tokenService;
    private readonly Mock<IOptions<JwtSettings>> _jwtSettingsMock;
    private readonly Mock<ILogger<TokenService>> _loggerMock;
    private readonly Mock<IXPService> _xpServiceMock;
    private readonly DataContext _context;

    public TokenServiceTests()
    {
        // Setup JWT settings
        _jwtSettingsMock = new Mock<IOptions<JwtSettings>>();
        _jwtSettingsMock.Setup(x => x.Value).Returns(new JwtSettings
        {
            Secret = "your-256-bit-secret-your-256-bit-secret-your-256-bit-secret",
            Issuer = "SecondBrain",
            Audience = "SecondBrain",
            AccessTokenExpirationMinutes = 60,
            RefreshTokenExpirationDays = 7
        });

        // Setup logger and XP service
        _loggerMock = new Mock<ILogger<TokenService>>();
        _xpServiceMock = new Mock<IXPService>();
        _xpServiceMock.Setup(x => x.CalculateLevel(It.IsAny<int>())).Returns(1);
        _xpServiceMock.Setup(x => x.GetLevelProgressAsync(It.IsAny<string>()))
            .ReturnsAsync((100, 200, 50));

        // Setup in-memory database
        var options = new DbContextOptionsBuilder<DataContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new DataContext(options);

        _tokenService = new TokenService(
            _jwtSettingsMock.Object,
            _context,
            _loggerMock.Object,
            _xpServiceMock.Object);
    }

    [Fact]
    public async Task GenerateTokensAsync_ValidUser_ReturnsTokenResponse()
    {
        // Arrange
        var user = new User
        {
            Id = "test-user-id",
            Email = "test@example.com",
            Name = "Test User",
            ExperiencePoints = 100,
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _tokenService.GenerateTokensAsync(user);

        // Assert
        result.Should().NotBeNull();
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GenerateTokensAsync_NullUser_ThrowsArgumentException()
    {
        // Arrange
        User? user = null;

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            _tokenService.GenerateTokensAsync(user!));
    }

    [Fact]
    public async Task RefreshTokensAsync_ValidToken_ReturnsNewTokens()
    {
        // Arrange
        var user = new User
        {
            Id = "test-user-id",
            Email = "test@example.com",
            Name = "Test User",
            ExperiencePoints = 100,
            CreatedAt = DateTime.UtcNow
        };

        // Add user to database
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Generate initial tokens
        var initialTokens = await _tokenService.GenerateTokensAsync(user);

        // Act
        var result = await _tokenService.RefreshTokensAsync(initialTokens.RefreshToken);

        // Assert
        result.Should().NotBeNull();
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();
        result.AccessToken.Should().NotBe(initialTokens.AccessToken);
        result.RefreshToken.Should().NotBe(initialTokens.RefreshToken);
    }
}