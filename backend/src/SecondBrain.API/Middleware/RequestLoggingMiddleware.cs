using System.Buffers;
using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Microsoft.IO;
using SecondBrain.API.Logging;

namespace SecondBrain.API.Middleware;

/// <summary>
/// Configuration options for request/response logging middleware.
/// </summary>
public class RequestLoggingOptions
{
    public const string SectionName = "RequestLogging";

    /// <summary>
    /// Enable request body logging. Default: false (for performance).
    /// </summary>
    public bool EnableRequestBodyLogging { get; set; } = false;

    /// <summary>
    /// Enable response body logging. Default: false (for performance).
    /// </summary>
    public bool EnableResponseBodyLogging { get; set; } = false;

    /// <summary>
    /// Maximum body size to log in bytes. Default: 4096 bytes.
    /// </summary>
    public int MaxBodySize { get; set; } = 4096;

    /// <summary>
    /// Slow request threshold in milliseconds. Requests exceeding this are logged as warnings.
    /// </summary>
    public int SlowRequestThresholdMs { get; set; } = 1000;

    /// <summary>
    /// Paths to exclude from logging (e.g., health checks).
    /// </summary>
    public string[] ExcludePaths { get; set; } = ["/api/health", "/swagger", "/scalar", "/openapi"];

    /// <summary>
    /// Patterns to redact from logged bodies (case-insensitive regex).
    /// </summary>
    public string[] RedactPatterns { get; set; } =
    [
        @"""password""\s*:\s*""[^""]*""",
        @"""apikey""\s*:\s*""[^""]*""",
        @"""api_key""\s*:\s*""[^""]*""",
        @"""token""\s*:\s*""[^""]*""",
        @"""secret""\s*:\s*""[^""]*""",
        @"""authorization""\s*:\s*""[^""]*""",
        @"""credit_card""\s*:\s*""[^""]*""",
        @"""ssn""\s*:\s*""[^""]*"""
    ];

    /// <summary>
    /// Content types that should have their bodies logged (if body logging enabled).
    /// </summary>
    public string[] LoggableContentTypes { get; set; } =
    [
        "application/json",
        "application/xml",
        "text/plain",
        "text/xml",
        "application/x-www-form-urlencoded"
    ];
}

