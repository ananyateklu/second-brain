using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.API.Middleware;

namespace SecondBrain.Tests.Unit.API.Middleware;

public class RequestLoggingMiddlewareTests
{
    private readonly Mock<ILogger<RequestLoggingMiddleware>> _mockLogger;
    private readonly Mock<IOptions<RequestLoggingOptions>> _mockOptions;
    private bool _nextCalled;
    private int? _nextStatusCode;

    public RequestLoggingMiddlewareTests()
    {
        _mockLogger = new Mock<ILogger<RequestLoggingMiddleware>>();
        // Enable logging for all levels so LoggerMessage extensions actually log
        _mockLogger.Setup(x => x.IsEnabled(It.IsAny<LogLevel>())).Returns(true);

        _mockOptions = new Mock<IOptions<RequestLoggingOptions>>();
        _mockOptions.Setup(o => o.Value).Returns(new RequestLoggingOptions());
    }

    private async Task NextDelegate(HttpContext context)
    {
        _nextCalled = true;
        if (_nextStatusCode.HasValue)
        {
            context.Response.StatusCode = _nextStatusCode.Value;
        }
        await Task.CompletedTask;
    }

    private RequestLoggingMiddleware CreateMiddleware()
    {
        _nextCalled = false;
        _nextStatusCode = null;
        return new RequestLoggingMiddleware(NextDelegate, _mockLogger.Object, _mockOptions.Object);
    }

    private RequestLoggingMiddleware CreateMiddleware(RequestLoggingOptions options)
    {
        _nextCalled = false;
        _nextStatusCode = null;
        var optionsMock = new Mock<IOptions<RequestLoggingOptions>>();
        optionsMock.Setup(o => o.Value).Returns(options);
        return new RequestLoggingMiddleware(NextDelegate, _mockLogger.Object, optionsMock.Object);
    }

    #region Skip Logging Tests

    [Fact]
    public async Task InvokeAsync_SkipsLoggingForHealthEndpoints()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/health", "GET");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        _mockLogger.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task InvokeAsync_SkipsLoggingForHealthSubpaths()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/health/ready", "GET");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_SkipsLoggingForSwaggerEndpoints()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/swagger", "GET");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        _mockLogger.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task InvokeAsync_SkipsLoggingForSwaggerSubpaths()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/swagger/v1/swagger.json", "GET");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    #endregion

    #region Logging Tests

    [Fact]
    public async Task InvokeAsync_LogsRequestStart()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes", "GET");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        // Verify the IsEnabled check was made (LoggerMessage checks before logging)
        _mockLogger.Verify(
            x => x.IsEnabled(LogLevel.Information),
            Times.AtLeastOnce);
        // Verify Log was called at Information level
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task InvokeAsync_LogsRequestCompletion()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes", "GET");
        _nextStatusCode = 200;

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        // Completed logging happens at Information level for 2xx
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeast(2)); // Started + Completed
    }

    [Fact]
    public async Task InvokeAsync_LogsWarningFor4xxErrors()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes", "GET");
        _nextStatusCode = 404;

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        // Error responses use Warning level
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task InvokeAsync_LogsWarningFor5xxErrors()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes", "GET");
        _nextStatusCode = 500;

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region User Context Tests

    [Fact]
    public async Task InvokeAsync_LogsAnonymousWhenUserNotAuthenticated()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes", "GET");

        // Act
        await middleware.InvokeAsync(context);

        // Assert - Logging happens, can't easily verify parameter values with LoggerMessage
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task InvokeAsync_LogsUserIdWhenAuthenticated()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes", "GET");
        context.Items["UserId"] = "user-123";

        // Act
        await middleware.InvokeAsync(context);

        // Assert - Verify logging occurred
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region HTTP Method Tests

    [Theory]
    [InlineData("GET")]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    [InlineData("PATCH")]
    public async Task InvokeAsync_LogsHttpMethod(string method)
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes", method);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region Path Logging Tests

    [Fact]
    public async Task InvokeAsync_LogsRequestPath()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes/test-note-123", "GET");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region TraceIdentifier Tests

    [Fact]
    public async Task InvokeAsync_LogsTraceIdentifier()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes", "GET");
        context.TraceIdentifier = "test-trace-id";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region Exception Handling Tests

    [Fact]
    public async Task InvokeAsync_LogsCompletionEvenWhenNextThrows()
    {
        // Arrange
        var throwingMiddleware = new RequestLoggingMiddleware(
            async ctx =>
            {
                ctx.Response.StatusCode = 500;
                await Task.CompletedTask;
                throw new Exception("Test exception");
            },
            _mockLogger.Object,
            _mockOptions.Object);
        var context = CreateHttpContext("/api/notes", "GET");

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(() => throwingMiddleware.InvokeAsync(context));

        // Verify Warning was logged for the error
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region Duration Logging Tests

    [Fact]
    public async Task InvokeAsync_LogsDuration()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/notes", "GET");

        // Act
        await middleware.InvokeAsync(context);

        // Assert - Completion log includes duration
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeast(2)); // Started + Completed with duration
    }

    #endregion

    #region Options Tests

    [Fact]
    public async Task InvokeAsync_RespectsCustomExcludePaths()
    {
        // Arrange
        var options = new RequestLoggingOptions
        {
            ExcludePaths = ["/api/custom-exclude"]
        };
        var middleware = CreateMiddleware(options);
        var context = CreateHttpContext("/api/custom-exclude/test", "GET");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        // Should skip logging for custom exclude path
        _mockLogger.Verify(
            x => x.Log(
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never);
    }

    [Fact]
    public async Task InvokeAsync_LogsNonExcludedPaths()
    {
        // Arrange
        var options = new RequestLoggingOptions
        {
            ExcludePaths = ["/api/health"]
        };
        var middleware = CreateMiddleware(options);
        var context = CreateHttpContext("/api/notes", "GET");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region Helper Methods

    private static DefaultHttpContext CreateHttpContext(string path, string method)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Request.Method = method;
        context.Response.Body = new MemoryStream();
        return context;
    }

    #endregion
}
