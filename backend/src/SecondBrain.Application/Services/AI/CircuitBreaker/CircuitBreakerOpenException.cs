namespace SecondBrain.Application.Services.AI.CircuitBreaker;

/// <summary>
/// Exception thrown when a circuit breaker is in the open state and rejects an operation.
/// </summary>
public class CircuitBreakerOpenException : Exception
{
    /// <summary>
    /// The name of the provider whose circuit breaker is open.
    /// </summary>
    public string ProviderName { get; }

    /// <summary>
    /// The time remaining until the circuit breaker transitions to half-open state.
    /// </summary>
    public TimeSpan? RetryAfter { get; }

    /// <summary>
    /// Creates a new instance of CircuitBreakerOpenException.
    /// </summary>
    /// <param name="providerName">The name of the provider</param>
    /// <param name="retryAfter">Optional time until retry is possible</param>
    public CircuitBreakerOpenException(string providerName, TimeSpan? retryAfter = null)
        : base($"Circuit breaker for provider '{providerName}' is open. Service is temporarily unavailable.")
    {
        ProviderName = providerName;
        RetryAfter = retryAfter;
    }

    /// <summary>
    /// Creates a new instance of CircuitBreakerOpenException with an inner exception.
    /// </summary>
    /// <param name="providerName">The name of the provider</param>
    /// <param name="innerException">The inner exception that caused the circuit to open</param>
    /// <param name="retryAfter">Optional time until retry is possible</param>
    public CircuitBreakerOpenException(string providerName, Exception innerException, TimeSpan? retryAfter = null)
        : base($"Circuit breaker for provider '{providerName}' is open. Service is temporarily unavailable.", innerException)
    {
        ProviderName = providerName;
        RetryAfter = retryAfter;
    }
}
