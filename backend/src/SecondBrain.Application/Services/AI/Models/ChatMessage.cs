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

/// <summary>
/// Document content for PDF processing (Claude only)
/// </summary>
public class MessageDocument
{
    /// <summary>
    /// Base64-encoded document data (without data URL prefix)
    /// </summary>
    public string Base64Data { get; set; } = string.Empty;

    /// <summary>
    /// MIME type of the document (e.g., 'application/pdf')
    /// </summary>
    public string MediaType { get; set; } = "application/pdf";

    /// <summary>
    /// Original filename (optional)
    /// </summary>
    public string? FileName { get; set; }

    /// <summary>
    /// Document type: "pdf" (more types may be added in future)
    /// </summary>
    public string Type { get; set; } = "pdf";
}

public class ChatMessage
{
    public string Role { get; set; } = string.Empty; // "user", "assistant", "system"
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Attached images for multimodal messages
    /// </summary>
    public List<MessageImage>? Images { get; set; }

    /// <summary>
    /// Attached documents (PDFs) for document processing (Claude only)
    /// </summary>
    public List<MessageDocument>? Documents { get; set; }
}
