using Microsoft.Extensions.Logging;

namespace SecondBrain.API.Logging;

/// <summary>
/// High-performance compile-time generated logging methods for the API layer.
/// Uses LoggerMessage source generators to avoid boxing and string parsing overhead.
/// Event IDs: 1000-1999 for API layer.
/// </summary>
public static partial class ApiLogMessages
{
    #region HTTP Request Lifecycle (1000-1099)

    [LoggerMessage(
        EventId = 1001,
        Level = LogLevel.Information,
        Message = "HTTP {Method} {Path} started. UserId: {UserId}, TraceId: {TraceId}")]
    public static partial void HttpRequestStarted(
        this ILogger logger,
        string method,
        string? path,
        string userId,
        string traceId);

    [LoggerMessage(
        EventId = 1002,
        Level = LogLevel.Information,
        Message = "HTTP {Method} {Path} completed. StatusCode: {StatusCode}, Duration: {DurationMs}ms, UserId: {UserId}, TraceId: {TraceId}")]
    public static partial void HttpRequestCompleted(
        this ILogger logger,
        string method,
        string? path,
        int statusCode,
        long durationMs,
        string userId,
        string traceId);

    [LoggerMessage(
        EventId = 1003,
        Level = LogLevel.Warning,
        Message = "HTTP {Method} {Path} completed with error. StatusCode: {StatusCode}, Duration: {DurationMs}ms, UserId: {UserId}, TraceId: {TraceId}")]
    public static partial void HttpRequestCompletedWithError(
        this ILogger logger,
        string method,
        string? path,
        int statusCode,
        long durationMs,
        string userId,
        string traceId);

    [LoggerMessage(
        EventId = 1004,
        Level = LogLevel.Warning,
        Message = "Slow request detected. Method: {Method}, Path: {Path}, Duration: {DurationMs}ms, Threshold: {ThresholdMs}ms, UserId: {UserId}")]
    public static partial void SlowRequestDetected(
        this ILogger logger,
        string method,
        string? path,
        long durationMs,
        long thresholdMs,
        string userId);

    #endregion

    #region Authentication (1100-1199)

    [LoggerMessage(
        EventId = 1101,
        Level = LogLevel.Debug,
        Message = "User authenticated via JWT. UserId: {UserId}, Cached: {WasCached}")]
    public static partial void UserAuthenticatedJwt(
        this ILogger logger,
        string userId,
        bool wasCached);

    [LoggerMessage(
        EventId = 1102,
        Level = LogLevel.Debug,
        Message = "User authenticated via API Key. UserId: {UserId}, Cached: {WasCached}")]
    public static partial void UserAuthenticatedApiKey(
        this ILogger logger,
        string userId,
        bool wasCached);

    [LoggerMessage(
        EventId = 1103,
        Level = LogLevel.Warning,
        Message = "Authentication failed. Reason: {Reason}, Path: {Path}")]
    public static partial void AuthenticationFailed(
        this ILogger logger,
        string reason,
        string? path);

    [LoggerMessage(
        EventId = 1104,
        Level = LogLevel.Warning,
        Message = "Invalid JWT token. Path: {Path}, Error: {Error}")]
    public static partial void InvalidJwtToken(
        this ILogger logger,
        string? path,
        string error);

    [LoggerMessage(
        EventId = 1105,
        Level = LogLevel.Warning,
        Message = "Invalid API key. Path: {Path}")]
    public static partial void InvalidApiKey(
        this ILogger logger,
        string? path);

    [LoggerMessage(
        EventId = 1106,
        Level = LogLevel.Warning,
        Message = "Inactive user attempted to authenticate. UserId: {UserId}")]
    public static partial void InactiveUserAttempted(
        this ILogger logger,
        string userId);

    [LoggerMessage(
        EventId = 1107,
        Level = LogLevel.Warning,
        Message = "User not found for token. UserId: {UserId}")]
    public static partial void UserNotFoundForToken(
        this ILogger logger,
        string userId);

    #endregion

    #region Rate Limiting (1200-1249)

    [LoggerMessage(
        EventId = 1201,
        Level = LogLevel.Warning,
        Message = "Rate limit exceeded. ClientIp: {ClientIp}, Path: {Path}, Limit: {Limit}, Window: {WindowMinutes} minutes")]
    public static partial void RateLimitExceeded(
        this ILogger logger,
        string clientIp,
        string? path,
        int limit,
        int windowMinutes);

