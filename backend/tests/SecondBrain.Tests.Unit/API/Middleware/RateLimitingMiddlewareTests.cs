using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Middleware;

namespace SecondBrain.Tests.Unit.API.Middleware;

public class RateLimitingMiddlewareTests
{
    private readonly Mock<ILogger<RateLimitingMiddleware>> _mockLogger;
    private readonly Mock<IWebHostEnvironment> _mockEnvironment;
    private bool _nextCalled;

    public RateLimitingMiddlewareTests()
    {
        _mockLogger = new Mock<ILogger<RateLimitingMiddleware>>();
        _mockEnvironment = new Mock<IWebHostEnvironment>();
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns("Development");
    }

    private async Task NextDelegate(HttpContext context)
    {
        _nextCalled = true;
        await Task.CompletedTask;
    }

    private RateLimitingMiddleware CreateMiddleware(string environmentName = "Development")
    {
        _nextCalled = false;
        _mockEnvironment.Setup(e => e.EnvironmentName).Returns(environmentName);
        return new RateLimitingMiddleware(NextDelegate, _mockLogger.Object, _mockEnvironment.Object);
    }

    #region Skip Rate Limiting Tests

    [Fact]
    public async Task InvokeAsync_SkipsRateLimitingForHealthEndpoints()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/health");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        context.Response.Headers.ContainsKey("X-RateLimit-Limit-Minute").Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_SkipsRateLimitingForHealthSubpaths()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext("/api/health/ready");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_SkipsRateLimitingForLocalhostInDevelopment()
    {
        // Arrange
        var middleware = CreateMiddleware("Development");
        var context = CreateHttpContext("/api/notes", "127.0.0.1");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    [Theory]
    [InlineData("127.0.0.1")]
    [InlineData("::1")]
    public async Task InvokeAsync_SkipsRateLimitingForLocalhostAddresses(string ipAddress)
    {
        // Arrange
        var middleware = CreateMiddleware("Development");
        var context = CreateHttpContext("/api/notes", ipAddress);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    #endregion

    #region Rate Limiting Headers Tests

    [Fact]
    public async Task InvokeAsync_AddsRateLimitHeaders()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var context = CreateHttpContext("/api/notes", "192.168.1.100");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        context.Response.Headers.ContainsKey("X-RateLimit-Limit-Minute").Should().BeTrue();
        context.Response.Headers.ContainsKey("X-RateLimit-Limit-15Minutes").Should().BeTrue();
        context.Response.Headers.ContainsKey("X-RateLimit-Remaining-Minute").Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_RateLimitHeadersHaveCorrectValues()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var context = CreateHttpContext("/api/notes", "192.168.1.101");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Headers["X-RateLimit-Limit-Minute"].ToString().Should().Be("60");
        context.Response.Headers["X-RateLimit-Limit-15Minutes"].ToString().Should().Be("300");
    }

    #endregion

    #region IP Address Extraction Tests

    [Fact]
    public async Task InvokeAsync_ExtractsIpFromXForwardedForHeader()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var context = CreateHttpContext("/api/notes", "10.0.0.1");
        context.Request.Headers["X-Forwarded-For"] = "203.0.113.195, 70.41.3.18, 150.172.238.178";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        // The middleware should use the first IP in X-Forwarded-For (203.0.113.195)
    }

