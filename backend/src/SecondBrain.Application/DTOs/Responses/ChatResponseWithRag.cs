using SecondBrain.Core.Entities;

namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model for chat messages that includes RAG context
/// </summary>
public class ChatResponseWithRag
{
    public ChatConversation Conversation { get; set; } = null!;
    public List<RagContextResponse> RetrievedNotes { get; set; } = new();
    
    /// <summary>
    /// The RAG query log ID for feedback submission.
    /// Use this to submit thumbs up/down feedback via the /api/rag/analytics/feedback endpoint.
    /// </summary>
    public string? RagLogId { get; set; }
}

