using System.Collections.Concurrent;
using System.Net;

namespace SecondBrain.API.Middleware;

/// <summary>
/// Middleware to implement rate limiting based on IP address.
/// 
/// WARNING: This implementation uses in-memory storage which is NOT suitable for
/// multi-instance/load-balanced deployments. In production with multiple instances,
/// consider using a distributed cache like Redis for rate limit tracking.
/// 
/// Example Redis implementation approach:
/// - Use StackExchange.Redis with INCR and EXPIRE commands
/// - Use a sliding window algorithm with sorted sets
/// - Consider using AspNetCoreRateLimit package with Redis backing store
/// </summary>
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;

    // Store request counts per IP with timestamps
    // NOTE: This static dictionary only works for single-instance deployments.
    // For multi-instance deployments, replace with IDistributedCache or Redis.
    private static readonly ConcurrentDictionary<string, RequestCounter> _requestCounts = new();

    // Configuration - consider moving to appsettings.json for production
    private const int MaxRequestsPerMinute = 60;
    private const int MaxRequestsPer15Minutes = 300;

    // Development mode has much higher limits for stress testing
    private const int DevMaxRequestsPerMinute = 1000;
    private const int DevMaxRequestsPer15Minutes = 5000;

    private const int CleanupIntervalMinutes = 5;

    // Localhost/loopback addresses to skip rate limiting in development/testing
    private static readonly HashSet<string> LocalhostAddresses = new(StringComparer.OrdinalIgnoreCase)
    {
        "127.0.0.1",
        "::1",
        "localhost",
        "unknown",  // Used in integration tests where RemoteIpAddress is null
        "::ffff:127.0.0.1",  // IPv4-mapped IPv6 format
        "0.0.0.0"  // Bind-all address
    };

    private static DateTime _lastCleanup = DateTime.UtcNow;

    public RateLimitingMiddleware(RequestDelegate next, ILogger<RateLimitingMiddleware> logger, IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var ipAddress = GetClientIpAddress(context);

        // Skip rate limiting for health checks
        if (context.Request.Path.StartsWithSegments("/api/health"))
        {
            await _next(context);
            return;
        }

        // Skip rate limiting in Testing environment entirely (integration tests)
        if (_environment.EnvironmentName == "Testing")
        {
            _logger.LogDebug("Rate limiting skipped for Testing environment");
            await _next(context);
            return;
        }

        // Skip rate limiting for localhost in ALL environments
        // (localhost traffic is trusted - enables local stress testing)
        if (IsLocalhostAddress(ipAddress))
        {
            await _next(context);
            return;
        }

        // Periodic cleanup of old entries
        if (DateTime.UtcNow - _lastCleanup > TimeSpan.FromMinutes(CleanupIntervalMinutes))
        {
            CleanupOldEntries();
            _lastCleanup = DateTime.UtcNow;
        }

        var counter = _requestCounts.GetOrAdd(ipAddress, _ => new RequestCounter());

        // Use higher limits in development mode for stress testing
        var limitPerMinute = _environment.IsDevelopment() ? DevMaxRequestsPerMinute : MaxRequestsPerMinute;
        var limitPer15Minutes = _environment.IsDevelopment() ? DevMaxRequestsPer15Minutes : MaxRequestsPer15Minutes;

        if (!counter.IsAllowed(limitPerMinute, limitPer15Minutes))
        {
            _logger.LogWarning("Rate limit exceeded for IP {IpAddress} on path {Path}", ipAddress, context.Request.Path);

            context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
            context.Response.Headers.Append("Retry-After", "60");

            await context.Response.WriteAsJsonAsync(new
            {
                error = "Rate limit exceeded",
                message = "Too many requests. Please try again later.",
                retryAfter = 60
            });

            return;
        }

        counter.RecordRequest();

        // Add rate limit headers
        context.Response.Headers.Append("X-RateLimit-Limit-Minute", limitPerMinute.ToString());
        context.Response.Headers.Append("X-RateLimit-Limit-15Minutes", limitPer15Minutes.ToString());
        context.Response.Headers.Append("X-RateLimit-Remaining-Minute",
            counter.GetRemainingRequests(limitPerMinute, TimeSpan.FromMinutes(1)).ToString());

        await _next(context);
    }

    private static string GetClientIpAddress(HttpContext context)
    {
        // Check for forwarded IP (from reverse proxy)
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static bool IsLocalhostAddress(string ipAddress)
    {
        // Quick check against known localhost strings
        if (LocalhostAddresses.Contains(ipAddress))
            return true;

        // Parse and check if it's a loopback address (handles all formats)
        if (IPAddress.TryParse(ipAddress, out var parsedIp))
        {
            // Check if it's a loopback address
            if (IPAddress.IsLoopback(parsedIp))
                return true;

            // Handle IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
            if (parsedIp.IsIPv4MappedToIPv6)
            {
                var ipv4 = parsedIp.MapToIPv4();
                return IPAddress.IsLoopback(ipv4);
            }
        }

        return false;
    }

    private static void CleanupOldEntries()
    {
        var cutoffTime = DateTime.UtcNow.AddMinutes(-15);
        var keysToRemove = _requestCounts
            .Where(kvp => kvp.Value.LastRequest < cutoffTime && kvp.Value.RequestCount == 0)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in keysToRemove)
        {
            _requestCounts.TryRemove(key, out _);
        }
    }

    private class RequestCounter
    {
        private readonly List<DateTime> _requests = new();
        private readonly object _lock = new();

        public DateTime LastRequest { get; private set; } = DateTime.UtcNow;
        public int RequestCount => _requests.Count;

        public void RecordRequest()
        {
            lock (_lock)
            {
                _requests.Add(DateTime.UtcNow);
                LastRequest = DateTime.UtcNow;

                // Clean up old requests
                var cutoffTime = DateTime.UtcNow.AddMinutes(-15);
                _requests.RemoveAll(r => r < cutoffTime);
            }
        }

        public bool IsAllowed(int maxPerMinute, int maxPer15Minutes)
        {
            lock (_lock)
            {
                var now = DateTime.UtcNow;
                var oneMinuteAgo = now.AddMinutes(-1);
                var fifteenMinutesAgo = now.AddMinutes(-15);

                // Clean up old requests
                _requests.RemoveAll(r => r < fifteenMinutesAgo);

                var requestsInLastMinute = _requests.Count(r => r > oneMinuteAgo);
                var requestsInLast15Minutes = _requests.Count;

                return requestsInLastMinute < maxPerMinute && requestsInLast15Minutes < maxPer15Minutes;
            }
        }

        public int GetRemainingRequests(int maxRequests, TimeSpan timeWindow)
        {
            lock (_lock)
            {
                var cutoffTime = DateTime.UtcNow - timeWindow;
                var recentRequests = _requests.Count(r => r > cutoffTime);
                return Math.Max(0, maxRequests - recentRequests);
            }
        }
    }
}

/// <summary>
/// Extension method to register RateLimitingMiddleware
/// </summary>
public static class RateLimitingMiddlewareExtensions
{
    public static IApplicationBuilder UseRateLimiting(this IApplicationBuilder app)
    {
        return app.UseMiddleware<RateLimitingMiddleware>();
    }
}