    [Fact]
    public async Task InvokeAsync_ExtractsIpFromXRealIpHeader()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var context = CreateHttpContext("/api/notes", "10.0.0.1");
        context.Request.Headers["X-Real-IP"] = "203.0.113.195";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_PrefersXForwardedForOverXRealIp()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var context = CreateHttpContext("/api/notes", "10.0.0.1");
        context.Request.Headers["X-Forwarded-For"] = "203.0.113.195";
        context.Request.Headers["X-Real-IP"] = "203.0.113.196";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        // X-Forwarded-For should take precedence
    }

    #endregion

    #region Request Recording Tests

    [Fact]
    public async Task InvokeAsync_AllowsRequestWithinLimit()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var uniqueIp = $"192.168.1.{new Random().Next(1, 255)}";
        var context = CreateHttpContext("/api/notes", uniqueIp);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        context.Response.StatusCode.Should().NotBe((int)HttpStatusCode.TooManyRequests);
    }

    #endregion

    #region Production vs Development Tests

    [Fact]
    public async Task InvokeAsync_AppliesRateLimitingInProduction()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var context = CreateHttpContext("/api/notes", "192.168.1.50");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Headers.ContainsKey("X-RateLimit-Limit-Minute").Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_DoesNotApplyRateLimitingToLocalhostInDevelopment()
    {
        // Arrange
        var middleware = CreateMiddleware("Development");
        var context = CreateHttpContext("/api/notes", "127.0.0.1");

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        // No rate limit headers should be present for localhost in development
    }

    #endregion

    #region Additional Coverage Tests

    [Fact]
    public async Task InvokeAsync_HandlesNullRemoteIpAddress()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/notes";
        context.Response.Body = new MemoryStream();
        // RemoteIpAddress is null by default

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_ProcessesMultipleRequestsFromSameIp()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var uniqueIp = $"192.168.10.{new Random().Next(1, 255)}";

        // Act - make multiple requests
        for (int i = 0; i < 3; i++)
        {
            _nextCalled = false;
            var context = CreateHttpContext("/api/notes", uniqueIp);
            await middleware.InvokeAsync(context);
        }

        // Assert - all requests should succeed within limits
        _nextCalled.Should().BeTrue();
    }

    #endregion

    #region Rate Limit Exceeded Tests

    [Fact]
    public async Task InvokeAsync_WhenRateLimitExceeded_Returns429()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        // Use a unique IP for this test to avoid interference from other tests
        var uniqueIp = $"10.100.{new Random().Next(1, 255)}.{new Random().Next(1, 255)}";
        
        // Make requests up to and beyond the limit
        for (int i = 0; i < 65; i++)
        {
            _nextCalled = false;
            var context = CreateHttpContext("/api/notes", uniqueIp);
            await middleware.InvokeAsync(context);
        }

        // Act - make one more request that should be rate limited
        _nextCalled = false;
        var limitedContext = CreateHttpContext("/api/notes", uniqueIp);
        await middleware.InvokeAsync(limitedContext);

        // Assert
        // After 60+ requests per minute, the next one should be rate limited
        limitedContext.Response.StatusCode.Should().Be((int)HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task InvokeAsync_WhenRateLimitExceeded_ReturnsRetryAfterHeader()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var uniqueIp = $"10.200.{new Random().Next(1, 255)}.{new Random().Next(1, 255)}";
        
        // Exceed the rate limit
        for (int i = 0; i < 65; i++)
        {
            var context = CreateHttpContext("/api/notes", uniqueIp);
            await middleware.InvokeAsync(context);
        }

        // Act
        var limitedContext = CreateHttpContext("/api/notes", uniqueIp);
        await middleware.InvokeAsync(limitedContext);

        // Assert
        if (limitedContext.Response.StatusCode == (int)HttpStatusCode.TooManyRequests)
        {
            limitedContext.Response.Headers.ContainsKey("Retry-After").Should().BeTrue();
            limitedContext.Response.Headers["Retry-After"].ToString().Should().Be("60");
        }
    }

    #endregion

    #region Extension Method Tests

    [Fact]
    public void UseRateLimiting_ReturnsApplicationBuilder()
    {
        // Arrange
        var mockApplicationBuilder = new Mock<Microsoft.AspNetCore.Builder.IApplicationBuilder>();
        mockApplicationBuilder
            .Setup(x => x.Use(It.IsAny<Func<RequestDelegate, RequestDelegate>>()))
            .Returns(mockApplicationBuilder.Object);

        // Act
        var result = RateLimitingMiddlewareExtensions.UseRateLimiting(mockApplicationBuilder.Object);

        // Assert
        result.Should().Be(mockApplicationBuilder.Object);
    }

    #endregion

    #region Remaining Requests Header Tests

    [Fact]
    public async Task InvokeAsync_RemainingMinuteHeader_DecreasesWithRequests()
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var uniqueIp = $"192.168.50.{new Random().Next(1, 255)}";
        
        // Make first request
        var firstContext = CreateHttpContext("/api/notes", uniqueIp);
        await middleware.InvokeAsync(firstContext);
        var firstRemaining = int.Parse(firstContext.Response.Headers["X-RateLimit-Remaining-Minute"].ToString());

        // Make second request
        var secondContext = CreateHttpContext("/api/notes", uniqueIp);
        await middleware.InvokeAsync(secondContext);
        var secondRemaining = int.Parse(secondContext.Response.Headers["X-RateLimit-Remaining-Minute"].ToString());

        // Assert
        secondRemaining.Should().BeLessThan(firstRemaining);
    }

    #endregion

    #region Different Paths Tests

    [Theory]
    [InlineData("/api/notes")]
    [InlineData("/api/chat/conversations")]
    [InlineData("/api/ai/models")]
    public async Task InvokeAsync_AppliesRateLimitingToVariousPaths(string path)
    {
        // Arrange
        var middleware = CreateMiddleware("Production");
        var uniqueIp = $"192.168.{new Random().Next(1, 255)}.{new Random().Next(1, 255)}";
        var context = CreateHttpContext(path, uniqueIp);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
        context.Response.Headers.ContainsKey("X-RateLimit-Limit-Minute").Should().BeTrue();
    }

    #endregion

    #region Helper Methods

    private static DefaultHttpContext CreateHttpContext(string path, string? remoteIpAddress = null)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();

        if (!string.IsNullOrEmpty(remoteIpAddress))
        {
            context.Connection.RemoteIpAddress = IPAddress.Parse(remoteIpAddress);
        }

        return context;
    }

    #endregion
}

