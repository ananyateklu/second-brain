using System.Collections.Concurrent;

namespace SecondBrain.Application.Services.Agents.Metrics;

/// <summary>
/// In-memory metrics collection service.
/// Thread-safe for concurrent agent operations.
/// </summary>
public class AgentMetricsService : IAgentMetricsService
{
    private readonly ConcurrentQueue<ToolExecutionRecord> _toolExecutions = new();
    private readonly ConcurrentQueue<RequestRecord> _requests = new();
    private readonly TimeSpan _retentionPeriod;

    // Internal record types
    private record ToolExecutionRecord(
        string ToolName,
        long DurationMs,
        bool Success,
        string? Provider,
        DateTime Timestamp);

    private record RequestRecord(
        string Provider,
        int InputTokens,
        int OutputTokens,
        int ToolCallCount,
        DateTime Timestamp);

    /// <summary>
    /// Create a new metrics service with specified retention period.
    /// </summary>
    /// <param name="retentionPeriod">How long to retain metrics (default: 24 hours).</param>
    public AgentMetricsService(TimeSpan? retentionPeriod = null)
    {
        _retentionPeriod = retentionPeriod ?? TimeSpan.FromHours(24);
    }

    /// <inheritdoc />
    public void RecordToolExecution(string toolName, long durationMs, bool success, string? provider = null)
    {
        _toolExecutions.Enqueue(new ToolExecutionRecord(
            toolName,
            durationMs,
            success,
            provider,
            DateTime.UtcNow));

        // Periodically clean up old records
        CleanupIfNeeded();
    }

    /// <inheritdoc />
    public void RecordRequest(string provider, int inputTokens, int outputTokens, int toolCallCount)
    {
        _requests.Enqueue(new RequestRecord(
            provider,
            inputTokens,
            outputTokens,
            toolCallCount,
            DateTime.UtcNow));

        // Periodically clean up old records
        CleanupIfNeeded();
    }

    /// <inheritdoc />
    public AgentMetricsSummary GetSummary(TimeSpan period)
    {
        var now = DateTime.UtcNow;
        return GetSummary(now - period, now);
    }

    /// <inheritdoc />
    public AgentMetricsSummary GetSummary(DateTime from, DateTime? to = null)
    {
        var toDate = to ?? DateTime.UtcNow;

        // Filter records in time range
        var toolRecords = _toolExecutions
            .Where(r => r.Timestamp >= from && r.Timestamp <= toDate)
            .ToList();

        var requestRecords = _requests
            .Where(r => r.Timestamp >= from && r.Timestamp <= toDate)
            .ToList();

        // Calculate tool metrics by tool name
        var toolMetrics = toolRecords
            .GroupBy(r => r.ToolName)
            .ToDictionary(
                g => g.Key,
                g => new ToolMetrics
                {
                    ToolName = g.Key,
                    ExecutionCount = g.Count(),
                    SuccessCount = g.Count(r => r.Success),
                    FailureCount = g.Count(r => !r.Success),
                    AverageDurationMs = g.Average(r => r.DurationMs)
                });

        // Calculate provider metrics
        var providerMetrics = requestRecords
            .GroupBy(r => r.Provider)
            .ToDictionary(
                g => g.Key,
                g => new ProviderMetrics
                {
                    Provider = g.Key,
                    RequestCount = g.Count(),
                    ToolExecutions = g.Sum(r => r.ToolCallCount),
                    InputTokens = g.Sum(r => r.InputTokens),
                    OutputTokens = g.Sum(r => r.OutputTokens),
                    AverageLatencyMs = 0 // Would need latency tracking
                });

        return new AgentMetricsSummary
        {
            PeriodStart = from,
            PeriodEnd = toDate,
            TotalRequests = requestRecords.Count,
            TotalToolExecutions = toolRecords.Count,
            SuccessfulToolExecutions = toolRecords.Count(r => r.Success),
            FailedToolExecutions = toolRecords.Count(r => !r.Success),
            AverageToolDurationMs = toolRecords.Count > 0
                ? toolRecords.Average(r => r.DurationMs)
                : 0,
            TotalInputTokens = requestRecords.Sum(r => r.InputTokens),
            TotalOutputTokens = requestRecords.Sum(r => r.OutputTokens),
            ByProvider = providerMetrics,
            ByTool = toolMetrics
        };
    }

    /// <inheritdoc />
    public void Reset()
    {
        _toolExecutions.Clear();
        _requests.Clear();
    }

    private int _cleanupCounter = 0;
    private const int CleanupInterval = 100; // Cleanup every 100 records

    private void CleanupIfNeeded()
    {
        // Only cleanup periodically to avoid performance impact
        if (Interlocked.Increment(ref _cleanupCounter) % CleanupInterval != 0)
            return;

        var cutoff = DateTime.UtcNow - _retentionPeriod;

        // Remove old tool execution records
        while (_toolExecutions.TryPeek(out var oldest) && oldest.Timestamp < cutoff)
        {
            _toolExecutions.TryDequeue(out _);
        }

        // Remove old request records
        while (_requests.TryPeek(out var oldest) && oldest.Timestamp < cutoff)
        {
            _requests.TryDequeue(out _);
        }
    }
}
