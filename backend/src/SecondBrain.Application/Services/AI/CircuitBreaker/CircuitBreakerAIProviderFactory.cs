using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using System.Collections.Concurrent;
using System.Runtime.CompilerServices;

namespace SecondBrain.Application.Services.AI.CircuitBreaker;

/// <summary>
/// Factory that wraps AI providers with circuit breaker protection.
/// Decorates the underlying factory to add resilience patterns.
/// </summary>
public class CircuitBreakerAIProviderFactory : IAIProviderFactory
{
    private readonly IAIProviderFactory _innerFactory;
    private readonly AIProviderCircuitBreaker _circuitBreaker;
    private readonly ILogger<CircuitBreakerAIProviderFactory> _logger;
    private readonly TimeProvider _timeProvider;
    private readonly ConcurrentDictionary<string, CircuitBreakerAIProvider> _wrappedProviders;

    public CircuitBreakerAIProviderFactory(
        IAIProviderFactory innerFactory,
        AIProviderCircuitBreaker circuitBreaker,
        ILogger<CircuitBreakerAIProviderFactory> logger,
        TimeProvider? timeProvider = null)
    {
        _innerFactory = innerFactory ?? throw new ArgumentNullException(nameof(innerFactory));
        _circuitBreaker = circuitBreaker ?? throw new ArgumentNullException(nameof(circuitBreaker));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _timeProvider = timeProvider ?? TimeProvider.System;
        _wrappedProviders = new ConcurrentDictionary<string, CircuitBreakerAIProvider>(StringComparer.OrdinalIgnoreCase);
    }

    public IAIProvider GetProvider(string providerName)
    {
        return _wrappedProviders.GetOrAdd(providerName, name =>
        {
            var innerProvider = _innerFactory.GetProvider(name);
            _logger.LogDebug("Wrapping AI provider {Provider} with circuit breaker", name);
            return new CircuitBreakerAIProvider(innerProvider, _circuitBreaker, _timeProvider);
        });
    }

    public IEnumerable<IAIProvider> GetAllProviders()
    {
        return _innerFactory.GetAllProviders()
            .Select(p => GetProvider(p.ProviderName));
    }

    public IEnumerable<IAIProvider> GetEnabledProviders()
    {
        return _innerFactory.GetEnabledProviders()
            .Select(p => GetProvider(p.ProviderName));
    }

    /// <summary>
    /// Gets the circuit breaker state for a specific provider.
    /// </summary>
    public CircuitBreakerState GetProviderState(string providerName)
    {
        return _circuitBreaker.GetState(providerName);
    }

    /// <summary>
    /// Gets detailed circuit breaker information for a specific provider.
    /// </summary>
    public CircuitBreakerStateInfo? GetProviderStateInfo(string providerName)
    {
        return _circuitBreaker.GetStateInfo(providerName);
    }
}

/// <summary>
/// AI Provider wrapper that executes all operations through a circuit breaker.
/// </summary>
internal class CircuitBreakerAIProvider : IAIProvider
{
    private readonly IAIProvider _innerProvider;
    private readonly AIProviderCircuitBreaker _circuitBreaker;
    private readonly TimeProvider _timeProvider;

    public CircuitBreakerAIProvider(
        IAIProvider innerProvider,
        AIProviderCircuitBreaker circuitBreaker,
        TimeProvider? timeProvider = null)
    {
        _innerProvider = innerProvider;
        _circuitBreaker = circuitBreaker;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public string ProviderName => _innerProvider.ProviderName;
    public bool IsEnabled => _innerProvider.IsEnabled;

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        // Health checks bypass circuit breaker so we can detect recovery
        return _innerProvider.IsAvailableAsync(cancellationToken);
    }

    public Task<AIProviderHealth> GetHealthStatusAsync(CancellationToken cancellationToken = default)
    {
        // Health checks bypass circuit breaker so we can detect recovery
        return _innerProvider.GetHealthStatusAsync(cancellationToken);
    }

