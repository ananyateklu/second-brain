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
    public string? AgentCapabilities { get; set; }
    public string? VectorStoreProvider { get; set; }
}

