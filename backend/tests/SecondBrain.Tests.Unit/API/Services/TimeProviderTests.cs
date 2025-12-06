using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using SecondBrain.API.Configuration;
using SecondBrain.API.Services;
using SecondBrain.Core.Entities;

namespace SecondBrain.Tests.Unit.API.Services;

/// <summary>
/// Tests demonstrating the use of FakeTimeProvider for time-dependent behavior testing.
/// FakeTimeProvider allows tests to control and advance time, making time-based logic deterministic and testable.
/// </summary>
public class TimeProviderTests
{
    private readonly JwtSettings _jwtSettings;
    private readonly Mock<ILogger<JwtService>> _mockLogger;

    public TimeProviderTests()
    {
        _jwtSettings = new JwtSettings
        {
            SecretKey = "this-is-a-super-secret-key-with-at-least-32-characters",
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            ExpiryMinutes = 60
        };

        _mockLogger = new Mock<ILogger<JwtService>>();
    }

    #region FakeTimeProvider Basic Usage

    [Fact]
    public void FakeTimeProvider_StartsAtConfiguredTime()
    {
        // Arrange
        var startTime = new DateTimeOffset(2024, 6, 15, 12, 0, 0, TimeSpan.Zero);
        var fakeTime = new FakeTimeProvider(startTime);

        // Act
        var currentTime = fakeTime.GetUtcNow();

        // Assert
        currentTime.Should().Be(startTime);
    }

    [Fact]
    public void FakeTimeProvider_AdvanceMovesTimeForward()
    {
        // Arrange
        var startTime = new DateTimeOffset(2024, 6, 15, 12, 0, 0, TimeSpan.Zero);
        var fakeTime = new FakeTimeProvider(startTime);

        // Act
        fakeTime.Advance(TimeSpan.FromHours(2));
        var currentTime = fakeTime.GetUtcNow();

        // Assert
        currentTime.Should().Be(startTime.AddHours(2));
    }

    [Fact]
    public void FakeTimeProvider_SetUtcNowSetsExactTime()
    {
        // Arrange
        var fakeTime = new FakeTimeProvider();
        var targetTime = new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);

        // Act
        fakeTime.SetUtcNow(targetTime);
        var currentTime = fakeTime.GetUtcNow();

