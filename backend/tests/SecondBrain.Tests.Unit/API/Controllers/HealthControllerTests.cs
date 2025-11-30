using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using SecondBrain.API.Controllers;

namespace SecondBrain.Tests.Unit.API.Controllers;

public class HealthControllerTests
{
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly HealthController _sut;

    public HealthControllerTests()
    {
        _mockConfiguration = new Mock<IConfiguration>();
        _sut = new HealthController(_mockConfiguration.Object);
    }

    [Fact]
    public void GetHealth_WhenDatabaseProviderIsConfigured_ReturnsConfiguredProvider()
    {
        // Arrange
        _mockConfiguration.Setup(c => c["DatabaseProvider"]).Returns("PostgreSQL");

        // Act
        var result = _sut.GetHealth();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = okResult.Value;
        value.Should().NotBeNull();

        // Use reflection to check anonymous object properties
        var statusProperty = value!.GetType().GetProperty("status");
        var databaseProperty = value.GetType().GetProperty("database");
        var versionProperty = value.GetType().GetProperty("version");
        var timestampProperty = value.GetType().GetProperty("timestamp");

        statusProperty!.GetValue(value).Should().Be("healthy");
        databaseProperty!.GetValue(value).Should().Be("PostgreSQL");
        versionProperty!.GetValue(value).Should().Be("2.0.0");
        timestampProperty!.GetValue(value).Should().BeOfType<DateTime>();
    }

    [Fact]
    public void GetHealth_WhenDatabaseProviderNotConfigured_ReturnsFirestoreDefault()
    {
        // Arrange
        _mockConfiguration.Setup(c => c["DatabaseProvider"]).Returns((string?)null);

        // Act
        var result = _sut.GetHealth();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = okResult.Value;
        value.Should().NotBeNull();

        var databaseProperty = value!.GetType().GetProperty("database");
        databaseProperty!.GetValue(value).Should().Be("Firestore");
    }

    [Fact]
    public void GetHealth_AlwaysReturnsOkStatus()
    {
        // Arrange
        _mockConfiguration.Setup(c => c["DatabaseProvider"]).Returns("TestDB");

        // Act
        var result = _sut.GetHealth();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        okResult.StatusCode.Should().Be(200);
    }

    [Fact]
    public void GetHealth_ReturnsCurrentTimestamp()
    {
        // Arrange
        _mockConfiguration.Setup(c => c["DatabaseProvider"]).Returns("PostgreSQL");
        var beforeCall = DateTime.UtcNow;

        // Act
        var result = _sut.GetHealth();
        var afterCall = DateTime.UtcNow;

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = okResult.Value;
        var timestampProperty = value!.GetType().GetProperty("timestamp");
        var timestamp = (DateTime)timestampProperty!.GetValue(value)!;

        timestamp.Should().BeOnOrAfter(beforeCall);
        timestamp.Should().BeOnOrBefore(afterCall);
    }

    [Theory]
    [InlineData("PostgreSQL")]
    [InlineData("Firestore")]
    [InlineData("MongoDB")]
    [InlineData("SQLServer")]
    public void GetHealth_WithVariousDatabaseProviders_ReturnsConfiguredProvider(string provider)
    {
        // Arrange
        _mockConfiguration.Setup(c => c["DatabaseProvider"]).Returns(provider);

        // Act
        var result = _sut.GetHealth();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = okResult.Value;
        var databaseProperty = value!.GetType().GetProperty("database");
        databaseProperty!.GetValue(value).Should().Be(provider);
    }
}

