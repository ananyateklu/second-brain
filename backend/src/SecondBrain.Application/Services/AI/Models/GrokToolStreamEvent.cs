namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Event types for Grok/X.AI tool-enabled streaming
/// </summary>
public enum GrokToolStreamEventType
{
    /// <summary>Text content from the model</summary>
    Text,

    /// <summary>Function/tool calls requested by the model</summary>
    ToolCalls,

    /// <summary>Reasoning/thinking content (for Think Mode)</summary>
    Reasoning,

    /// <summary>Search started (for Live Search)</summary>
    SearchStart,

    /// <summary>Search result received</summary>
    SearchResult,

    /// <summary>Deep search progress update</summary>
    DeepSearchProgress,

    /// <summary>Stream completed</summary>
    Done,

    /// <summary>Error occurred</summary>
    Error
}

/// <summary>
/// Represents a streaming event from Grok/X.AI with tool support
/// </summary>
public class GrokToolStreamEvent
{
    /// <summary>
    /// The type of event
    /// </summary>
    public GrokToolStreamEventType Type { get; set; }

    /// <summary>
    /// Text content (for Text and Reasoning events)
    /// </summary>
    public string? Text { get; set; }

    /// <summary>
    /// Tool calls requested by the model
    /// </summary>
    public List<GrokToolCallInfo>? ToolCalls { get; set; }

    /// <summary>
    /// Search sources (for search-related events)
    /// </summary>
    public List<GrokSearchSource>? SearchSources { get; set; }

    /// <summary>
    /// Thinking step (for Think Mode)
    /// </summary>
    public GrokThinkingStep? ThinkingStep { get; set; }

    /// <summary>
    /// Error message (for Error events)
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Token usage information (available on completion)
    /// </summary>
    public GrokTokenUsage? Usage { get; set; }
}

/// <summary>
/// Information about a tool call from Grok
/// </summary>
public class GrokToolCallInfo
{
    /// <summary>
    /// The unique ID of the tool call (required for tool results)
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// The name of the function to call
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The arguments as a JSON string
    /// </summary>
    public string Arguments { get; set; } = "{}";
}

/// <summary>
/// Token usage information from Grok
/// </summary>
public class GrokTokenUsage
{
    /// <summary>
    /// Number of tokens in the prompt
    /// </summary>
    public int PromptTokens { get; set; }

    /// <summary>
    /// Number of tokens in the completion
    /// </summary>
    public int CompletionTokens { get; set; }

    /// <summary>
    /// Number of tokens used for reasoning (Think Mode)
    /// </summary>
    public int ReasoningTokens { get; set; }

    /// <summary>
    /// Total tokens used
    /// </summary>
    public int TotalTokens => PromptTokens + CompletionTokens + ReasoningTokens;
}

/// <summary>
/// Represents a search source from Grok Live Search or DeepSearch
/// </summary>
public class GrokSearchSource
{
    /// <summary>
    /// URL of the source
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Title of the source
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Snippet or excerpt from the source
    /// </summary>
    public string Snippet { get; set; } = string.Empty;

    /// <summary>
    /// Type of source (web, x_post, news)
    /// </summary>
    public string SourceType { get; set; } = "web";

    /// <summary>
    /// When the content was published
    /// </summary>
    public DateTime? PublishedAt { get; set; }

    /// <summary>
    /// Relevance score (0-1)
    /// </summary>
    public float? RelevanceScore { get; set; }
}

/// <summary>
/// Represents a thinking step from Grok Think Mode
/// </summary>
public class GrokThinkingStep
{
    /// <summary>
    /// Step number in the reasoning process
    /// </summary>
    public int StepNumber { get; set; }

    /// <summary>
    /// The thought or reasoning content
    /// </summary>
    public string Thought { get; set; } = string.Empty;

    /// <summary>
    /// Optional conclusion for this step
    /// </summary>
    public string? Conclusion { get; set; }
}
