namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Options for Grok Think Mode (extended reasoning)
/// </summary>
public class GrokThinkModeOptions
{
    /// <summary>
    /// Whether think mode is enabled
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Effort level for thinking: low, medium, high
    /// </summary>
    public string Effort { get; set; } = "medium";

    /// <summary>
    /// Whether to include reasoning process in response
    /// </summary>
    public bool IncludeReasoningInResponse { get; set; }
}

/// <summary>
/// Response from Grok Think Mode
/// </summary>
public class GrokThinkModeResponse
{
    /// <summary>
    /// Whether the request was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The final response content
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// The reasoning/thinking process (if included)
    /// </summary>
    public string? ReasoningContent { get; set; }

    /// <summary>
    /// Individual thinking steps
    /// </summary>
    public List<GrokThinkingStep>? ThinkingSteps { get; set; }

    /// <summary>
    /// Time spent on reasoning in milliseconds
    /// </summary>
    public int? ReasoningTimeMs { get; set; }

    /// <summary>
    /// Token usage
    /// </summary>
    public GrokTokenUsage? Usage { get; set; }

    /// <summary>
    /// Error message if failed
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Model used
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// Provider name
    /// </summary>
    public string Provider { get; set; } = "Grok";
}

/// <summary>
/// Request body for Grok Think Mode API
/// </summary>
public class GrokThinkModeRequest
{
    /// <summary>
    /// Model to use
    /// </summary>
    public string Model { get; set; } = "grok-3";

    /// <summary>
    /// Chat messages
    /// </summary>
    public List<GrokMessageRequest> Messages { get; set; } = new();

    /// <summary>
    /// Reasoning configuration
    /// </summary>
    public GrokReasoningConfig? Reasoning { get; set; }

    /// <summary>
    /// Maximum tokens for output
    /// </summary>
    public int? MaxTokens { get; set; }

    /// <summary>
    /// Temperature for generation
    /// </summary>
    public float? Temperature { get; set; }

    /// <summary>
    /// Whether to stream the response
    /// </summary>
    public bool Stream { get; set; }
}

/// <summary>
/// Message in Grok API format
/// </summary>
public class GrokMessageRequest
{
    /// <summary>
    /// Role: user, assistant, system
    /// </summary>
    public string Role { get; set; } = "user";

    /// <summary>
    /// Message content
    /// </summary>
    public string Content { get; set; } = string.Empty;
}

/// <summary>
/// Reasoning configuration for Think Mode
/// </summary>
public class GrokReasoningConfig
{
    /// <summary>
    /// Whether reasoning is enabled
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Effort level: low, medium, high
    /// </summary>
    public string Effort { get; set; } = "medium";
}

/// <summary>
/// Live Search options for Grok
/// </summary>
public class GrokLiveSearchOptions
{
    /// <summary>
    /// Search mode: auto, on, off
    /// </summary>
    public string Mode { get; set; } = "auto";

    /// <summary>
    /// Sources to search: web, x
    /// </summary>
    public List<string> Sources { get; set; } = new() { "web", "x" };

    /// <summary>
    /// Recency filter: hour, day, week, month
    /// </summary>
    public string Recency { get; set; } = "day";

    /// <summary>
    /// Maximum number of results
    /// </summary>
    public int MaxResults { get; set; } = 10;
}

/// <summary>
/// DeepSearch options for comprehensive research
/// </summary>
public class GrokDeepSearchOptions
{
    /// <summary>
    /// Whether DeepSearch is enabled
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Maximum sources to search
    /// </summary>
    public int MaxSources { get; set; } = 20;

    /// <summary>
    /// Maximum time for search in seconds
    /// </summary>
    public int MaxTimeSeconds { get; set; } = 120;

    /// <summary>
    /// Focus areas for the search
    /// </summary>
    public List<string>? FocusAreas { get; set; }
}

/// <summary>
/// DeepSearch response
/// </summary>
public class GrokDeepSearchResponse
{
    /// <summary>
    /// Summary of findings
    /// </summary>
    public string Summary { get; set; } = string.Empty;

    /// <summary>
    /// Sources found
    /// </summary>
    public List<GrokSearchSource> Sources { get; set; } = new();

    /// <summary>
    /// Key findings organized by topic
    /// </summary>
    public Dictionary<string, string> KeyFindings { get; set; } = new();

    /// <summary>
    /// Analysis of the findings
    /// </summary>
    public string Analysis { get; set; } = string.Empty;
}