    #endregion

    #region Exception Handling (1250-1299)

    [LoggerMessage(
        EventId = 1250,
        Level = LogLevel.Error,
        Message = "Unhandled exception. UserId: {UserId}, Method: {Method}, Path: {Path}, QueryString: {QueryString}, TraceId: {TraceId}, ExceptionType: {ExceptionType}")]
    public static partial void UnhandledException(
        this ILogger logger,
        Exception ex,
        string userId,
        string method,
        string? path,
        string? queryString,
        string traceId,
        string exceptionType);

    [LoggerMessage(
        EventId = 1251,
        Level = LogLevel.Warning,
        Message = "Client cancelled request. UserId: {UserId}, Path: {Path}")]
    public static partial void ClientCancelledRequest(
        this ILogger logger,
        string userId,
        string? path);

    [LoggerMessage(
        EventId = 1252,
        Level = LogLevel.Warning,
        Message = "Request timeout. UserId: {UserId}, Path: {Path}, TraceId: {TraceId}")]
    public static partial void RequestTimeout(
        this ILogger logger,
        string userId,
        string? path,
        string traceId);

    #endregion

    #region Health Checks (1300-1349)

    [LoggerMessage(
        EventId = 1301,
        Level = LogLevel.Information,
        Message = "Health check completed. Status: {Status}, Duration: {DurationMs}ms, Checks: {CheckCount}")]
    public static partial void HealthCheckCompleted(
        this ILogger logger,
        string status,
        long durationMs,
        int checkCount);

    [LoggerMessage(
        EventId = 1302,
        Level = LogLevel.Warning,
        Message = "Health check degraded. Name: {CheckName}, Status: {Status}, Duration: {DurationMs}ms")]
    public static partial void HealthCheckDegraded(
        this ILogger logger,
        string checkName,
        string status,
        long durationMs);

    [LoggerMessage(
        EventId = 1303,
        Level = LogLevel.Error,
        Message = "Health check failed. Name: {CheckName}, Error: {Error}")]
    public static partial void HealthCheckFailed(
        this ILogger logger,
        string checkName,
        string error);

    #endregion

    #region Streaming (1350-1399)

    [LoggerMessage(
        EventId = 1351,
        Level = LogLevel.Debug,
        Message = "SSE stream started. ConversationId: {ConversationId}, UserId: {UserId}")]
    public static partial void SseStreamStarted(
        this ILogger logger,
        string conversationId,
        string userId);

    [LoggerMessage(
        EventId = 1352,
        Level = LogLevel.Debug,
        Message = "SSE stream completed. ConversationId: {ConversationId}, Duration: {DurationMs}ms, EventCount: {EventCount}")]
    public static partial void SseStreamCompleted(
        this ILogger logger,
        string conversationId,
        long durationMs,
        int eventCount);

    [LoggerMessage(
        EventId = 1353,
        Level = LogLevel.Warning,
        Message = "SSE stream error. ConversationId: {ConversationId}, Error: {Error}")]
    public static partial void SseStreamError(
        this ILogger logger,
        string conversationId,
        string error);

    #endregion

    #region WebSocket (1400-1449)

    [LoggerMessage(
        EventId = 1401,
        Level = LogLevel.Information,
        Message = "WebSocket connection established. UserId: {UserId}, SessionId: {SessionId}")]
    public static partial void WebSocketConnected(
        this ILogger logger,
        string userId,
        string sessionId);

    [LoggerMessage(
        EventId = 1402,
        Level = LogLevel.Information,
        Message = "WebSocket connection closed. UserId: {UserId}, SessionId: {SessionId}, Duration: {DurationMs}ms")]
    public static partial void WebSocketDisconnected(
        this ILogger logger,
        string userId,
        string sessionId,
        long durationMs);

    [LoggerMessage(
        EventId = 1403,
        Level = LogLevel.Warning,
        Message = "WebSocket error. UserId: {UserId}, SessionId: {SessionId}, Error: {Error}")]
    public static partial void WebSocketError(
        this ILogger logger,
        string userId,
        string sessionId,
        string error);

    #endregion
}
