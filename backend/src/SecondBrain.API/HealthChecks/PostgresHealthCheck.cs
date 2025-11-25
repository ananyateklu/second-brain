using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using SecondBrain.Infrastructure.Data;

namespace SecondBrain.API.HealthChecks;

/// <summary>
/// Health check for PostgreSQL connectivity
/// </summary>
public class PostgresHealthCheck : IHealthCheck
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PostgresHealthCheck> _logger;

    public PostgresHealthCheck(ApplicationDbContext context, ILogger<PostgresHealthCheck> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Try to connect and execute a simple query
            var canConnect = await _context.Database.CanConnectAsync(cancellationToken);

            if (canConnect)
            {
                _logger.LogDebug("PostgreSQL health check passed");

                return HealthCheckResult.Healthy("PostgreSQL is accessible", new Dictionary<string, object>
                {
                    { "database", _context.Database.GetDbConnection().Database },
                    { "timestamp", DateTime.UtcNow }
                });
            }

            return HealthCheckResult.Unhealthy("PostgreSQL is not accessible", null, new Dictionary<string, object>
            {
                { "timestamp", DateTime.UtcNow }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PostgreSQL health check failed");

            return HealthCheckResult.Unhealthy(
                "PostgreSQL is not accessible",
                ex,
                new Dictionary<string, object>
                {
                    { "error", ex.Message },
                    { "timestamp", DateTime.UtcNow }
                });
        }
    }
}

