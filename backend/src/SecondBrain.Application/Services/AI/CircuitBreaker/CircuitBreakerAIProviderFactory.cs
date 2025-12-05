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
    private readonly ConcurrentDictionary<string, CircuitBreakerAIProvider> _wrappedProviders;

    public CircuitBreakerAIProviderFactory(
        IAIProviderFactory innerFactory,
        AIProviderCircuitBreaker circuitBreaker,
        ILogger<CircuitBreakerAIProviderFactory> logger)
    {
        _innerFactory = innerFactory ?? throw new ArgumentNullException(nameof(innerFactory));
        _circuitBreaker = circuitBreaker ?? throw new ArgumentNullException(nameof(circuitBreaker));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _wrappedProviders = new ConcurrentDictionary<string, CircuitBreakerAIProvider>(StringComparer.OrdinalIgnoreCase);
    }

    public IAIProvider GetProvider(string providerName)
    {
        return _wrappedProviders.GetOrAdd(providerName, name =>
        {
            var innerProvider = _innerFactory.GetProvider(name);
            _logger.LogDebug("Wrapping AI provider {Provider} with circuit breaker", name);
            return new CircuitBreakerAIProvider(innerProvider, _circuitBreaker);
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

    public CircuitBreakerAIProvider(
        IAIProvider innerProvider,
        AIProviderCircuitBreaker circuitBreaker)
    {
        _innerProvider = innerProvider;
        _circuitBreaker = circuitBreaker;
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
        // Check circuit state before starting
        var state = _circuitBreaker.GetState(ProviderName);
        if (state == CircuitBreakerState.Open)
        {
            var stateInfo = _circuitBreaker.GetStateInfo(ProviderName);
            var retryAfter = stateInfo?.LastTransitionTime.AddSeconds(60) - DateTime.UtcNow;
            throw new CircuitBreakerOpenException(ProviderName, retryAfter > TimeSpan.Zero ? retryAfter : null);
        }

        return await _circuitBreaker.ExecuteAsync(
            ProviderName,
            async ct => await _innerProvider.StreamCompletionAsync(request, ct),
            cancellationToken);
    }

    public async Task<IAsyncEnumerable<string>> StreamChatCompletionAsync(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default)
    {
        // Check circuit state before starting
        var state = _circuitBreaker.GetState(ProviderName);
        if (state == CircuitBreakerState.Open)
        {
            var stateInfo = _circuitBreaker.GetStateInfo(ProviderName);
            var retryAfter = stateInfo?.LastTransitionTime.AddSeconds(60) - DateTime.UtcNow;
            throw new CircuitBreakerOpenException(ProviderName, retryAfter > TimeSpan.Zero ? retryAfter : null);
        }

        return await _circuitBreaker.ExecuteAsync(
            ProviderName,
            async ct => await _innerProvider.StreamChatCompletionAsync(messages, settings, ct),
            cancellationToken);
    }
}
