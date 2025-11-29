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
}

