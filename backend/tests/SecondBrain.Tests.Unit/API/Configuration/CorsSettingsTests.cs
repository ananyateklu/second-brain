namespace SecondBrain.Tests.Unit.API.Configuration;

using SecondBrain.API.Configuration;

public class CorsSettingsTests
{
    #region Default Values Tests

    [Fact]
    public void DefaultAllowedOrigins_ShouldBeEmpty()
    {
        // Arrange & Act
        var settings = new CorsSettings();

        // Assert
        settings.AllowedOrigins.Should().BeEmpty();
    }

    [Fact]
    public void DefaultAllowLocalNetworkIps_ShouldBeTrue()
    {
        // Arrange & Act
        var settings = new CorsSettings();

        // Assert
        settings.AllowLocalNetworkIps.Should().BeTrue();
    }

    #endregion

    #region Property Setters Tests

    [Fact]
    public void AllowedOrigins_CanBeSet()
    {
        // Arrange
        var settings = new CorsSettings();
        var origins = new[] { "https://example.com", "https://app.example.com" };

        // Act
        settings.AllowedOrigins = origins;

        // Assert
        settings.AllowedOrigins.Should().BeEquivalentTo(origins);
    }

    [Fact]
    public void AllowLocalNetworkIps_CanBeSetToFalse()
    {
        // Arrange
        var settings = new CorsSettings();

        // Act
        settings.AllowLocalNetworkIps = false;

        // Assert
        settings.AllowLocalNetworkIps.Should().BeFalse();
    }

    [Fact]
    public void AllowedOrigins_CanContainMultipleOrigins()
    {
        // Arrange
        var settings = new CorsSettings();
        var origins = new[]
        {
            "https://example.com",
            "https://app.example.com",
            "http://localhost:3000",
            "http://localhost:5173"
        };

        // Act
        settings.AllowedOrigins = origins;

        // Assert
        settings.AllowedOrigins.Should().HaveCount(4);
        settings.AllowedOrigins.Should().Contain("https://example.com");
        settings.AllowedOrigins.Should().Contain("http://localhost:3000");
    }

    [Fact]
    public void AllowedOrigins_CanBeReplacedWithNewArray()
    {
        // Arrange
        var settings = new CorsSettings();
        settings.AllowedOrigins = new[] { "https://old.com" };

        // Act
        settings.AllowedOrigins = new[] { "https://new.com" };

        // Assert
        settings.AllowedOrigins.Should().HaveCount(1);
        settings.AllowedOrigins.Should().Contain("https://new.com");
        settings.AllowedOrigins.Should().NotContain("https://old.com");
    }

    #endregion
}

