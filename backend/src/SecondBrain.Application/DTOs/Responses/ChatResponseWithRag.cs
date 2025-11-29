using SecondBrain.Core.Entities;

namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model for chat messages that includes RAG context
/// </summary>
public class ChatResponseWithRag
{
    public ChatConversation Conversation { get; set; } = null!;
    public List<RagContextResponse> RetrievedNotes { get; set; } = new();
}

