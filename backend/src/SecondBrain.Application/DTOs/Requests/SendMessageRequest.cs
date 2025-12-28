using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for sending a message in a conversation
/// </summary>
public class SendMessageRequest
{
    public string Content { get; set; } = string.Empty;
    public double? Temperature { get; set; }
    public int? MaxTokens { get; set; }
    public bool UseRag { get; set; }
    public string? VectorStoreProvider { get; set; }

    /// <summary>
    /// Attached images for multimodal messages
    /// </summary>
    public List<MessageImage>? Images { get; set; }

    /// <summary>
    /// Enable Google Search grounding for this message (Gemini only).
    /// When enabled, the model will use real-time web search to ground responses.
    /// </summary>
    public bool? EnableGrounding { get; set; }

    /// <summary>
    /// Enable Python code execution for this message (Gemini only).
    /// When enabled, the model can write and execute Python code in a secure sandbox.
    /// </summary>
    public bool? EnableCodeExecution { get; set; }

    /// <summary>
    /// Enable thinking mode for extended reasoning (Gemini 2.0+ only).
    /// When enabled, the model will show its reasoning process.
    /// </summary>
    public bool? EnableThinking { get; set; }

    /// <summary>
    /// Token budget for thinking process (Gemini only).
    /// Only applies when EnableThinking is true.
    /// </summary>
    public int? ThinkingBudget { get; set; }

    /// <summary>
    /// Markdown renderer preference used to display the response ('custom' or 'llm-ui').
    /// Tracked per message for historical analytics.
    /// </summary>
    public string? MarkdownRenderer { get; set; }
}