    public Task<AIProviderHealth> GetHealthStatusAsync(
        Dictionary<string, string>? configOverrides,
        CancellationToken cancellationToken = default)
    {
        // Health checks bypass circuit breaker so we can detect recovery
        return _innerProvider.GetHealthStatusAsync(configOverrides, cancellationToken);
    }

    public async Task<AIResponse> GenerateCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        return await _circuitBreaker.ExecuteAsync(
            ProviderName,
            async ct => await _innerProvider.GenerateCompletionAsync(request, ct),
            cancellationToken);
    }

    public async Task<AIResponse> GenerateChatCompletionAsync(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        return await _circuitBreaker.ExecuteAsync(
            ProviderName,
            async ct => await _innerProvider.GenerateChatCompletionAsync(messages, settings, ct),
            cancellationToken);
    }

    public async Task<IAsyncEnumerable<string>> StreamCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default)
    {
        // Check circuit state before starting - use GetSnapshot() for atomic read
        var stateInfo = _circuitBreaker.GetStateInfo(ProviderName);
        if (stateInfo != null)
        {
            var snapshot = stateInfo.GetSnapshot();
            if (snapshot.State == CircuitBreakerState.Open)
            {
                var retryAfter = snapshot.LastTransitionTime.Add(_circuitBreaker.BreakDuration) - _timeProvider.GetUtcNow().DateTime;
                throw new CircuitBreakerOpenException(ProviderName, retryAfter > TimeSpan.Zero ? retryAfter : null);
            }
        }

        // Wrap the stream creation in circuit breaker
        var innerStream = await _circuitBreaker.ExecuteAsync(
            ProviderName,
            async ct => await _innerProvider.StreamCompletionAsync(request, ct),
            cancellationToken);

        // Return a wrapper that monitors enumeration for failures
        return WrapStreamWithCircuitBreaker(innerStream, cancellationToken);
    }

    public async Task<IAsyncEnumerable<string>> StreamChatCompletionAsync(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        // Check circuit state before starting - use GetSnapshot() for atomic read
        var stateInfo = _circuitBreaker.GetStateInfo(ProviderName);
        if (stateInfo != null)
        {
            var snapshot = stateInfo.GetSnapshot();
            if (snapshot.State == CircuitBreakerState.Open)
            {
                var retryAfter = snapshot.LastTransitionTime.Add(_circuitBreaker.BreakDuration) - _timeProvider.GetUtcNow().DateTime;
                throw new CircuitBreakerOpenException(ProviderName, retryAfter > TimeSpan.Zero ? retryAfter : null);
            }
        }

        // Wrap the stream creation in circuit breaker
        var innerStream = await _circuitBreaker.ExecuteAsync(
            ProviderName,
            async ct => await _innerProvider.StreamChatCompletionAsync(messages, settings, ct),
            cancellationToken);

        // Return a wrapper that monitors enumeration for failures
        return WrapStreamWithCircuitBreaker(innerStream, cancellationToken);
    }

    /// <summary>
    /// Wraps an async enumerable stream to track failures during enumeration.
    /// This ensures network failures during streaming are recorded by the circuit breaker.
    /// </summary>
    private async IAsyncEnumerable<string> WrapStreamWithCircuitBreaker(
        IAsyncEnumerable<string> innerStream,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        // Track if we've started enumeration to distinguish connection vs streaming failures
        var enumerator = innerStream.GetAsyncEnumerator(cancellationToken);
        try
        {
            while (true)
            {
                bool hasNext;
                try
                {
                    // Execute each MoveNextAsync through circuit breaker to track streaming failures
                    hasNext = await _circuitBreaker.ExecuteAsync(
                        ProviderName,
                        async _ => await enumerator.MoveNextAsync(),
                        cancellationToken);
                }
                catch (CircuitBreakerOpenException)
                {
                    // Re-throw circuit breaker exceptions as-is
                    throw;
                }
                catch (OperationCanceledException)
                {
                    // Don't treat cancellation as a failure
                    throw;
                }

                if (!hasNext)
                    break;

                yield return enumerator.Current;
            }
        }
        finally
        {
            await enumerator.DisposeAsync();
        }
    }
}
