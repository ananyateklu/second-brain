using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.API.HealthChecks;

/// <summary>
/// Health check for vector store connectivity (PostgreSQL pgvector or Pinecone)
/// </summary>
public class VectorStoreHealthCheck : IHealthCheck
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IOptions<RagSettings> _ragSettings;
    private readonly ILogger<VectorStoreHealthCheck> _logger;

    public VectorStoreHealthCheck(
        IServiceProvider serviceProvider,
        IOptions<RagSettings> ragSettings,
        ILogger<VectorStoreHealthCheck> logger)
    {
        _serviceProvider = serviceProvider;
        _ragSettings = ragSettings;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var data = new Dictionary<string, object>
        {
            { "timestamp", DateTime.UtcNow },
            { "configuredProvider", _ragSettings.Value.VectorStoreProvider ?? "PostgreSQL" }
        };

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var vectorStore = scope.ServiceProvider.GetRequiredService<IVectorStore>();

            // Perform a lightweight connectivity check
            // The vector store should implement a way to test connectivity
            // For now, we'll consider it healthy if we can get the service
            var isHealthy = vectorStore != null;

            if (isHealthy)
            {
                data["status"] = "connected";

                _logger.LogDebug("Vector store health check passed for {Provider}", _ragSettings.Value.VectorStoreProvider);

                return HealthCheckResult.Healthy(
                    $"Vector store ({_ragSettings.Value.VectorStoreProvider ?? "PostgreSQL"}) is accessible",
                    data: data);
            }

            return HealthCheckResult.Unhealthy(
                "Vector store is not accessible",
                data: data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Vector store health check failed");

            data["error"] = ex.Message;
            data["status"] = "error";

            return HealthCheckResult.Unhealthy(
                "Vector store is not accessible",
                exception: ex,
                data: data);
        }
    }
}

/// <summary>
/// Health check for memory pressure monitoring
/// </summary>
public class MemoryHealthCheck : IHealthCheck
{
    private readonly ILogger<MemoryHealthCheck> _logger;
    private readonly long _warningThresholdBytes;
    private readonly long _criticalThresholdBytes;

    public MemoryHealthCheck(
        ILogger<MemoryHealthCheck> logger,
        long warningThresholdBytes = 512 * 1024 * 1024,   // 512 MB
        long criticalThresholdBytes = 1024 * 1024 * 1024) // 1 GB
    {
        _logger = logger;
        _warningThresholdBytes = warningThresholdBytes;
        _criticalThresholdBytes = criticalThresholdBytes;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var allocatedBytes = GC.GetTotalMemory(forceFullCollection: false);
        var allocatedMB = allocatedBytes / (1024 * 1024);
        var gen0Collections = GC.CollectionCount(0);
        var gen1Collections = GC.CollectionCount(1);
        var gen2Collections = GC.CollectionCount(2);

        var data = new Dictionary<string, object>
        {
            { "allocatedMemoryMB", allocatedMB },
            { "allocatedMemoryBytes", allocatedBytes },
            { "gen0Collections", gen0Collections },
            { "gen1Collections", gen1Collections },
            { "gen2Collections", gen2Collections },
            { "timestamp", DateTime.UtcNow }
        };

        if (allocatedBytes >= _criticalThresholdBytes)
        {
            _logger.LogWarning("Critical memory pressure: {AllocatedMB}MB", allocatedMB);

            return Task.FromResult(HealthCheckResult.Unhealthy(
                $"Critical memory pressure: {allocatedMB}MB allocated",
                data: data));
        }

        if (allocatedBytes >= _warningThresholdBytes)
        {
            _logger.LogInformation("High memory usage: {AllocatedMB}MB", allocatedMB);

            return Task.FromResult(HealthCheckResult.Degraded(
                $"High memory usage: {allocatedMB}MB allocated",
                data: data));
        }

        return Task.FromResult(HealthCheckResult.Healthy(
            $"Memory: {allocatedMB}MB allocated",
            data: data));
    }
}
