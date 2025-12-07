namespace SecondBrain.Application.Services.AI.Models;

public class AIResponse
{
    public string Content { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int TokensUsed { get; set; }
    public string Provider { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? Error { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Grounding sources from Google Search (Gemini only)
    /// </summary>
    public List<GroundingSource>? GroundingSources { get; set; }

    /// <summary>
    /// Code execution result from Python sandbox (Gemini only)
    /// </summary>
    public CodeExecutionResult? CodeExecutionResult { get; set; }

    /// <summary>
    /// Extended thinking/reasoning process (Gemini 2.0+ thinking mode, Claude extended thinking)
    /// </summary>
    public string? ThinkingProcess { get; set; }

    /// <summary>
    /// Function calls requested by the model (for agent/tool use)
    /// </summary>
    public List<FunctionCallInfo>? FunctionCalls { get; set; }

    /// <summary>
    /// Citations from source documents (Claude only, when documents are provided)
    /// </summary>
    public List<Citation>? Citations { get; set; }

    /// <summary>
    /// Cache statistics for prompt caching (Claude only)
    /// </summary>
    public CacheUsageStats? CacheUsage { get; set; }
}

/// <summary>
/// Statistics about prompt cache usage (Claude only)
/// </summary>
public class CacheUsageStats
{
    /// <summary>
    /// Tokens used to create the cache
    /// </summary>
    public int CacheCreationTokens { get; set; }

    /// <summary>
    /// Tokens read from cache (saved from re-processing)
    /// </summary>
    public int CacheReadTokens { get; set; }

    /// <summary>
    /// Estimated cost savings percentage from caching
    /// </summary>
    public decimal SavingsPercent => CacheReadTokens > 0 && (CacheCreationTokens + CacheReadTokens) > 0
        ? Math.Round((decimal)CacheReadTokens / (CacheCreationTokens + CacheReadTokens) * 100, 2)
        : 0;
}

/// <summary>
/// Represents a grounding source from Google Search
/// </summary>
public class GroundingSource
{
    /// <summary>
    /// URL of the source
    /// </summary>
    public string Uri { get; set; } = string.Empty;

    /// <summary>
    /// Title of the source page
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Relevant snippet from the source
    /// </summary>
    public string? Snippet { get; set; }
}

/// <summary>
/// Result of code execution in Gemini's Python sandbox
/// </summary>
public class CodeExecutionResult
{
    /// <summary>
    /// The executed code
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Programming language (typically "python")
    /// </summary>
    public string Language { get; set; } = "python";

    /// <summary>
    /// Output from code execution
    /// </summary>
    public string Output { get; set; } = string.Empty;

    /// <summary>
    /// Whether execution completed successfully
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if execution failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Information about a function call requested by the model
/// </summary>
public class FunctionCallInfo
{
    /// <summary>
    /// Name of the function to call
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Arguments as JSON string
    /// </summary>
    public string Arguments { get; set; } = "{}";

    /// <summary>
    /// Unique ID for this function call (for matching with results)
    /// </summary>
    public string? Id { get; set; }
}
