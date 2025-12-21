using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Agents.Helpers;
using SecondBrain.Application.Services.Agents.Models;

namespace SecondBrain.Application.Services.Agents.Strategies;

/// <summary>
/// Base class for agent streaming strategies with common functionality.
/// </summary>
public abstract partial class BaseAgentStreamingStrategy : IAgentStreamingStrategy
{
    protected readonly IToolExecutor ToolExecutor;
    protected readonly IThinkingExtractor ThinkingExtractor;
    protected readonly IPluginToolBuilder ToolBuilder;
    protected readonly IAgentRetryPolicy? RetryPolicy;

    protected BaseAgentStreamingStrategy(
        IToolExecutor toolExecutor,
        IThinkingExtractor thinkingExtractor,
        IPluginToolBuilder toolBuilder,
        IAgentRetryPolicy? retryPolicy = null)
    {
        ToolExecutor = toolExecutor;
        ThinkingExtractor = thinkingExtractor;
        ToolBuilder = toolBuilder;
        RetryPolicy = retryPolicy;
    }

    /// <inheritdoc />
    public abstract IReadOnlyList<string> SupportedProviders { get; }

    /// <inheritdoc />
    public abstract bool CanHandle(AgentRequest request, AIProvidersSettings settings);

    /// <inheritdoc />
    public abstract IAsyncEnumerable<AgentStreamEvent> ProcessAsync(
        AgentStreamingContext context,
        CancellationToken cancellationToken = default);

    #region Event Helpers

    protected static AgentStreamEvent StatusEvent(string content) => new()
    {
        Type = AgentEventType.Status,
        Content = content
    };

    protected static AgentStreamEvent TokenEvent(string content) => new()
    {
        Type = AgentEventType.Token,
        Content = content
    };

    protected static AgentStreamEvent ErrorEvent(string content) => new()
    {
        Type = AgentEventType.Error,
        Content = content
    };

    protected static AgentStreamEvent EndEvent(string content) => new()
    {
        Type = AgentEventType.End,
        Content = content
    };

    /// <summary>
    /// Creates an end event with token usage information.
    /// </summary>
    protected static AgentStreamEvent EndEventWithTokens(
        string content,
        int? inputTokens = null,
        int? outputTokens = null,
        int? cachedTokens = null,
        int? reasoningTokens = null) => new()
    {
        Type = AgentEventType.End,
        Content = content,
        InputTokens = inputTokens,
        OutputTokens = outputTokens,
        CachedTokens = cachedTokens,
        ReasoningTokens = reasoningTokens,
        TotalTokens = (inputTokens ?? 0) + (outputTokens ?? 0) + (reasoningTokens ?? 0)
    };

    protected static AgentStreamEvent ThinkingEvent(string content) => new()
    {
        Type = AgentEventType.Thinking,
        Content = content
    };

    protected static AgentStreamEvent ToolCallStartEvent(string toolName, string toolId, string arguments) => new()
    {
        Type = AgentEventType.ToolCallStart,
        ToolName = toolName,
        ToolId = toolId,
        ToolArguments = arguments
    };

    protected static AgentStreamEvent ToolCallEndEvent(string toolName, string toolId, string result) => new()
    {
        Type = AgentEventType.ToolCallEnd,
        ToolName = toolName,
        ToolId = toolId,
        ToolResult = result
    };

    protected static AgentStreamEvent ContextRetrievalEvent(
        int noteCount,
        List<RetrievedNoteContext> notes,
        string? ragLogId) => new()
    {
        Type = AgentEventType.ContextRetrieval,
        Content = $"Found {noteCount} relevant note(s)",
        RetrievedNotes = notes,
        RagLogId = ragLogId
    };

    /// <summary>
    /// Creates a Grok search sources event for Live Search or DeepSearch results.
    /// </summary>
    protected static AgentStreamEvent GrokSearchEvent(List<Services.AI.Models.GrokSearchSource> sources) => new()
    {
        Type = AgentEventType.Grounding,
        Content = $"Found {sources.Count} search result(s)",
        GrokSearchSources = sources
    };

