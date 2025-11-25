using System.Diagnostics;

namespace SecondBrain.API.Middleware;

/// <summary>
/// Middleware for logging HTTP requests and responses
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip logging for health checks and static files
        if (context.Request.Path.StartsWithSegments("/api/health") ||
            context.Request.Path.StartsWithSegments("/swagger"))
        {
            await _next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();
        var requestPath = context.Request.Path;
        var requestMethod = context.Request.Method;
        var userId = context.Items["UserId"]?.ToString() ?? "anonymous";

        _logger.LogInformation("HTTP Request started. Method: {Method}, Path: {Path}, UserId: {UserId}, TraceId: {TraceId}",
            requestMethod, requestPath.Value, userId, context.TraceIdentifier);

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            var statusCode = context.Response.StatusCode;
            var duration = stopwatch.ElapsedMilliseconds;

            if (statusCode >= 400)
            {
                _logger.LogWarning("HTTP Request completed with error. Method: {Method}, Path: {Path}, StatusCode: {StatusCode}, Duration: {Duration}ms, UserId: {UserId}, TraceId: {TraceId}",
                    requestMethod, requestPath.Value, statusCode, duration, userId, context.TraceIdentifier);
            }
            else
            {
                _logger.LogInformation("HTTP Request completed. Method: {Method}, Path: {Path}, StatusCode: {StatusCode}, Duration: {Duration}ms, UserId: {UserId}, TraceId: {TraceId}",
                    requestMethod, requestPath.Value, statusCode, duration, userId, context.TraceIdentifier);
            }
        }
    }
}

