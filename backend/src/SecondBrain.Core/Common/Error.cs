namespace SecondBrain.Core.Common;

/// <summary>
/// Represents an error with a code and message.
/// Error codes follow a consistent naming convention for easy identification.
/// </summary>
/// <param name="Code">A unique code identifying the error type (e.g., "NotFound", "Unauthorized", "ValidationFailed")</param>
/// <param name="Message">A human-readable error message</param>
public record Error(string Code, string Message)
{
    /// <summary>
    /// Creates a not found error
    /// </summary>
    public static Error NotFound(string resourceName, string id) =>
        new("NotFound", $"{resourceName} with ID '{id}' was not found");

    /// <summary>
    /// Creates a not found error with custom message
    /// </summary>
    public static Error NotFound(string message) =>
        new("NotFound", message);

    /// <summary>
    /// Creates an unauthorized error
    /// </summary>
    public static Error Unauthorized(string message = "Access denied") =>
        new("Unauthorized", message);

    /// <summary>
    /// Creates a forbidden error (authenticated but not allowed)
    /// </summary>
    public static Error Forbidden(string message = "You don't have permission to perform this action") =>
        new("Forbidden", message);

    /// <summary>
    /// Creates a validation error
    /// </summary>
    public static Error Validation(string message) =>
        new("ValidationFailed", message);

    /// <summary>
    /// Creates a conflict error (e.g., duplicate resource)
    /// </summary>
    public static Error Conflict(string message) =>
        new("Conflict", message);

    /// <summary>
    /// Creates an internal error
    /// </summary>
    public static Error Internal(string message = "An internal error occurred") =>
        new("InternalError", message);

    /// <summary>
    /// Creates a bad request error
    /// </summary>
    public static Error BadRequest(string message) =>
        new("BadRequest", message);

    /// <summary>
    /// Creates an external service error
    /// </summary>
    public static Error ExternalService(string serviceName, string message) =>
        new("ExternalServiceError", $"{serviceName}: {message}");

    /// <summary>
    /// Creates a rate limit exceeded error
    /// </summary>
    public static Error RateLimitExceeded(string message = "Rate limit exceeded. Please try again later.") =>
        new("RateLimitExceeded", message);

    /// <summary>
    /// Creates a timeout error
    /// </summary>
    public static Error Timeout(string message = "The operation timed out") =>
        new("Timeout", message);

    /// <summary>
    /// Creates a custom error with the specified code and message
    /// </summary>
    public static Error Custom(string code, string message) =>
        new(code, message);
}

/// <summary>
/// Contains common error codes as constants for consistency
/// </summary>
public static class ErrorCodes
{
    public const string NotFound = "NotFound";
    public const string Unauthorized = "Unauthorized";
    public const string Forbidden = "Forbidden";
    public const string ValidationFailed = "ValidationFailed";
    public const string Conflict = "Conflict";
    public const string InternalError = "InternalError";
    public const string BadRequest = "BadRequest";
    public const string ExternalServiceError = "ExternalServiceError";
    public const string RateLimitExceeded = "RateLimitExceeded";
    public const string Timeout = "Timeout";
}