    /// <summary>
    /// Creates a reasoning step event for Grok Think Mode.
    /// </summary>
    protected static AgentStreamEvent GrokReasoningStepEvent(Services.AI.Models.GrokThinkingStep step) => new()
    {
        Type = AgentEventType.ReasoningStep,
        Content = step.Thought,
        GrokThinkingStep = step
    };

    #endregion

    #region Retry Helpers

    /// <summary>
    /// Wraps an async operation with retry policy if available.
    /// </summary>
    protected async Task<T> WithRetryAsync<T>(
        Func<Task<T>> operation,
        ILogger logger,
        string operationName,
        CancellationToken cancellationToken = default)
    {
        if (RetryPolicy == null)
        {
            return await operation();
        }

        try
        {
            return await RetryPolicy.ExecuteWithRetryAsync(operation, cancellationToken: cancellationToken);
        }
        catch (Exception ex) when (AgentRetryPolicy.IsRetriable(ex))
        {
            logger.LogError(ex, "Retriable operation '{Operation}' failed after all retries", operationName);
            throw;
        }
    }

    /// <summary>
    /// Wraps an async operation with retry policy if available (no return value).
    /// </summary>
    protected async Task WithRetryAsync(
        Func<Task> operation,
        ILogger logger,
        string operationName,
        CancellationToken cancellationToken = default)
    {
        if (RetryPolicy == null)
        {
            await operation();
            return;
        }

        try
        {
            await RetryPolicy.ExecuteWithRetryAsync(operation, cancellationToken: cancellationToken);
        }
        catch (Exception ex) when (AgentRetryPolicy.IsRetriable(ex))
        {
            logger.LogError(ex, "Retriable operation '{Operation}' failed after all retries", operationName);
            throw;
        }
    }

    /// <summary>
    /// Determines if an exception is retriable for error categorization.
    /// </summary>
    protected static bool IsRetriableError(Exception exception) => AgentRetryPolicy.IsRetriable(exception);

    /// <summary>
    /// Creates an appropriate error event based on exception type.
    /// </summary>
    protected static AgentStreamEvent CategorizedErrorEvent(Exception exception, string context)
    {
        var errorType = exception switch
        {
            RateLimitException => "rate_limit",
            TransientApiException => "transient",
            TimeoutException => "timeout",
            HttpRequestException httpEx when httpEx.Message.Contains("401") => "auth_error",
            HttpRequestException httpEx when httpEx.Message.Contains("403") => "forbidden",
            HttpRequestException httpEx when httpEx.Message.Contains("404") => "not_found",
            HttpRequestException => "http_error",
            TaskCanceledException => "cancelled",
            _ => "unknown"
        };

        var isRetriable = IsRetriableError(exception);

        return new AgentStreamEvent
        {
            Type = AgentEventType.Error,
            Content = $"[{errorType}] {context}: {exception.Message}",
            ToolName = isRetriable ? "retriable" : "non_retriable"
        };
    }

    #endregion


    #region Message Helpers

    protected static string? GetLastUserMessage(AgentRequest request)
    {
        return request.Messages
            .LastOrDefault(m => m.Role.Equals("user", StringComparison.OrdinalIgnoreCase))
            ?.Content;
    }

    /// <summary>
    /// Cleans up text content from AI responses for use as note content.
    /// </summary>
    protected static string CleanContentForNote(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var content = text;

        // Remove thinking blocks
        content = ThinkingBlockRegex().Replace(content, "");

        // Remove common conversational prefixes
        var prefixesToRemove = new[]
        {
            @"^I'll create (?:a|the) note.*?(?:\.|:)\s*",
            @"^(?:Here's|Here is) the note.*?(?:\.|:)\s*",
            @"^Creating (?:a|the) note.*?(?:\.|:)\s*",
            @"^Let me create.*?(?:\.|:)\s*",
            @"^I'm creating.*?(?:\.|:)\s*",
        };

        foreach (var prefix in prefixesToRemove)
        {
            content = Regex.Replace(content, prefix, "", RegexOptions.IgnoreCase);
        }

        return content.Trim();
    }

    [GeneratedRegex(@"<think(?:ing)?>(.*?)</think(?:ing)?>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex ThinkingBlockRegex();

    #endregion
}
