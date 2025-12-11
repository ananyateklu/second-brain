using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;

namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Provides standardized retry policies for agent streaming operations.
/// Uses exponential backoff with jitter to handle rate limits and transient failures.
/// </summary>
public class AgentRetryPolicy : IAgentRetryPolicy
{
    private readonly ILogger<AgentRetryPolicy> _logger;
    private readonly Random _jitter = new();

    /// <summary>
    /// Default configuration for retry behavior.
    /// </summary>
    public static class Defaults
    {
        public const int MaxRetries = 3;
        public const int InitialDelayMs = 1000;
        public const int MaxDelayMs = 60000;
        public const int JitterMaxMs = 1000;
        public const double ExponentialBase = 2.0;
    }

    public AgentRetryPolicy(ILogger<AgentRetryPolicy> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Creates a retry policy for async operations with exponential backoff.
    /// </summary>
    public AsyncRetryPolicy CreateAsyncRetryPolicy(
        int maxRetries = Defaults.MaxRetries,
        int initialDelayMs = Defaults.InitialDelayMs,
        int maxDelayMs = Defaults.MaxDelayMs)
    {
        return Policy
            .Handle<HttpRequestException>()
            .Or<TaskCanceledException>(ex => !ex.CancellationToken.IsCancellationRequested)
            .Or<TimeoutException>()
            .Or<RateLimitException>()
            .Or<TransientApiException>()
            .WaitAndRetryAsync(
                retryCount: maxRetries,
                sleepDurationProvider: (retryAttempt, exception, context) =>
                    CalculateDelay(retryAttempt, exception, initialDelayMs, maxDelayMs),
                onRetryAsync: (exception, timeSpan, retryAttempt, context) =>
                {
                    _logger.LogWarning(
                        "Retry attempt {RetryAttempt}/{MaxRetries} after {DelayMs}ms due to: {ErrorType} - {ErrorMessage}",
                        retryAttempt,
                        maxRetries,
                        timeSpan.TotalMilliseconds,
                        exception.GetType().Name,
                        exception.Message);
                    return Task.CompletedTask;
                });
    }

    /// <summary>
    /// Creates a retry policy specifically for rate limit handling.
    /// </summary>
    public AsyncRetryPolicy CreateRateLimitRetryPolicy(int maxRetries = 5)
    {
        return Policy
            .Handle<RateLimitException>()
            .Or<HttpRequestException>(ex => ex.Message.Contains("429") || ex.Message.Contains("rate limit", StringComparison.OrdinalIgnoreCase))
            .WaitAndRetryAsync(
                retryCount: maxRetries,
                sleepDurationProvider: (retryAttempt, exception, context) =>
                {
                    // Check for Retry-After header value
                    if (exception is RateLimitException rle && rle.RetryAfterSeconds.HasValue)
                    {
                        var retryAfter = TimeSpan.FromSeconds(rle.RetryAfterSeconds.Value);
                        _logger.LogInformation("Rate limited. Retrying after {Seconds} seconds (from Retry-After header)",
                            rle.RetryAfterSeconds.Value);
                        return retryAfter;
                    }

                    // Default exponential backoff for rate limits
                    var delay = TimeSpan.FromSeconds(Math.Pow(2, retryAttempt) * 2);
                    if (delay.TotalMilliseconds > Defaults.MaxDelayMs)
                        delay = TimeSpan.FromMilliseconds(Defaults.MaxDelayMs);

                    return delay;
                },
                onRetryAsync: (exception, timeSpan, retryAttempt, context) =>
                {
                    _logger.LogWarning(
                        "Rate limit retry {RetryAttempt}/{MaxRetries}. Waiting {DelaySeconds}s",
                        retryAttempt,
                        maxRetries,
                        timeSpan.TotalSeconds);
                    return Task.CompletedTask;
                });
    }

    /// <summary>
    /// Executes an async operation with retry policy.
    /// </summary>
    public async Task<T> ExecuteWithRetryAsync<T>(
        Func<Task<T>> operation,
        int maxRetries = Defaults.MaxRetries,
        CancellationToken cancellationToken = default)
    {
        var policy = CreateAsyncRetryPolicy(maxRetries);
        return await policy.ExecuteAsync(async ct =>
        {
            ct.ThrowIfCancellationRequested();
            return await operation();
        }, cancellationToken);
    }

    /// <summary>
    /// Executes an async operation with retry policy (no return value).
    /// </summary>
    public async Task ExecuteWithRetryAsync(
        Func<Task> operation,
        int maxRetries = Defaults.MaxRetries,
        CancellationToken cancellationToken = default)
    {
        var policy = CreateAsyncRetryPolicy(maxRetries);
        await policy.ExecuteAsync(async ct =>
        {
            ct.ThrowIfCancellationRequested();
            await operation();
        }, cancellationToken);
    }

    /// <summary>
    /// Calculates delay with exponential backoff and jitter.
    /// </summary>
    private TimeSpan CalculateDelay(
        int retryAttempt,
        Exception exception,
        int initialDelayMs,
        int maxDelayMs)
    {
        // Check for Retry-After in rate limit exceptions
        if (exception is RateLimitException rle && rle.RetryAfterSeconds.HasValue)
        {
            return TimeSpan.FromSeconds(rle.RetryAfterSeconds.Value);
        }

        // Exponential backoff: initialDelay * 2^(attempt-1) + jitter
        var exponentialDelay = initialDelayMs * Math.Pow(Defaults.ExponentialBase, retryAttempt - 1);
        var jitter = _jitter.Next(0, Defaults.JitterMaxMs);
        var totalDelay = exponentialDelay + jitter;

        // Cap at maximum delay
        if (totalDelay > maxDelayMs)
            totalDelay = maxDelayMs;

        return TimeSpan.FromMilliseconds(totalDelay);
    }

    /// <summary>
    /// Determines if an exception is retriable.
    /// </summary>
    public static bool IsRetriable(Exception exception)
    {
        return exception switch
        {
            // Retriable
            HttpRequestException httpEx => IsRetriableHttpException(httpEx),
            TaskCanceledException tcEx => !tcEx.CancellationToken.IsCancellationRequested,
            TimeoutException => true,
            RateLimitException => true,
            TransientApiException => true,

            // Not retriable
            ArgumentException => false,
            InvalidOperationException => false,
            UnauthorizedAccessException => false,
            NotSupportedException => false,

            // Check inner exception
            _ when exception.InnerException != null => IsRetriable(exception.InnerException),

            // Default: not retriable
            _ => false
        };
    }

    /// <summary>
    /// Determines if an HTTP exception is retriable.
    /// </summary>
    private static bool IsRetriableHttpException(HttpRequestException exception)
    {
        var message = exception.Message.ToLowerInvariant();

        // Retriable status codes
        if (message.Contains("429") || // Too Many Requests
            message.Contains("500") || // Internal Server Error
            message.Contains("502") || // Bad Gateway
            message.Contains("503") || // Service Unavailable
            message.Contains("504"))   // Gateway Timeout
        {
            return true;
        }

        // Retriable error messages
        if (message.Contains("rate limit") ||
            message.Contains("timeout") ||
            message.Contains("temporarily unavailable") ||
            message.Contains("connection refused") ||
            message.Contains("connection reset"))
        {
            return true;
        }

        // Non-retriable client errors (4xx except 429)
        if (message.Contains("400") || // Bad Request
            message.Contains("401") || // Unauthorized
            message.Contains("403") || // Forbidden
            message.Contains("404") || // Not Found
            message.Contains("422"))   // Unprocessable Entity
        {
            return false;
        }

        return false;
    }
}

/// <summary>
/// Interface for agent retry policy.
/// </summary>
public interface IAgentRetryPolicy
{
    /// <summary>
    /// Creates a retry policy for async operations.
    /// </summary>
    AsyncRetryPolicy CreateAsyncRetryPolicy(
        int maxRetries = AgentRetryPolicy.Defaults.MaxRetries,
        int initialDelayMs = AgentRetryPolicy.Defaults.InitialDelayMs,
        int maxDelayMs = AgentRetryPolicy.Defaults.MaxDelayMs);

