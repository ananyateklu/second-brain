namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for updating conversation settings
/// </summary>
public class UpdateConversationSettingsRequest
{
    public bool? RagEnabled { get; set; }
    public string? VectorStoreProvider { get; set; }
    public bool? AgentEnabled { get; set; }
    public string? AgentCapabilities { get; set; }
}

