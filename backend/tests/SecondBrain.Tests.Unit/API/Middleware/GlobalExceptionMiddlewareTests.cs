using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Middleware;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Exceptions;

namespace SecondBrain.Tests.Unit.API.Middleware;

public class GlobalExceptionMiddlewareTests
{
    private readonly Mock<ILogger<GlobalExceptionMiddleware>> _mockLogger;
    private readonly Mock<IHostEnvironment> _mockEnvironment;

    public GlobalExceptionMiddlewareTests()
    {
        _mockLogger = new Mock<ILogger<GlobalExceptionMiddleware>>();
        _mockEnvironment = new Mock<IHostEnvironment>();
    }

    #region Successful Request Tests

    [Fact]
    public async Task InvokeAsync_WhenNoException_CallsNextDelegate()
    {
        // Arrange
        var nextCalled = false;
        RequestDelegate next = context =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        };

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        nextCalled.Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_WhenNoException_DoesNotModifyResponse()
    {
        // Arrange
        RequestDelegate next = context =>
        {
            context.Response.StatusCode = 200;
            return Task.CompletedTask;
        };

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be(200);
    }

    #endregion

    #region NotFoundException Tests

    [Fact]
    public async Task InvokeAsync_WhenNotFoundException_Returns404()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new NotFoundException("Resource not found");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task InvokeAsync_WhenNotFoundException_ReturnsCorrectMessage()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new NotFoundException("User not found");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ErrorResponse>(context);
        response.Message.Should().Be("User not found");
        response.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task InvokeAsync_WhenNotFoundException_InDevelopment_IncludesStackTrace()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Development");

        RequestDelegate next = context => throw new NotFoundException("Not found");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ErrorResponse>(context);
        response.Details.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task InvokeAsync_WhenNotFoundException_InProduction_ExcludesStackTrace()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new NotFoundException("Not found");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ErrorResponse>(context);
        response.Details.Should().BeNull();
    }

    #endregion

    #region UnauthorizedException Tests

    [Fact]
    public async Task InvokeAsync_WhenUnauthorizedException_Returns401()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new UnauthorizedException("Not authorized");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task InvokeAsync_WhenUnauthorizedException_ReturnsCorrectMessage()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new UnauthorizedException("Access denied");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ErrorResponse>(context);
        response.Message.Should().Be("Access denied");
        response.StatusCode.Should().Be(401);
    }

    #endregion

    #region ValidationException Tests

    [Fact]
    public async Task InvokeAsync_WhenValidationException_Returns400()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new SecondBrain.Application.Exceptions.ValidationException("field", "Invalid value");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task InvokeAsync_WhenValidationException_IncludesValidationErrors()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new SecondBrain.Application.Exceptions.ValidationException("email", "Invalid email format");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ErrorResponse>(context);
        response.StatusCode.Should().Be(400);
        response.ValidationErrors.Should().NotBeNull();
    }

    #endregion

    #region Generic Exception Tests

    [Fact]
    public async Task InvokeAsync_WhenGenericException_Returns500()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new Exception("Internal error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task InvokeAsync_WhenGenericException_InProduction_HidesMessage()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new Exception("Sensitive internal error details");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ErrorResponse>(context);
        response.Message.Should().Be("An internal server error occurred.");
        response.Message.Should().NotContain("Sensitive");
    }

    [Fact]
    public async Task InvokeAsync_WhenGenericException_InDevelopment_ShowsMessage()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Development");

        RequestDelegate next = context => throw new Exception("Detailed error message");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ErrorResponse>(context);
        response.Message.Should().Be("Detailed error message");
    }

    [Fact]
    public async Task InvokeAsync_WhenGenericException_InDevelopment_IncludesStackTrace()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Development");

        RequestDelegate next = context => throw new Exception("Error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ErrorResponse>(context);
        response.Details.Should().NotBeNullOrEmpty();
    }

    #endregion

    #region Response Format Tests

    [Fact]
    public async Task InvokeAsync_WhenException_SetsContentTypeToJson()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new Exception("Error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.ContentType.Should().Be("application/json");
    }

    [Fact]
    public async Task InvokeAsync_WhenException_IncludesTraceId()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new Exception("Error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();
        context.TraceIdentifier = "test-trace-id";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ErrorResponse>(context);
        response.TraceId.Should().Be("test-trace-id");
    }

    [Fact]
    public async Task InvokeAsync_WhenException_IncludesTimestamp()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");
        var beforeCall = DateTime.UtcNow;

        RequestDelegate next = context => throw new Exception("Error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);
        var afterCall = DateTime.UtcNow;

        // Assert
        var response = await ReadResponseBody<ErrorResponse>(context);
        response.Timestamp.Should().BeOnOrAfter(beforeCall);
        response.Timestamp.Should().BeOnOrBefore(afterCall);
    }

    #endregion

    #region Logging Tests

    [Fact]
    public async Task InvokeAsync_WhenException_LogsError()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new Exception("Test error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => true),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region Helper Methods

    private static DefaultHttpContext CreateHttpContext()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static async Task<T> ReadResponseBody<T>(HttpContext context)
    {
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var body = await reader.ReadToEndAsync();

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        return JsonSerializer.Deserialize<T>(body, options)!;
    }

    #endregion
}

