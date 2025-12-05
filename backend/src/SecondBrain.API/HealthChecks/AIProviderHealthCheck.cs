using Microsoft.Extensions.Diagnostics.HealthChecks;
using SecondBrain.Application.Services.AI.CircuitBreaker;
using SecondBrain.Application.Services.AI.Interfaces;

namespace SecondBrain.API.HealthChecks;

/// <summary>
/// Health check for AI provider availability and circuit breaker states
/// </summary>
public class AIProviderHealthCheck : IHealthCheck
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly AIProviderCircuitBreaker _circuitBreaker;
    private readonly ILogger<AIProviderHealthCheck> _logger;

    public AIProviderHealthCheck(
        IAIProviderFactory providerFactory,
        AIProviderCircuitBreaker circuitBreaker,
        ILogger<AIProviderHealthCheck> logger)
    {
        _providerFactory = providerFactory;
        _circuitBreaker = circuitBreaker;
        _logger = logger;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var providerStatuses = new Dictionary<string, object>();
            var unhealthyProviders = new List<string>();
            var totalProviders = 0;

            foreach (var provider in _providerFactory.GetAllProviders())
            {
                totalProviders++;
                var providerName = provider.ProviderName;
                var circuitState = _circuitBreaker.GetState(providerName);

                var status = new Dictionary<string, object>
                {
                    { "circuitState", circuitState.ToString() },
                    { "isHealthy", circuitState != CircuitBreakerState.Open },
                    { "isEnabled", provider.IsEnabled }
                };

                providerStatuses[providerName] = status;

                if (circuitState == CircuitBreakerState.Open || !provider.IsEnabled)
                {
                    unhealthyProviders.Add(providerName);
                }
            }

            // Add timestamp
            providerStatuses["timestamp"] = DateTime.UtcNow;
            providerStatuses["totalProviders"] = totalProviders;
            providerStatuses["healthyCount"] = totalProviders - unhealthyProviders.Count;

            if (unhealthyProviders.Count == totalProviders && totalProviders > 0)
            {
                _logger.LogWarning("All AI providers are unavailable: {Providers}", string.Join(", ", unhealthyProviders));

                return Task.FromResult(HealthCheckResult.Unhealthy(
                    "All AI providers are unavailable",
                    data: providerStatuses));
            }

            if (unhealthyProviders.Count > 0)
            {
                _logger.LogInformation("Some AI providers unavailable: {Providers}", string.Join(", ", unhealthyProviders));

                return Task.FromResult(HealthCheckResult.Degraded(
                    $"Some AI providers unavailable: {string.Join(", ", unhealthyProviders)}",
                    data: providerStatuses));
            }

            return Task.FromResult(HealthCheckResult.Healthy(
                "All AI providers healthy",
                data: providerStatuses));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking AI provider health");

            return Task.FromResult(HealthCheckResult.Unhealthy(
                "Error checking AI provider health",
                exception: ex,
                data: new Dictionary<string, object>
                {
                    { "error", ex.Message },
                    { "timestamp", DateTime.UtcNow }
                }));
        }
    }
}
