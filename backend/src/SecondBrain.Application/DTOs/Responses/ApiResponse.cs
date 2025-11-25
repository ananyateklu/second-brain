namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Standardized API response wrapper
/// </summary>
/// <typeparam name="T">Type of data being returned</typeparam>
public sealed class ApiResponse<T>
{
    /// <summary>
    /// Indicates if the request was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The data payload
    /// </summary>
    public T? Data { get; set; }

    /// <summary>
    /// Error message if request failed
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Additional metadata about the response
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }

    /// <summary>
    /// Creates a successful response
    /// </summary>
    public static ApiResponse<T> Ok(T data, Dictionary<string, object>? metadata = null)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Data = data,
            Metadata = metadata
        };
    }

    /// <summary>
    /// Creates an error response
    /// </summary>
    public static ApiResponse<T> Fail(string error, Dictionary<string, object>? metadata = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Error = error,
            Metadata = metadata
        };
    }
}

