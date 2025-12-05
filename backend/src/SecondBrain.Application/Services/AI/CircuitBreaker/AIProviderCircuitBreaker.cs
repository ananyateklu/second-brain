using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;
using Polly.CircuitBreaker;
using System.Collections.Concurrent;

namespace SecondBrain.Application.Services.AI.CircuitBreaker;

/// <summary>
/// Manages circuit breakers for AI providers to prevent cascading failures.
/// Each provider gets its own circuit breaker that opens after consecutive failures.
/// </summary>
public class AIProviderCircuitBreaker
{
    private readonly ConcurrentDictionary<string, ResiliencePipeline> _circuitBreakers;
    private readonly ConcurrentDictionary<string, CircuitBreakerStateInfo> _stateInfo;
    private readonly ILogger<AIProviderCircuitBreaker> _logger;
    private readonly CircuitBreakerSettings _settings;

    public AIProviderCircuitBreaker(
        ILogger<AIProviderCircuitBreaker> logger,
        IOptions<CircuitBreakerSettings> settings)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _settings = settings?.Value ?? new CircuitBreakerSettings();
        _circuitBreakers = new ConcurrentDictionary<string, ResiliencePipeline>(StringComparer.OrdinalIgnoreCase);
        _stateInfo = new ConcurrentDictionary<string, CircuitBreakerStateInfo>(StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Executes an async operation through the circuit breaker for the specified provider.
    /// </summary>
    /// <typeparam name="T">The return type of the operation</typeparam>
    /// <param name="providerName">The name of the AI provider</param>
    /// <param name="operation">The async operation to execute</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The result of the operation</returns>
    /// <exception cref="CircuitBreakerOpenException">Thrown when the circuit is open</exception>
    public async Task<T> ExecuteAsync<T>(
        string providerName,
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default)
    {
        var pipeline = GetOrCreatePipeline(providerName);

        try
        {
            return await pipeline.ExecuteAsync(
                async ct => await operation(ct),
                cancellationToken);
        }
        catch (BrokenCircuitException ex)
        {
            var stateInfo = GetStateInfo(providerName);
            var retryAfter = stateInfo?.LastTransitionTime.Add(_settings.BreakDuration) - DateTime.UtcNow;

            _logger.LogWarning(
                "Circuit breaker open for provider {Provider}. Retry after: {RetryAfter}",
                providerName, retryAfter);

            throw new CircuitBreakerOpenException(providerName, ex, retryAfter > TimeSpan.Zero ? retryAfter : null);
        }
    }

    /// <summary>
    /// Executes an async operation through the circuit breaker (void return).
    /// </summary>
    /// <param name="providerName">The name of the AI provider</param>
    /// <param name="operation">The async operation to execute</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <exception cref="CircuitBreakerOpenException">Thrown when the circuit is open</exception>
    public async Task ExecuteAsync(
        string providerName,
        Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken = default)
    {
        await ExecuteAsync<object?>(
            providerName,
            async ct =>
            {
                await operation(ct);
                return null;
            },
            cancellationToken);
    }

    /// <summary>
    /// Gets the current state of the circuit breaker for a provider.
    /// </summary>
    /// <param name="providerName">The name of the AI provider</param>
    /// <returns>The current circuit breaker state</returns>
    public CircuitBreakerState GetState(string providerName)
    {
        var stateInfo = GetStateInfo(providerName);
        return stateInfo?.State ?? CircuitBreakerState.Closed;
    }

    /// <summary>
    /// Gets detailed information about a provider's circuit breaker.
    /// </summary>
    /// <param name="providerName">The name of the AI provider</param>
    /// <returns>State information or null if no circuit breaker exists</returns>
    public CircuitBreakerStateInfo? GetStateInfo(string providerName)
    {
        return _stateInfo.TryGetValue(providerName, out var info) ? info : null;
    }

    /// <summary>
    /// Manually resets the circuit breaker for a provider to closed state.
    /// Use with caution - should generally let the circuit breaker manage itself.
    /// </summary>
    /// <param name="providerName">The name of the AI provider</param>
    public void Reset(string providerName)
    {
        if (_stateInfo.TryGetValue(providerName, out var info))
        {
            info.State = CircuitBreakerState.Closed;
            info.FailureCount = 0;
            info.LastTransitionTime = DateTime.UtcNow;

            _logger.LogInformation(
                "Circuit breaker manually reset for provider {Provider}",
                providerName);
        }
    }

    /// <summary>
    /// Gets or creates a resilience pipeline for the specified provider.
    /// </summary>
    private ResiliencePipeline GetOrCreatePipeline(string providerName)
    {
        return _circuitBreakers.GetOrAdd(providerName, name =>
        {
            var stateInfo = _stateInfo.GetOrAdd(name, _ => new CircuitBreakerStateInfo());

            var pipeline = new ResiliencePipelineBuilder()
                .AddCircuitBreaker(new CircuitBreakerStrategyOptions
                {
                    FailureRatio = _settings.FailureRatio,
                    SamplingDuration = _settings.SamplingDuration,
                    MinimumThroughput = _settings.MinimumThroughput,
                    BreakDuration = _settings.BreakDuration,
                    ShouldHandle = new PredicateBuilder().Handle<Exception>(ex =>
                    {
                        // Don't trip circuit for cancellation or validation errors
                        if (ex is OperationCanceledException) return false;
                        if (ex is ArgumentException) return false;
                        if (ex is InvalidOperationException && ex.Message.Contains("not enabled")) return false;

                        // Trip for network/timeout/API errors
                        return true;
                    }),
                    OnOpened = args =>
                    {
                        stateInfo.State = CircuitBreakerState.Open;
                        stateInfo.LastTransitionTime = DateTime.UtcNow;
                        stateInfo.LastException = args.Outcome.Exception;

                        _logger.LogWarning(
                            "Circuit breaker OPENED for provider {Provider}. Duration: {Duration}. Last error: {Error}",
                            name, args.BreakDuration, args.Outcome.Exception?.Message);

                        return ValueTask.CompletedTask;
                    },
                    OnClosed = args =>
                    {
                        stateInfo.State = CircuitBreakerState.Closed;
                        stateInfo.LastTransitionTime = DateTime.UtcNow;
                        stateInfo.FailureCount = 0;
                        stateInfo.LastException = null;

                        _logger.LogInformation(
                            "Circuit breaker CLOSED for provider {Provider}. Service recovered.",
                            name);

                        return ValueTask.CompletedTask;
                    },
                    OnHalfOpened = args =>
                    {
                        stateInfo.State = CircuitBreakerState.HalfOpen;
                        stateInfo.LastTransitionTime = DateTime.UtcNow;

                        _logger.LogInformation(
                            "Circuit breaker HALF-OPEN for provider {Provider}. Testing recovery...",
                            name);

                        return ValueTask.CompletedTask;
                    }
                })
                .Build();

            _logger.LogInformation(
                "Created circuit breaker for provider {Provider}. FailureRatio: {Ratio}, BreakDuration: {Duration}",
                name, _settings.FailureRatio, _settings.BreakDuration);

            return pipeline;
        });
    }
}

/// <summary>
/// Represents the state of a circuit breaker.
/// </summary>
public enum CircuitBreakerState
{
    /// <summary>
    /// Circuit is closed - requests flow through normally.
    /// </summary>
    Closed,

