using System.Diagnostics;
using System.Diagnostics.Metrics;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using SecondBrain.API.Telemetry;

namespace SecondBrain.API.HealthChecks;

/// <summary>
/// Publishes health check results to OpenTelemetry metrics and logs.
/// Enables monitoring and alerting on health check status changes.
/// </summary>
public class HealthCheckPublisher : IHealthCheckPublisher
{
    private readonly ILogger<HealthCheckPublisher> _logger;
    private readonly TimeProvider _timeProvider;

    // Health check metrics
    private static readonly Meter HealthMetrics = new("SecondBrain.Health", TelemetryConfiguration.ServiceVersion);

    /// <summary>
    /// Gauge for health check status (1 = Healthy, 0.5 = Degraded, 0 = Unhealthy).
    /// </summary>
    private static readonly Histogram<double> HealthCheckStatus = HealthMetrics.CreateHistogram<double>(
        "health_check_status",
        description: "Health check status (1=Healthy, 0.5=Degraded, 0=Unhealthy)");

    /// <summary>
    /// Histogram for health check duration.
    /// </summary>
    private static readonly Histogram<double> HealthCheckDuration = HealthMetrics.CreateHistogram<double>(
        "health_check_duration_ms",
        unit: "ms",
        description: "Health check execution duration in milliseconds");

    /// <summary>
    /// Counter for health check failures.
    /// </summary>
    private static readonly Counter<long> HealthCheckFailures = HealthMetrics.CreateCounter<long>(
        "health_check_failures_total",
        description: "Total number of health check failures");

    /// <summary>
    /// Counter for health check degraded states.
    /// </summary>
    private static readonly Counter<long> HealthCheckDegraded = HealthMetrics.CreateCounter<long>(
        "health_check_degraded_total",
        description: "Total number of health check degraded states");

    public HealthCheckPublisher(
        ILogger<HealthCheckPublisher> logger,
        TimeProvider timeProvider)
    {
        _logger = logger;
        _timeProvider = timeProvider;
    }

    /// <summary>
    /// Publishes health check results to metrics and logs.
    /// Called periodically by the health check service.
    /// </summary>
    public Task PublishAsync(HealthReport report, CancellationToken cancellationToken)
    {
        var timestamp = _timeProvider.GetUtcNow();

        // Record overall report status
        RecordOverallStatus(report, timestamp);

        // Record individual check statuses
        foreach (var entry in report.Entries)
        {
            RecordCheckStatus(entry.Key, entry.Value, timestamp);
        }

        return Task.CompletedTask;
    }

    private void RecordOverallStatus(HealthReport report, DateTimeOffset timestamp)
    {
        var statusValue = report.Status switch
        {
            HealthStatus.Healthy => 1.0,
            HealthStatus.Degraded => 0.5,
            HealthStatus.Unhealthy => 0.0,
            _ => 0.0
        };

        var tags = new TagList
        {
            { "check_name", "overall" },
            { "status", report.Status.ToString().ToLowerInvariant() }
        };

        HealthCheckStatus.Record(statusValue, tags);
        HealthCheckDuration.Record(report.TotalDuration.TotalMilliseconds, tags);

        // Log based on status
        switch (report.Status)
        {
            case HealthStatus.Unhealthy:
                _logger.LogError(
                    "Health check report is Unhealthy. Duration: {Duration}ms. Timestamp: {Timestamp}",
                    report.TotalDuration.TotalMilliseconds,
                    timestamp);
                break;

            case HealthStatus.Degraded:
                _logger.LogWarning(
                    "Health check report is Degraded. Duration: {Duration}ms. Timestamp: {Timestamp}",
                    report.TotalDuration.TotalMilliseconds,
                    timestamp);
                break;

            case HealthStatus.Healthy:
                _logger.LogDebug(
                    "Health check report is Healthy. Duration: {Duration}ms",
                    report.TotalDuration.TotalMilliseconds);
                break;
        }
    }

    private void RecordCheckStatus(string checkName, HealthReportEntry entry, DateTimeOffset timestamp)
    {
        var statusValue = entry.Status switch
        {
            HealthStatus.Healthy => 1.0,
            HealthStatus.Degraded => 0.5,
            HealthStatus.Unhealthy => 0.0,
            _ => 0.0
        };

        var tags = new TagList
        {
            { "check_name", checkName },
            { "status", entry.Status.ToString().ToLowerInvariant() }
        };

        // Add tags if available
        foreach (var tag in entry.Tags)
        {
            tags.Add($"tag_{tag}", "true");
        }

        HealthCheckStatus.Record(statusValue, tags);
        HealthCheckDuration.Record(entry.Duration.TotalMilliseconds, tags);

        // Update failure/degraded counters
        switch (entry.Status)
        {
            case HealthStatus.Unhealthy:
                HealthCheckFailures.Add(1, new TagList { { "check_name", checkName } });

                _logger.LogWarning(
                    "Health check {CheckName} is Unhealthy: {Description}. Duration: {Duration}ms. Exception: {Exception}",
                    checkName,
                    entry.Description ?? "No description",
                    entry.Duration.TotalMilliseconds,
                    entry.Exception?.Message ?? "None");
                break;

            case HealthStatus.Degraded:
                HealthCheckDegraded.Add(1, new TagList { { "check_name", checkName } });

                _logger.LogWarning(
                    "Health check {CheckName} is Degraded: {Description}. Duration: {Duration}ms",
                    checkName,
                    entry.Description ?? "No description",
                    entry.Duration.TotalMilliseconds);
                break;

            case HealthStatus.Healthy:
                _logger.LogDebug(
                    "Health check {CheckName} is Healthy. Duration: {Duration}ms",
                    checkName,
                    entry.Duration.TotalMilliseconds);
                break;
        }

        // Log data if present for non-healthy checks
        if (entry.Status != HealthStatus.Healthy && entry.Data.Count > 0)
        {
            _logger.LogDebug(
                "Health check {CheckName} data: {@Data}",
                checkName,
                entry.Data);
        }
    }
}
