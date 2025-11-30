using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using SecondBrain.API.HealthChecks;
using SecondBrain.Infrastructure.Data;

namespace SecondBrain.Tests.Unit.API.HealthChecks;

public class PostgresHealthCheckTests
{
    private readonly Mock<ILogger<PostgresHealthCheck>> _mockLogger;

    public PostgresHealthCheckTests()
    {
        _mockLogger = new Mock<ILogger<PostgresHealthCheck>>();
    }

    #region Unhealthy Database Tests (Can't connect)

    [Fact]
    public async Task CheckHealthAsync_WhenDatabaseCannotConnect_ReturnsUnhealthy()
    {
        // Arrange
        var mockContext = CreateMockContextThatCannotConnect();
        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };

        // Act
        var result = await healthCheck.CheckHealthAsync(healthContext);

        // Assert
        result.Status.Should().Be(HealthStatus.Unhealthy);
        result.Description.Should().Contain("PostgreSQL is not accessible");
    }

    [Fact]
    public async Task CheckHealthAsync_WhenUnhealthy_IncludesTimestamp()
    {
        // Arrange
        var mockContext = CreateMockContextThatCannotConnect();
        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };

        // Act
        var result = await healthCheck.CheckHealthAsync(healthContext);

        // Assert
        result.Data.Should().ContainKey("timestamp");
    }

    [Fact]
    public async Task CheckHealthAsync_WhenUnhealthy_ReturnsData()
    {
        // Arrange
        var mockContext = CreateMockContextThatCannotConnect();
        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };

        // Act
        var result = await healthCheck.CheckHealthAsync(healthContext);

        // Assert
        result.Data.Should().NotBeNull();
        result.Data.Should().NotBeEmpty();
    }

    #endregion

    #region Exception Handling Tests

    [Fact]
    public async Task CheckHealthAsync_WhenExceptionThrown_ReturnsUnhealthy()
    {
        // Arrange
        var mockContext = CreateMockContextThatThrows(new Exception("Connection failed"));
        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };

        // Act
        var result = await healthCheck.CheckHealthAsync(healthContext);

        // Assert
        result.Status.Should().Be(HealthStatus.Unhealthy);
        result.Description.Should().Contain("PostgreSQL is not accessible");
    }

    [Fact]
    public async Task CheckHealthAsync_WhenExceptionThrown_IncludesExceptionInResult()
    {
        // Arrange
        var exception = new Exception("Connection failed");
        var mockContext = CreateMockContextThatThrows(exception);
        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };

        // Act
        var result = await healthCheck.CheckHealthAsync(healthContext);

        // Assert
        result.Exception.Should().Be(exception);
    }

    [Fact]
    public async Task CheckHealthAsync_WhenExceptionThrown_IncludesErrorMessage()
    {
        // Arrange
        var exception = new Exception("Connection timeout");
        var mockContext = CreateMockContextThatThrows(exception);
        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };

        // Act
        var result = await healthCheck.CheckHealthAsync(healthContext);

        // Assert
        result.Data.Should().ContainKey("error");
        result.Data["error"].Should().Be("Connection timeout");
    }

    [Fact]
    public async Task CheckHealthAsync_WhenExceptionThrown_IncludesTimestamp()
    {
        // Arrange
        var exception = new Exception("Connection failed");
        var mockContext = CreateMockContextThatThrows(exception);
        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };

        // Act
        var result = await healthCheck.CheckHealthAsync(healthContext);

        // Assert
        result.Data.Should().ContainKey("timestamp");
    }

    [Fact]
    public async Task CheckHealthAsync_WhenExceptionThrown_LogsError()
    {
        // Arrange
        var exception = new Exception("Connection failed");
        var mockContext = CreateMockContextThatThrows(exception);
        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };

        // Act
        await healthCheck.CheckHealthAsync(healthContext);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("PostgreSQL health check failed")),
                exception,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task CheckHealthAsync_WhenTimeoutException_ReturnsUnhealthy()
    {
        // Arrange
        var exception = new TimeoutException("Connection timed out");
        var mockContext = CreateMockContextThatThrows(exception);
        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };

        // Act
        var result = await healthCheck.CheckHealthAsync(healthContext);

        // Assert
        result.Status.Should().Be(HealthStatus.Unhealthy);
    }

    [Fact]
    public async Task CheckHealthAsync_WhenInvalidOperationException_ReturnsUnhealthy()
    {
        // Arrange
        var exception = new InvalidOperationException("Database not configured");
        var mockContext = CreateMockContextThatThrows(exception);
        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };

        // Act
        var result = await healthCheck.CheckHealthAsync(healthContext);

        // Assert
        result.Status.Should().Be(HealthStatus.Unhealthy);
        result.Exception.Should().Be(exception);
    }

    #endregion

    #region Cancellation Tests

    [Fact]
    public async Task CheckHealthAsync_SupportsCancellationToken()
    {
        // Arrange
        var mockContext = CreateMockContextThatCannotConnect();
        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };
        var cts = new CancellationTokenSource();

        // Act
        var result = await healthCheck.CheckHealthAsync(healthContext, cts.Token);

        // Assert - should complete without throwing
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task CheckHealthAsync_VerifiesCancellationTokenPassed()
    {
        // Arrange
        var cts = new CancellationTokenSource();
        CancellationToken? capturedToken = null;

        var mockDatabaseFacade = new Mock<DatabaseFacade>(MockBehavior.Loose, new object[] { null! });
        mockDatabaseFacade.Setup(d => d.CanConnectAsync(It.IsAny<CancellationToken>()))
            .Callback<CancellationToken>(token => capturedToken = token)
            .ReturnsAsync(false);

        var mockContext = new Mock<ApplicationDbContext>(MockBehavior.Loose, new object[] { CreateDbContextOptions() });
        mockContext.Setup(c => c.Database)
            .Returns(mockDatabaseFacade.Object);

        var healthCheck = new PostgresHealthCheck(mockContext.Object, _mockLogger.Object);
        var healthContext = new HealthCheckContext
        {
            Registration = new HealthCheckRegistration("test", healthCheck, null, null)
        };

        // Act
        await healthCheck.CheckHealthAsync(healthContext, cts.Token);

        // Assert
        capturedToken.Should().Be(cts.Token);
    }

    #endregion

    #region Helper Methods

    private static Mock<ApplicationDbContext> CreateMockContextThatCannotConnect()
    {
        var mockDatabaseFacade = new Mock<DatabaseFacade>(MockBehavior.Loose, new object[] { null! });
        mockDatabaseFacade.Setup(d => d.CanConnectAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var mockContext = new Mock<ApplicationDbContext>(MockBehavior.Loose, new object[] { CreateDbContextOptions() });
        mockContext.Setup(c => c.Database)
            .Returns(mockDatabaseFacade.Object);

        return mockContext;
    }

    private static Mock<ApplicationDbContext> CreateMockContextThatThrows(Exception exception)
    {
        var mockDatabaseFacade = new Mock<DatabaseFacade>(MockBehavior.Loose, new object[] { null! });
        mockDatabaseFacade.Setup(d => d.CanConnectAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(exception);

        var mockContext = new Mock<ApplicationDbContext>(MockBehavior.Loose, new object[] { CreateDbContextOptions() });
        mockContext.Setup(c => c.Database)
            .Returns(mockDatabaseFacade.Object);

        return mockContext;
    }

    private static DbContextOptions<ApplicationDbContext> CreateDbContextOptions()
    {
        return new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql("Host=localhost;Database=test")
            .Options;
    }

    #endregion
}
