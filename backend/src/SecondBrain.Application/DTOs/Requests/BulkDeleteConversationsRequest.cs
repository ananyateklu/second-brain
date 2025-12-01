namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for bulk deleting conversations
/// </summary>
public class BulkDeleteConversationsRequest
{
    /// <summary>
    /// List of conversation IDs to delete
    /// </summary>
    public List<string> ConversationIds { get; set; } = new();
}

