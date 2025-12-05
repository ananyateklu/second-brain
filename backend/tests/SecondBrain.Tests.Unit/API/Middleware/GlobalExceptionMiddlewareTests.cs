using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Middleware;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services.AI.CircuitBreaker;

namespace SecondBrain.Tests.Unit.API.Middleware;

public class GlobalExceptionMiddlewareTests
{
    private readonly Mock<ILogger<GlobalExceptionMiddleware>> _mockLogger;
    private readonly Mock<IHostEnvironment> _mockEnvironment;
    private readonly Mock<IProblemDetailsService> _mockProblemDetailsService;

    public GlobalExceptionMiddlewareTests()
    {
        _mockLogger = new Mock<ILogger<GlobalExceptionMiddleware>>();
        _mockEnvironment = new Mock<IHostEnvironment>();
        _mockProblemDetailsService = new Mock<IProblemDetailsService>();
        // Setup to always return false so the middleware falls back to manual JSON response
        _mockProblemDetailsService.Setup(s => s.TryWriteAsync(It.IsAny<ProblemDetailsContext>()))
            .ReturnsAsync(false);
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

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
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

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
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

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
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

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Detail.Should().Be("User not found");
        response.Status.Should().Be(404);
    }

    [Fact]
    public async Task InvokeAsync_WhenNotFoundException_InDevelopment_IncludesStackTrace()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Development");

        RequestDelegate next = context => throw new NotFoundException("Not found");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Extensions.Should().ContainKey("stackTrace");
        response.Extensions["stackTrace"]!.ToString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task InvokeAsync_WhenNotFoundException_InProduction_ExcludesStackTrace()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new NotFoundException("Not found");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Extensions.Should().NotContainKey("stackTrace");
    }

    #endregion

    #region UnauthorizedException Tests

    [Fact]
    public async Task InvokeAsync_WhenUnauthorizedException_Returns401()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new UnauthorizedException("Not authorized");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
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

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Detail.Should().Be("Access denied");
        response.Status.Should().Be(401);
    }

    #endregion

    #region ValidationException Tests

    [Fact]
    public async Task InvokeAsync_WhenValidationException_Returns400()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new SecondBrain.Application.Exceptions.ValidationException("field", "Invalid value");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
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

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ValidationProblemDetails>(context);
        response.Status.Should().Be(400);
        response.Errors.Should().NotBeNull();
        response.Errors.Should().ContainKey("email");
    }

    #endregion

    #region CircuitBreakerOpenException Tests

    [Fact]
    public async Task InvokeAsync_WhenCircuitBreakerOpenException_Returns503()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new CircuitBreakerOpenException("OpenAI");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task InvokeAsync_WhenCircuitBreakerOpenException_ReturnsCorrectMessage()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new CircuitBreakerOpenException("Anthropic");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Detail.Should().Contain("Anthropic");
        response.Detail.Should().Contain("Circuit breaker");
        response.Status.Should().Be(503);
    }

    [Fact]
    public async Task InvokeAsync_WhenCircuitBreakerOpenException_WithRetryAfter_SetsRetryAfterHeader()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");
        var retryAfter = TimeSpan.FromSeconds(60);

        RequestDelegate next = context => throw new CircuitBreakerOpenException("OpenAI", retryAfter);

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Headers.RetryAfter.ToString().Should().Be("60");
    }

    [Fact]
    public async Task InvokeAsync_WhenCircuitBreakerOpenException_WithoutRetryAfter_DoesNotSetRetryAfterHeader()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new CircuitBreakerOpenException("Gemini");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Headers.RetryAfter.ToString().Should().BeEmpty();
    }

    [Fact]
    public async Task InvokeAsync_WhenCircuitBreakerOpenException_InDevelopment_IncludesStackTrace()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Development");

        RequestDelegate next = context => throw new CircuitBreakerOpenException("OpenAI", TimeSpan.FromSeconds(30));

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Extensions.Should().ContainKey("stackTrace");
        response.Extensions["stackTrace"]!.ToString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task InvokeAsync_WhenCircuitBreakerOpenException_InProduction_ExcludesStackTrace()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new CircuitBreakerOpenException("OpenAI");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Extensions.Should().NotContainKey("stackTrace");
    }

    #endregion

    #region Generic Exception Tests

    [Fact]
    public async Task InvokeAsync_WhenGenericException_Returns500()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new Exception("Internal error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
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

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Detail.Should().NotContain("Sensitive");
        response.Detail.Should().Contain("unexpected error");
    }

    [Fact]
    public async Task InvokeAsync_WhenGenericException_InDevelopment_ShowsMessage()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Development");

        RequestDelegate next = context => throw new Exception("Detailed error message");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Detail.Should().Be("Detailed error message");
    }

    [Fact]
    public async Task InvokeAsync_WhenGenericException_InDevelopment_IncludesStackTrace()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Development");

        RequestDelegate next = context => throw new Exception("Error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Extensions.Should().ContainKey("stackTrace");
        response.Extensions["stackTrace"]!.ToString().Should().NotBeNullOrEmpty();
    }

    #endregion

    #region Response Format Tests

    [Fact]
    public async Task InvokeAsync_WhenException_SetsContentTypeToProblemJson()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new Exception("Error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.ContentType.Should().Contain("application/problem+json");
    }

    [Fact]
    public async Task InvokeAsync_WhenException_IncludesTraceId()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new Exception("Error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();
        context.TraceIdentifier = "test-trace-id";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Extensions.Should().ContainKey("traceId");
        response.Extensions["traceId"]!.ToString().Should().Be("test-trace-id");
    }

    [Fact]
    public async Task InvokeAsync_WhenException_IncludesTimestamp()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");
        var beforeCall = DateTime.UtcNow;

        RequestDelegate next = context => throw new Exception("Error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var response = await ReadResponseBody<ProblemDetails>(context);
        response.Extensions.Should().ContainKey("timestamp");
    }

    #endregion

    #region Logging Tests

    [Fact]
    public async Task InvokeAsync_WhenException_LogsError()
    {
        // Arrange
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Production");

        RequestDelegate next = context => throw new Exception("Test error");

        var middleware = new GlobalExceptionMiddleware(next, _mockLogger.Object, _mockEnvironment.Object, _mockProblemDetailsService.Object);
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
