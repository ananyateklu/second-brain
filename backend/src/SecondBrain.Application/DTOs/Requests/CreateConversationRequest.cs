namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for creating a new conversation
/// </summary>
public class CreateConversationRequest
{
    public string? Title { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public bool RagEnabled { get; set; } = false;
    public bool AgentEnabled { get; set; } = false;
    public bool AgentRagEnabled { get; set; } = false;
    public bool ImageGenerationEnabled { get; set; } = false;
    public string? AgentCapabilities { get; set; }
    public string? VectorStoreProvider { get; set; }

    /// <summary>
    /// Enable Google Search grounding by default for this conversation (Gemini only).
    /// Individual messages can override this setting.
    /// </summary>
    public bool GroundingEnabled { get; set; } = false;

    /// <summary>
    /// Enable Python code execution by default for this conversation (Gemini only).
    /// Individual messages can override this setting.
    /// </summary>
    public bool CodeExecutionEnabled { get; set; } = false;

    /// <summary>
    /// Enable thinking mode by default for this conversation (Gemini 2.0+ only).
    /// Individual messages can override this setting.
    /// </summary>
    public bool ThinkingEnabled { get; set; } = false;
}