    /// <summary>
    /// Circuit is open - requests are rejected immediately.
    /// </summary>
    Open,

    /// <summary>
    /// Circuit is half-open - a test request is allowed through.
    /// </summary>
    HalfOpen
}

/// <summary>
/// Detailed state information for a circuit breaker.
/// </summary>
public class CircuitBreakerStateInfo
{
    /// <summary>
    /// Current state of the circuit breaker.
    /// </summary>
    public CircuitBreakerState State { get; set; } = CircuitBreakerState.Closed;

    /// <summary>
    /// Number of consecutive failures.
    /// </summary>
    public int FailureCount { get; set; }

    /// <summary>
    /// Time of the last state transition.
    /// </summary>
    public DateTime LastTransitionTime { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// The last exception that contributed to opening the circuit.
    /// </summary>
    public Exception? LastException { get; set; }
}

/// <summary>
/// Configuration settings for the circuit breaker.
/// </summary>
public class CircuitBreakerSettings
{
    public const string SectionName = "CircuitBreaker";

    /// <summary>
    /// The ratio of failures to successes that will trigger the circuit to open.
    /// Default is 0.5 (50% failure rate).
    /// </summary>
    public double FailureRatio { get; set; } = 0.5;

    /// <summary>
    /// The duration of the sampling window in seconds.
    /// Default is 30 seconds.
    /// </summary>
    public int SamplingDurationSeconds { get; set; } = 30;

    /// <summary>
    /// The duration of the sampling window.
    /// </summary>
    public TimeSpan SamplingDuration => TimeSpan.FromSeconds(SamplingDurationSeconds);

    /// <summary>
    /// Minimum number of calls in the sampling window before the circuit can open.
    /// Default is 5 calls.
    /// </summary>
    public int MinimumThroughput { get; set; } = 5;

    /// <summary>
    /// How long the circuit stays open before transitioning to half-open in seconds.
    /// Default is 60 seconds.
    /// </summary>
    public int BreakDurationSeconds { get; set; } = 60;

    /// <summary>
    /// How long the circuit stays open before transitioning to half-open.
    /// </summary>
    public TimeSpan BreakDuration => TimeSpan.FromSeconds(BreakDurationSeconds);
}
