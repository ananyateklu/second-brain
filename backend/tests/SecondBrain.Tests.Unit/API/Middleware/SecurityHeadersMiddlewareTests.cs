using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SecondBrain.API.Middleware;

namespace SecondBrain.Tests.Unit.API.Middleware;

public class SecurityHeadersMiddlewareTests
{
    private readonly Mock<ILogger<SecurityHeadersMiddleware>> _mockLogger;
    private bool _nextCalled;

    public SecurityHeadersMiddlewareTests()
    {
        _mockLogger = new Mock<ILogger<SecurityHeadersMiddleware>>();
    }

    private async Task NextDelegate(HttpContext context)
    {
        _nextCalled = true;
        await Task.CompletedTask;
    }

    private SecurityHeadersMiddleware CreateMiddleware()
    {
        _nextCalled = false;
        return new SecurityHeadersMiddleware(NextDelegate, _mockLogger.Object);
    }

    #region X-Content-Type-Options Tests

    [Fact]
    public async Task InvokeAsync_AddsXContentTypeOptionsHeader()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Headers["X-Content-Type-Options"].ToString().Should().Be("nosniff");
    }

    #endregion

    #region X-Frame-Options Tests

    [Fact]
    public async Task InvokeAsync_AddsXFrameOptionsHeader()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Headers["X-Frame-Options"].ToString().Should().Be("DENY");
    }

    #endregion

    #region X-XSS-Protection Tests

    [Fact]
    public async Task InvokeAsync_AddsXXssProtectionHeader()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Headers["X-XSS-Protection"].ToString().Should().Be("1; mode=block");
    }

    #endregion

    #region Referrer-Policy Tests

    [Fact]
    public async Task InvokeAsync_AddsReferrerPolicyHeader()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Headers["Referrer-Policy"].ToString().Should().Be("strict-origin-when-cross-origin");
    }

    #endregion

    #region Permissions-Policy Tests

    [Fact]
    public async Task InvokeAsync_AddsPermissionsPolicyHeader()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var permissionsPolicy = context.Response.Headers["Permissions-Policy"].ToString();
        permissionsPolicy.Should().Contain("geolocation=()");
        permissionsPolicy.Should().Contain("microphone=()");
        permissionsPolicy.Should().Contain("camera=()");
        permissionsPolicy.Should().Contain("payment=()");
        permissionsPolicy.Should().Contain("usb=()");
    }

    #endregion

    #region Content-Security-Policy Tests

    [Fact]
    public async Task InvokeAsync_AddsContentSecurityPolicyHeader()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var csp = context.Response.Headers["Content-Security-Policy"].ToString();
        csp.Should().Contain("default-src 'self'");
        csp.Should().Contain("frame-ancestors 'none'");
    }

    [Fact]
    public async Task InvokeAsync_CspAllowsScalarUi()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var csp = context.Response.Headers["Content-Security-Policy"].ToString();
        csp.Should().Contain("cdn.jsdelivr.net");
    }

    [Fact]
    public async Task InvokeAsync_CspAllowsGoogleFonts()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        var csp = context.Response.Headers["Content-Security-Policy"].ToString();
        csp.Should().Contain("fonts.googleapis.com");
        csp.Should().Contain("fonts.gstatic.com");
    }

    #endregion

    #region Header Removal Tests

    [Fact]
    public async Task InvokeAsync_RemovesXPoweredByHeader()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext();
        context.Response.Headers["X-Powered-By"] = "ASP.NET";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Headers.ContainsKey("X-Powered-By").Should().BeFalse();
    }

    [Fact]
    public async Task InvokeAsync_RemovesServerHeader()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext();
        context.Response.Headers["Server"] = "Kestrel";

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.Headers.ContainsKey("Server").Should().BeFalse();
    }

    #endregion

    #region Next Delegate Tests

    [Fact]
    public async Task InvokeAsync_CallsNextDelegate()
    {
        // Arrange
        var middleware = CreateMiddleware();
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        _nextCalled.Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_HeadersSetBeforeNextCalled()
    {
        // Arrange
        bool headersSetBeforeNext = false;
        var middleware = new SecurityHeadersMiddleware(
            ctx =>
            {
                headersSetBeforeNext = ctx.Response.Headers.ContainsKey("X-Content-Type-Options");
                return Task.CompletedTask;
            },
            _mockLogger.Object);
        var context = CreateHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        headersSetBeforeNext.Should().BeTrue();
    }

    #endregion

    #region Multiple Requests Tests

    [Fact]
    public async Task InvokeAsync_WorksForMultipleRequests()
    {
        // Arrange
        var middleware = CreateMiddleware();

        for (int i = 0; i < 5; i++)
        {
            _nextCalled = false;
            var context = CreateHttpContext();

            // Act
            await middleware.InvokeAsync(context);

            // Assert
            _nextCalled.Should().BeTrue();
            context.Response.Headers["X-Content-Type-Options"].ToString().Should().Be("nosniff");
        }
    }

    #endregion

    #region Extension Method Tests

    [Fact]
    public void UseSecurityHeaders_ReturnsApplicationBuilder()
    {
        // Arrange
        var mockApplicationBuilder = new Mock<Microsoft.AspNetCore.Builder.IApplicationBuilder>();
        mockApplicationBuilder
            .Setup(x => x.Use(It.IsAny<Func<RequestDelegate, RequestDelegate>>()))
            .Returns(mockApplicationBuilder.Object);

        // Act
        var result = SecurityHeadersMiddlewareExtensions.UseSecurityHeaders(mockApplicationBuilder.Object);

        // Assert
        result.Should().Be(mockApplicationBuilder.Object);
    }

    #endregion

    #region Helper Methods

    private static DefaultHttpContext CreateHttpContext()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        return context;
    }

    #endregion
}

