namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Represents token usage information that can be captured during or after streaming.
/// This is a shared model used across all providers.
/// </summary>
public class StreamingTokenUsage
{
    /// <summary>
    /// Tokens used for the input/prompt
    /// </summary>
    public int InputTokens { get; set; }

    /// <summary>
    /// Tokens used for the output/completion
    /// </summary>
    public int OutputTokens { get; set; }

    /// <summary>
    /// Total tokens (input + output)
    /// </summary>
    public int TotalTokens => InputTokens + OutputTokens;

    /// <summary>
    /// Whether these are actual provider-reported tokens (true) or estimates (false)
    /// </summary>
    public bool IsActual { get; set; } = true;

    /// <summary>
    /// Tokens used for reasoning/thinking (for extended thinking models)
    /// </summary>
    public int? ReasoningTokens { get; set; }

    /// <summary>
    /// Tokens used to create prompt cache (Claude)
    /// </summary>
    public int? CacheCreationTokens { get; set; }

    /// <summary>
    /// Tokens read from prompt cache (Claude)
    /// </summary>
    public int? CacheReadTokens { get; set; }

    /// <summary>
    /// Provider name for context
    /// </summary>
    public string? Provider { get; set; }

    /// <summary>
    /// Model name used
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Convert to TokenUsageDetails for persistence
    /// </summary>
    public TokenUsageDetails ToDetails()
    {
        var details = new TokenUsageDetails
        {
            InputTokens = InputTokens,
            OutputTokens = OutputTokens,
            IsActual = IsActual,
            ReasoningTokens = ReasoningTokens
        };

        if (CacheCreationTokens.HasValue || CacheReadTokens.HasValue)
        {
            details.CacheUsage = new CacheTokenUsage
            {
                CacheCreationTokens = CacheCreationTokens ?? 0,
                CacheReadTokens = CacheReadTokens ?? 0
            };
        }

        return details;
    }

    /// <summary>
    /// Create from estimated token counts
    /// </summary>
    public static StreamingTokenUsage CreateEstimated(int inputTokens, int outputTokens, string? provider = null, string? model = null)
    {
        return new StreamingTokenUsage
        {
            InputTokens = inputTokens,
            OutputTokens = outputTokens,
            IsActual = false,
            Provider = provider,
            Model = model
        };
    }

    /// <summary>
    /// Create from actual provider token counts
    /// </summary>
    public static StreamingTokenUsage CreateActual(int inputTokens, int outputTokens, string? provider = null, string? model = null)
    {
        return new StreamingTokenUsage
        {
            InputTokens = inputTokens,
            OutputTokens = outputTokens,
            IsActual = true,
            Provider = provider,
            Model = model
        };
    }
}

/// <summary>
/// Result of a streaming operation including the full response and token usage
/// </summary>
public class StreamingResult
{
    /// <summary>
    /// The complete response content
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Token usage information
    /// </summary>
    public StreamingTokenUsage? Usage { get; set; }

    /// <summary>
    /// Duration of the streaming operation in milliseconds
    /// </summary>
    public double DurationMs { get; set; }

    /// <summary>
    /// Whether the streaming completed successfully
    /// </summary>
    public bool Success { get; set; } = true;

    /// <summary>
    /// Error message if streaming failed
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Thinking/reasoning content (for extended thinking models)
    /// </summary>
    public string? ThinkingContent { get; set; }
}
