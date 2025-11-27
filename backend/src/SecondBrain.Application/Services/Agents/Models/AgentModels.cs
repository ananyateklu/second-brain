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
    /// Optional override for Ollama base URL (for remote Ollama support)
    /// </summary>
    public string? OllamaBaseUrl { get; set; }
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
    public string? ToolArguments { get; set; }
    public string? ToolResult { get; set; }
}

public enum AgentEventType
{
    Token,
    ToolCallStart,
    ToolCallEnd,
    Thinking,
    Error,
    End
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