    /// <summary>
    /// Creates a retry policy for rate limit handling.
    /// </summary>
    AsyncRetryPolicy CreateRateLimitRetryPolicy(int maxRetries = 5);

    /// <summary>
    /// Executes an async operation with retry.
    /// </summary>
    Task<T> ExecuteWithRetryAsync<T>(
        Func<Task<T>> operation,
        int maxRetries = AgentRetryPolicy.Defaults.MaxRetries,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes an async operation with retry (no return value).
    /// </summary>
    Task ExecuteWithRetryAsync(
        Func<Task> operation,
        int maxRetries = AgentRetryPolicy.Defaults.MaxRetries,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Exception for rate limit errors with optional Retry-After value.
/// </summary>
public class RateLimitException : Exception
{
    /// <summary>
    /// Number of seconds to wait before retrying (from Retry-After header).
    /// </summary>
    public int? RetryAfterSeconds { get; }

    public RateLimitException(string message, int? retryAfterSeconds = null)
        : base(message)
    {
        RetryAfterSeconds = retryAfterSeconds;
    }

    public RateLimitException(string message, Exception innerException, int? retryAfterSeconds = null)
        : base(message, innerException)
    {
        RetryAfterSeconds = retryAfterSeconds;
    }
}

/// <summary>
/// Exception for transient API errors that should be retried.
/// </summary>
public class TransientApiException : Exception
{
    public TransientApiException(string message) : base(message) { }
    public TransientApiException(string message, Exception innerException) : base(message, innerException) { }
}
