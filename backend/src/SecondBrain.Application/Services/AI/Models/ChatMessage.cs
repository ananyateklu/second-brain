namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Image content for multimodal messages
/// </summary>
public class MessageImage
{
    /// <summary>
    /// Base64-encoded image data (without data URL prefix)
    /// </summary>
    public string Base64Data { get; set; } = string.Empty;

    /// <summary>
    /// MIME type of the image (e.g., 'image/jpeg', 'image/png')
    /// </summary>
    public string MediaType { get; set; } = "image/jpeg";

    /// <summary>
    /// Original filename (optional)
    /// </summary>
    public string? FileName { get; set; }
}

public class ChatMessage
{
    public string Role { get; set; } = string.Empty; // "user", "assistant", "system"
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Attached images for multimodal messages
    /// </summary>
    public List<MessageImage>? Images { get; set; }
}
