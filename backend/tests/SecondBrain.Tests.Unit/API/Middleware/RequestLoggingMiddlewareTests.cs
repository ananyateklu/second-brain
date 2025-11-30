using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Middleware;

namespace SecondBrain.Tests.Unit.API.Middleware;

public class RequestLoggingMiddlewareTests
{
    private readonly Mock<ILogger<RequestLoggingMiddleware>> _mockLogger;
    private bool _nextCalled;
    private int? _nextStatusCode;

    public RequestLoggingMiddlewareTests()
    {
        _mockLogger = new Mock<ILogger<RequestLoggingMiddleware>>();
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
        return new RequestLoggingMiddleware(NextDelegate, _mockLogger.Object);
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
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("HTTP Request started")),
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
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("HTTP Request completed")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
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
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("HTTP Request completed with error")),
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
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("HTTP Request completed with error")),
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

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("anonymous")),
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

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("user-123")),
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
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains(method)),
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
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("/api/notes/test-note-123")),
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
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("test-trace-id")),
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
            _mockLogger.Object);
        var context = CreateHttpContext("/api/notes", "GET");

        // Act & Assert
        await Assert.ThrowsAsync<Exception>(() => throwingMiddleware.InvokeAsync(context));

        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("HTTP Request completed with error")),
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

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Duration")),
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

