namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Event types for Ollama tool-enabled streaming
/// </summary>
public enum OllamaToolStreamEventType
{
    /// <summary>Text content from the model</summary>
    Text,

    /// <summary>Function/tool calls requested by the model</summary>
    ToolCalls,

    /// <summary>Thinking/reasoning content (if model supports it)</summary>
    Thinking,

    /// <summary>Stream completed</summary>
    Done,

    /// <summary>Error occurred</summary>
    Error
}

/// <summary>
/// Represents a streaming event from Ollama with tool support
/// </summary>
public class OllamaToolStreamEvent
{
    /// <summary>
    /// The type of event
    /// </summary>
    public OllamaToolStreamEventType Type { get; set; }

    /// <summary>
    /// Text content (for Text and Thinking events)
    /// </summary>
    public string? Text { get; set; }

    /// <summary>
    /// Tool calls requested by the model
    /// </summary>
    public List<OllamaToolCallInfo>? ToolCalls { get; set; }

    /// <summary>
    /// Error message (for Error events)
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Token usage information (available on completion)
    /// </summary>
    public OllamaTokenUsage? Usage { get; set; }
}

/// <summary>
/// Information about a tool call from Ollama
/// </summary>
public class OllamaToolCallInfo
{
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
/// Token usage information from Ollama
/// </summary>
public class OllamaTokenUsage
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

/// <summary>
/// Progress information for model creation operations
/// </summary>
public class OllamaCreateProgress
{
    /// <summary>
    /// Current status message
    /// </summary>
    public string Status { get; set; } = string.Empty;
}
