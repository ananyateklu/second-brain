namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Event types for OpenAI tool-enabled streaming
/// </summary>
public enum OpenAIToolStreamEventType
{
    /// <summary>Text content from the model</summary>
    Text,

    /// <summary>Function/tool calls requested by the model</summary>
    ToolCalls,

    /// <summary>Reasoning content (for o1/o3 models)</summary>
    Reasoning,

    /// <summary>Stream completed</summary>
    Done,

    /// <summary>Error occurred</summary>
    Error
}

/// <summary>
/// Represents a streaming event from OpenAI with tool support
/// </summary>
public class OpenAIToolStreamEvent
{
    /// <summary>
    /// The type of event
    /// </summary>
    public OpenAIToolStreamEventType Type { get; set; }

    /// <summary>
    /// Text content (for Text and Reasoning events)
    /// </summary>
    public string? Text { get; set; }

    /// <summary>
    /// Tool calls requested by the model
    /// </summary>
    public List<OpenAIToolCallInfo>? ToolCalls { get; set; }

    /// <summary>
    /// Error message (for Error events)
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Token usage information (available on completion)
    /// </summary>
    public OpenAITokenUsage? Usage { get; set; }
}

/// <summary>
/// Information about a tool call from OpenAI
/// </summary>
public class OpenAIToolCallInfo
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
/// Token usage information from OpenAI
/// </summary>
public class OpenAITokenUsage
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
    /// Total tokens used
    /// </summary>
    public int TotalTokens => PromptTokens + CompletionTokens;
}