/// <summary>
/// Enhanced middleware for logging HTTP requests and responses with:
/// - High-performance source-generated logging
/// - Request/response body capture with size limits
/// - PII redaction for sensitive data
/// - Slow request detection
/// - Configurable exclusion paths
/// </summary>
public partial class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;
    private readonly RequestLoggingOptions _options;
    private readonly RecyclableMemoryStreamManager _streamManager;
    private readonly Regex[] _redactRegexes;

    public RequestLoggingMiddleware(
        RequestDelegate next,
        ILogger<RequestLoggingMiddleware> logger,
        IOptions<RequestLoggingOptions> options)
    {
        _next = next;
        _logger = logger;
        _options = options.Value;
        _streamManager = new RecyclableMemoryStreamManager();

        // Pre-compile redaction regexes for performance
        _redactRegexes = _options.RedactPatterns
            .Select(p => new Regex(p, RegexOptions.IgnoreCase | RegexOptions.Compiled))
            .ToArray();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip logging for excluded paths
        foreach (var excludePath in _options.ExcludePaths)
        {
            if (context.Request.Path.StartsWithSegments(excludePath))
            {
                await _next(context);
                return;
            }
        }

        var stopwatch = Stopwatch.StartNew();
        var requestPath = context.Request.Path.Value;
        var requestMethod = context.Request.Method;
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

        // UserId may not be available yet (set by auth middleware)
        // We'll capture it after the request is processed
        string? requestBody = null;

        // Capture request body if enabled
        if (_options.EnableRequestBodyLogging && ShouldLogBody(context.Request.ContentType))
        {
            requestBody = await CaptureRequestBodyAsync(context.Request);
        }

        // Log request started using high-performance logging
        var userId = GetUserId(context);
        _logger.HttpRequestStarted(requestMethod, requestPath, userId, traceId);

        // Wrap response body stream if response logging is enabled
        Stream? originalResponseBody = null;
        MemoryStream? responseBodyStream = null;

        if (_options.EnableResponseBodyLogging)
        {
            originalResponseBody = context.Response.Body;
            responseBodyStream = _streamManager.GetStream();
            context.Response.Body = responseBodyStream;
        }

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            // Re-capture userId after auth middleware has run
            userId = GetUserId(context);

            var statusCode = context.Response.StatusCode;
            var durationMs = stopwatch.ElapsedMilliseconds;

            // Capture response body if enabled
            string? responseBody = null;
            if (responseBodyStream != null && originalResponseBody != null)
            {
                responseBody = await CaptureResponseBodyAsync(responseBodyStream, originalResponseBody, context.Response.ContentType);
            }

            // Log based on status code
            if (statusCode >= 400)
            {
                _logger.HttpRequestCompletedWithError(requestMethod, requestPath, statusCode, durationMs, userId, traceId);

                // Log bodies for error responses (helpful for debugging)
                if (!string.IsNullOrEmpty(requestBody))
                {
                    LogRequestBody(requestBody, requestMethod, requestPath);
                }
                if (!string.IsNullOrEmpty(responseBody))
                {
                    LogResponseBody(responseBody, statusCode, requestPath);
                }
            }
            else
            {
                _logger.HttpRequestCompleted(requestMethod, requestPath, statusCode, durationMs, userId, traceId);
            }

            // Detect and log slow requests
            if (durationMs > _options.SlowRequestThresholdMs)
            {
                _logger.SlowRequestDetected(requestMethod, requestPath, durationMs, _options.SlowRequestThresholdMs, userId);
            }

            // Cleanup response body stream
            if (responseBodyStream != null)
            {
                await responseBodyStream.DisposeAsync();
            }
        }
    }

    private static string GetUserId(HttpContext context)
    {
        return context.Items.TryGetValue("UserId", out var uid) ? uid?.ToString() ?? "anonymous" : "anonymous";
    }

    private bool ShouldLogBody(string? contentType)
    {
        if (string.IsNullOrEmpty(contentType))
            return false;

        return _options.LoggableContentTypes.Any(ct =>
            contentType.StartsWith(ct, StringComparison.OrdinalIgnoreCase));
    }

    private async Task<string?> CaptureRequestBodyAsync(HttpRequest request)
    {
        if (!request.Body.CanSeek)
        {
            request.EnableBuffering();
        }

        request.Body.Position = 0;

        using var reader = new StreamReader(
            request.Body,
            Encoding.UTF8,
            detectEncodingFromByteOrderMarks: false,
            bufferSize: 1024,
            leaveOpen: true);

        var body = await reader.ReadToEndAsync();
        request.Body.Position = 0;

        if (string.IsNullOrEmpty(body))
            return null;

        // Truncate if too large
        if (body.Length > _options.MaxBodySize)
        {
            body = body[.._options.MaxBodySize] + "... [TRUNCATED]";
        }

        // Redact sensitive data
        return RedactSensitiveData(body);
    }

    private async Task<string?> CaptureResponseBodyAsync(MemoryStream responseBodyStream, Stream originalBody, string? contentType)
    {
        if (!ShouldLogBody(contentType))
        {
            // Still need to copy to original stream
            responseBodyStream.Position = 0;
            await responseBodyStream.CopyToAsync(originalBody);
            return null;
        }

        responseBodyStream.Position = 0;
        using var reader = new StreamReader(responseBodyStream, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();

        // Copy to original response stream
        responseBodyStream.Position = 0;
        await responseBodyStream.CopyToAsync(originalBody);

        if (string.IsNullOrEmpty(body))
            return null;

        // Truncate if too large
        if (body.Length > _options.MaxBodySize)
        {
            body = body[.._options.MaxBodySize] + "... [TRUNCATED]";
        }

        return RedactSensitiveData(body);
    }

    private string RedactSensitiveData(string content)
    {
        foreach (var regex in _redactRegexes)
        {
            content = regex.Replace(content, match =>
            {
                // Extract the key name and redact the value
                var colonIndex = match.Value.IndexOf(':');
                if (colonIndex > 0)
                {
                    var key = match.Value[..colonIndex];
                    return $"{key}: \"[REDACTED]\"";
                }
                return "[REDACTED]";
            });
        }
        return content;
    }

    [LoggerMessage(
        EventId = 1010,
        Level = LogLevel.Debug,
        Message = "Request body. Method: {Method}, Path: {Path}, Body: {Body}")]
    private partial void LogRequestBody(string body, string method, string? path);

    [LoggerMessage(
        EventId = 1011,
        Level = LogLevel.Debug,
        Message = "Response body. StatusCode: {StatusCode}, Path: {Path}, Body: {Body}")]
    private partial void LogResponseBody(string body, int statusCode, string? path);
}
