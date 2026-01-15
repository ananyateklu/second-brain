namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for updating conversation settings
/// </summary>
public class UpdateConversationSettingsRequest
{
    /// <summary>
    /// Update conversation title
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Update AI provider (e.g., "OpenAI", "Anthropic", "Google")
    /// </summary>
    public string? Provider { get; set; }

    /// <summary>
    /// Update AI model (e.g., "gpt-4o", "claude-sonnet-4-20250514")
    /// </summary>
    public string? Model { get; set; }

    public bool? RagEnabled { get; set; }
    public string? VectorStoreProvider { get; set; }
    public bool? AgentEnabled { get; set; }
    public bool? AgentRagEnabled { get; set; }
    public string? AgentCapabilities { get; set; }
}

