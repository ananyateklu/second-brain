using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.Services.Agents.Models;

public class AgentRequest
{
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public List<AgentMessage> Messages { get; set; } = new();
    public string UserId { get; set; } = string.Empty;
    public float? Temperature { get; set; }
    public int? MaxTokens { get; set; }

    /// <summary>
    /// List of capability IDs to enable for this request (e.g., ["notes", "web"]).
    /// If empty or null, the agent runs as a general assistant without tools.
    /// </summary>
    public List<string>? Capabilities { get; set; }

    /// <summary>
    /// Whether to automatically retrieve RAG context before responding.
    /// When true, the agent searches notes for relevant context automatically.
    /// When false (default), the agent uses search tools explicitly when needed.
    /// </summary>
    public bool AgentRagEnabled { get; set; } = false;

    /// <summary>
    /// Optional override for Ollama base URL (for remote Ollama support)
    /// </summary>
    public string? OllamaBaseUrl { get; set; }

    /// <summary>
    /// Enable extended thinking for complex reasoning (Claude 3.5+ models)
    /// </summary>
    public bool? EnableThinking { get; set; }

    /// <summary>
    /// Token budget for thinking process (min: 1024, default: 10000)
    /// </summary>
    public int? ThinkingBudget { get; set; }

    /// <summary>
    /// Reasoning effort level for Claude Opus 4.5 and Grok Think Mode.
    /// Values: "low", "medium", "high"
    /// </summary>
    public string? ReasoningEffort { get; set; }

    /// <summary>
    /// Enable Think Mode for Grok models (extended reasoning).
    /// When enabled, the model will perform step-by-step reasoning.
    /// </summary>
    public bool? EnableThinkMode { get; set; }

    /// <summary>
    /// File references for Gemini code execution or multimodal analysis.
    /// Files must be uploaded first via the file upload API.
    /// </summary>
    public List<GeminiFileReference>? FileReferences { get; set; }

    /// <summary>
    /// Enable code execution for Gemini models.
    /// When true, Gemini can run Python code in a secure sandbox.
    /// </summary>
    public bool EnableCodeExecution { get; set; }
}

/// <summary>
/// Represents an available agent capability
/// </summary>
public class AgentCapability
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class AgentMessage
{
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    /// <summary>
    /// Tool calls made by the assistant in this message turn
    /// </summary>
    public List<ToolCallInfo>? ToolCalls { get; set; }
}

public class ToolCallInfo
{
    public string ToolName { get; set; } = string.Empty;
    public string Arguments { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
}

public class AgentStreamEvent
{
    public AgentEventType Type { get; set; }
    public string? Content { get; set; }
    public string? ToolName { get; set; }
    public string? ToolId { get; set; }
    public string? ToolArguments { get; set; }
    public string? ToolResult { get; set; }

    /// <summary>
    /// Retrieved notes from automatic context injection (for ContextRetrieval events)
    /// </summary>
    public List<RetrievedNoteContext>? RetrievedNotes { get; set; }

    /// <summary>
    /// RAG query log ID for feedback submission (for ContextRetrieval events)
    /// </summary>
    public string? RagLogId { get; set; }

    /// <summary>
    /// Grounding sources from Google Search (Gemini only, for Grounding events)
    /// </summary>
    public List<GroundingSource>? GroundingSources { get; set; }

    /// <summary>
    /// Code execution result from Python sandbox (Gemini only, for CodeExecution events)
    /// </summary>
    public CodeExecutionResult? CodeExecutionResult { get; set; }

    #region Token Usage (for End events)

    /// <summary>
    /// Number of input/prompt tokens used (available on End events)
    /// </summary>
    public int? InputTokens { get; set; }

    /// <summary>
    /// Number of output/completion tokens generated (available on End events)
    /// </summary>
    public int? OutputTokens { get; set; }

    /// <summary>
    /// Number of tokens used from prompt cache (Anthropic, Gemini)
    /// </summary>
    public int? CachedTokens { get; set; }

    /// <summary>
    /// Number of tokens used for reasoning/thinking (Claude, Grok Think Mode)
    /// </summary>
    public int? ReasoningTokens { get; set; }

    /// <summary>
    /// Total tokens used (InputTokens + OutputTokens + ReasoningTokens)
    /// </summary>
    public int? TotalTokens { get; set; }

    #endregion

    #region Grok-specific fields

    /// <summary>
    /// Search sources from Grok Live Search or DeepSearch (for Grounding events)
    /// </summary>
    public List<GrokSearchSource>? GrokSearchSources { get; set; }

    /// <summary>
    /// Thinking steps from Grok Think Mode (for Thinking events)
    /// </summary>
    public GrokThinkingStep? GrokThinkingStep { get; set; }

    #endregion
}

/// <summary>
/// Represents a note retrieved via automatic context injection
/// </summary>
public class RetrievedNoteContext
{
    public string NoteId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Preview { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public float SimilarityScore { get; set; }

    /// <summary>
    /// The full chunk content that was matched by RAG search.
    /// This contains the actual relevant content (not truncated).
    /// </summary>
    public string? ChunkContent { get; set; }
}

public enum AgentEventType
{
    Token,
    ToolCallStart,
    ToolCallEnd,
    Thinking,
    Status,
    Error,
    End,
    /// <summary>
    /// Automatic context retrieval from semantic search (shows "Searching your notes...")
    /// </summary>
    ContextRetrieval,
    /// <summary>
    /// Grounding sources from Google Search (Gemini) or X/Web search (Grok)
    /// </summary>
    Grounding,
    /// <summary>
    /// Code execution result from Python sandbox (Gemini only)
    /// </summary>
    CodeExecution,
    /// <summary>
    /// Token usage information (emitted with End or as separate event)
    /// </summary>
    TokenUsage,
    /// <summary>
    /// Reasoning/thinking step from Grok Think Mode or Claude extended thinking
    /// </summary>
    ReasoningStep
}

public class ToolExecutionResult
{
    public string ToolName { get; set; } = string.Empty;
    public string Arguments { get; set; } = string.Empty;
    public string Result { get; set; } = string.Empty;
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
    public bool Success { get; set; } = true;
}

public class AgentResponse
{
    public string Content { get; set; } = string.Empty;
    public List<ToolExecutionResult> ToolCalls { get; set; } = new();
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
}
