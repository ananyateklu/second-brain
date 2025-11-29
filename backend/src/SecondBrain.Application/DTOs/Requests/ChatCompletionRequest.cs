using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for chat completion
/// </summary>
public class ChatCompletionRequest
{
    public IEnumerable<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
    public AIRequest? Settings { get; set; }
}

