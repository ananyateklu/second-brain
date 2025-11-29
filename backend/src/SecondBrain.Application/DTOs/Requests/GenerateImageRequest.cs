namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for generating an image
/// </summary>
public class GenerateImageRequest
{
    /// <summary>
    /// The text prompt describing the image to generate
    /// </summary>
    public string Prompt { get; set; } = string.Empty;

    /// <summary>
    /// The AI provider to use (e.g., "OpenAI", "Gemini", "Grok")
    /// </summary>
    public string Provider { get; set; } = string.Empty;

    /// <summary>
    /// The model to use (e.g., "dall-e-3", "grok-2-image")
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Size of the generated image (e.g., "1024x1024")
    /// </summary>
    public string? Size { get; set; }

    /// <summary>
    /// Quality level ("standard" or "hd")
    /// </summary>
    public string? Quality { get; set; }

    /// <summary>
    /// Style ("vivid" or "natural")
    /// </summary>
    public string? Style { get; set; }

    /// <summary>
    /// Number of images to generate
    /// </summary>
    public int? Count { get; set; }
}