        // Assert
        currentTime.Should().Be(targetTime);
    }

    #endregion

    #region Token Expiration Tests with FakeTimeProvider

    [Fact]
    public void Token_IsValidImmediatelyAfterGeneration()
    {
        // Arrange
        var startTime = new DateTimeOffset(2024, 6, 15, 12, 0, 0, TimeSpan.Zero);
        var fakeTime = new FakeTimeProvider(startTime);
        var jwtService = new JwtService(Options.Create(_jwtSettings), _mockLogger.Object);
        var user = CreateTestUser();

        // Act
        var token = jwtService.GenerateToken(user);
        var principal = jwtService.ValidateToken(token);

        // Assert
        principal.Should().NotBeNull();

        // Token should be valid at generation time
        var jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwtToken.ValidTo.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public void Token_ExpiresAfterConfiguredDuration()
    {
        // Arrange
        var startTime = new DateTimeOffset(2024, 6, 15, 12, 0, 0, TimeSpan.Zero);
        var fakeTime = new FakeTimeProvider(startTime);
        var jwtService = new JwtService(Options.Create(_jwtSettings), _mockLogger.Object);
        var user = CreateTestUser();

        // Act
        var token = jwtService.GenerateToken(user);
        var jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);

        // Assert - Token should expire exactly after ExpiryMinutes
        var expectedExpiry = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes);
        jwtToken.ValidTo.Should().BeCloseTo(expectedExpiry, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void Token_ValidToReflectsExpirationTime()
    {
        // Arrange
        var jwtService = new JwtService(Options.Create(_jwtSettings), _mockLogger.Object);
        var user = CreateTestUser();
        var generationTime = DateTime.UtcNow;

        // Act
        var token = jwtService.GenerateToken(user);

        // Assert
        var jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);
        var expectedExpiry = generationTime.AddMinutes(_jwtSettings.ExpiryMinutes);

        // ValidTo should be approximately ExpiryMinutes after generation
        jwtToken.ValidTo.Should().BeCloseTo(expectedExpiry, TimeSpan.FromSeconds(10));
    }

    #endregion

    #region Time-Dependent Service Pattern Tests

    [Fact]
    public void FakeTimeProvider_CanSimulateTimePassage()
    {
        // Arrange - Start at a known time
        var startTime = new DateTimeOffset(2024, 1, 1, 9, 0, 0, TimeSpan.Zero);
        var fakeTime = new FakeTimeProvider(startTime);

        // Act - Simulate a workday passing
        fakeTime.Advance(TimeSpan.FromHours(8)); // 9 AM to 5 PM

        // Assert
        fakeTime.GetUtcNow().Hour.Should().Be(17); // 5 PM
    }

    [Fact]
    public void FakeTimeProvider_CanCrossDateBoundary()
    {
        // Arrange - Start at 11 PM
        var startTime = new DateTimeOffset(2024, 1, 1, 23, 0, 0, TimeSpan.Zero);
        var fakeTime = new FakeTimeProvider(startTime);

        // Act - Advance 2 hours (crosses midnight)
        fakeTime.Advance(TimeSpan.FromHours(2));

        // Assert
        var newTime = fakeTime.GetUtcNow();
        newTime.Day.Should().Be(2);
        newTime.Hour.Should().Be(1);
    }

    [Fact]
    public void FakeTimeProvider_AdvanceMultipleTimes()
    {
        // Arrange
        var startTime = new DateTimeOffset(2024, 6, 1, 0, 0, 0, TimeSpan.Zero);
        var fakeTime = new FakeTimeProvider(startTime);

        // Act - Advance in increments
        fakeTime.Advance(TimeSpan.FromDays(10));
        fakeTime.Advance(TimeSpan.FromDays(5));
        fakeTime.Advance(TimeSpan.FromDays(15));

        // Assert - Total of 30 days
        fakeTime.GetUtcNow().Should().Be(startTime.AddDays(30));
        fakeTime.GetUtcNow().Month.Should().Be(7); // July
    }

    #endregion

    #region Cache Expiration Pattern Tests

    [Fact]
    public void CacheExpiration_ItemValidBeforeExpiry()
    {
        // Arrange - Simulate a cache with 5-minute expiry
        var startTime = new DateTimeOffset(2024, 6, 15, 12, 0, 0, TimeSpan.Zero);
        var fakeTime = new FakeTimeProvider(startTime);
        var cacheExpiry = TimeSpan.FromMinutes(5);
        var itemCachedAt = fakeTime.GetUtcNow();

        // Act - Advance 3 minutes (within expiry window)
        fakeTime.Advance(TimeSpan.FromMinutes(3));

        // Assert - Item should still be valid
        var elapsed = fakeTime.GetUtcNow() - itemCachedAt;
        elapsed.Should().BeLessThan(cacheExpiry);
    }

    [Fact]
    public void CacheExpiration_ItemExpiredAfterExpiry()
    {
        // Arrange - Simulate a cache with 5-minute expiry
        var startTime = new DateTimeOffset(2024, 6, 15, 12, 0, 0, TimeSpan.Zero);
        var fakeTime = new FakeTimeProvider(startTime);
        var cacheExpiry = TimeSpan.FromMinutes(5);
        var itemCachedAt = fakeTime.GetUtcNow();

        // Act - Advance 6 minutes (past expiry window)
        fakeTime.Advance(TimeSpan.FromMinutes(6));

        // Assert - Item should be expired
        var elapsed = fakeTime.GetUtcNow() - itemCachedAt;
        elapsed.Should().BeGreaterThan(cacheExpiry);
    }

    #endregion

    #region Rate Limiting Pattern Tests

    [Fact]
    public void RateLimiting_WindowResetsAfterDuration()
    {
        // Arrange - 1-minute rate limit window
        var startTime = new DateTimeOffset(2024, 6, 15, 12, 0, 0, TimeSpan.Zero);
        var fakeTime = new FakeTimeProvider(startTime);
        var windowDuration = TimeSpan.FromMinutes(1);
        var windowStart = fakeTime.GetUtcNow();

        // Simulate requests at window start
        var requestCount = 0;
        requestCount++; // First request

        // Act - Advance past window
        fakeTime.Advance(TimeSpan.FromSeconds(61));

        // Assert - New window should have started
        var elapsed = fakeTime.GetUtcNow() - windowStart;
        elapsed.Should().BeGreaterThan(windowDuration);

        // In a real implementation, request count would reset
        // This demonstrates the pattern for time-window based logic
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
