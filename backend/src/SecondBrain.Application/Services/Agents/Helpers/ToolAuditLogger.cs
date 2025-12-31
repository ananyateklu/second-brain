using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace SecondBrain.Application.Services.Agents.Helpers;

/// <summary>
/// Structured audit logger for tool executions.
/// Uses Microsoft.Extensions.Logging with structured logging for easy querying.
/// </summary>
public class ToolAuditLogger : IToolAuditLogger
{
    private readonly ILogger<ToolAuditLogger> _logger;
    private const int MaxResultSummaryLength = 500;

    public ToolAuditLogger(ILogger<ToolAuditLogger> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public void Log(ToolExecutionAudit audit)
    {
        if (audit.Success)
        {
            _logger.LogInformation(
                "Tool execution completed. " +
                "RequestId={RequestId} UserId={UserId} Tool={ToolName} Plugin={PluginName} " +
                "DurationMs={DurationMs} Success={Success} Sequence={Sequence} Parallel={Parallel}",
                audit.RequestId,
                audit.UserId,
                audit.ToolName,
                audit.PluginName,
                audit.DurationMs,
                audit.Success,
                audit.ToolCallSequence,
                audit.WasParallelExecution);

            // Log detailed audit at Debug level to avoid flooding logs
            _logger.LogDebug(
                "Tool execution details. " +
                "RequestId={RequestId} Tool={ToolName} Arguments={Arguments} ResultSummary={ResultSummary}",
                audit.RequestId,
                audit.ToolName,
                audit.Arguments,
                audit.ResultSummary);
        }
        else
        {
            _logger.LogWarning(
                "Tool execution failed. " +
                "RequestId={RequestId} UserId={UserId} Tool={ToolName} Plugin={PluginName} " +
                "DurationMs={DurationMs} Error={ErrorMessage}",
                audit.RequestId,
                audit.UserId,
                audit.ToolName,
                audit.PluginName,
                audit.DurationMs,
                audit.ErrorMessage);

            _logger.LogDebug(
                "Failed tool execution details. " +
                "RequestId={RequestId} Tool={ToolName} Arguments={Arguments}",
                audit.RequestId,
                audit.ToolName,
                audit.Arguments);
        }
    }

    /// <inheritdoc />
    public Task LogAsync(ToolExecutionAudit audit, CancellationToken cancellationToken = default)
    {
        // For now, synchronous logging is sufficient.
        // This method exists to support future persistent storage (database, external service).
        Log(audit);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public void LogToolStart(string requestId, string toolName, string arguments)
    {
        _logger.LogDebug(
            "Tool execution starting. RequestId={RequestId} Tool={ToolName} Arguments={Arguments}",
            requestId,
            toolName,
            TruncateForLogging(arguments, MaxResultSummaryLength));
    }

    /// <inheritdoc />
    public void LogBatch(IEnumerable<ToolExecutionAudit> audits)
    {
        var auditList = audits.ToList();
        if (auditList.Count == 0) return;

        var firstAudit = auditList[0];
        var successCount = auditList.Count(a => a.Success);
        var failCount = auditList.Count - successCount;
        var totalDuration = auditList.Sum(a => a.DurationMs);
        var toolNames = string.Join(", ", auditList.Select(a => a.ToolName).Distinct());

        _logger.LogInformation(
            "Batch tool execution completed. " +
            "RequestId={RequestId} UserId={UserId} ToolCount={ToolCount} " +
            "SuccessCount={SuccessCount} FailCount={FailCount} TotalDurationMs={TotalDurationMs} " +
            "Tools={Tools}",
            firstAudit.RequestId,
            firstAudit.UserId,
            auditList.Count,
            successCount,
            failCount,
            totalDuration,
            toolNames);

        // Log individual audits at debug level
        foreach (var audit in auditList)
        {
            Log(audit);
        }
    }

    /// <summary>
    /// Creates a result summary from a full result, truncating if necessary.
    /// </summary>
    public static string CreateResultSummary(string? fullResult, int maxLength = MaxResultSummaryLength)
    {
        if (string.IsNullOrEmpty(fullResult))
            return string.Empty;

        return TruncateForLogging(fullResult, maxLength);
    }

    /// <summary>
    /// Creates a ToolExecutionAudit from execution context.
    /// </summary>
    public static ToolExecutionAudit CreateAudit(
        string requestId,
        string userId,
        string toolName,
        string pluginName,
        string arguments,
        string result,
        bool success,
        long durationMs,
        DateTime startedAt,
        string? conversationId = null,
        string? provider = null,
        string? model = null,
        int toolCallSequence = 1,
        bool wasParallelExecution = false,
        string? errorMessage = null)
    {
        return new ToolExecutionAudit
        {
            RequestId = requestId,
            UserId = userId,
            ConversationId = conversationId,
            ToolName = toolName,
            PluginName = pluginName,
            Arguments = arguments,
            ResultSummary = CreateResultSummary(result),
            FullResult = result,
            Success = success,
            ErrorMessage = success ? null : (errorMessage ?? result),
            DurationMs = durationMs,
            StartedAt = startedAt,
            CompletedAt = startedAt.AddMilliseconds(durationMs),
            Provider = provider,
            Model = model,
            ToolCallSequence = toolCallSequence,
            WasParallelExecution = wasParallelExecution
        };
    }

    private static string TruncateForLogging(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= maxLength)
            return value;

        return value.Substring(0, maxLength - 3) + "...";
    }
}
