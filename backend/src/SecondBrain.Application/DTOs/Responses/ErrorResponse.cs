namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Standardized error response structure
/// </summary>
public sealed class ErrorResponse
{
    /// <summary>
    /// Error message
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// HTTP status code
    /// </summary>
    public int StatusCode { get; set; }

    /// <summary>
    /// Detailed error information (only in development)
    /// </summary>
    public string? Details { get; set; }

    /// <summary>
    /// Validation errors if applicable
    /// </summary>
    public Dictionary<string, string[]>? ValidationErrors { get; set; }

    /// <summary>
    /// Timestamp when the error occurred
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Trace ID for error tracking
    /// </summary>
    public string? TraceId { get; set; }
}

