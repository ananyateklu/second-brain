namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Response model for image generation
/// </summary>
public class ImageGenerationResponse
{
    /// <summary>
    /// Whether the generation was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// List of generated images
    /// </summary>
    public List<GeneratedImage> Images { get; set; } = new();

    /// <summary>
    /// The model used for generation
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// The provider that generated the image
    /// </summary>
    public string Provider { get; set; } = string.Empty;

    /// <summary>
    /// Error message if generation failed
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Timestamp of the generation
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Represents a single generated image
/// </summary>
public class GeneratedImage
{
    /// <summary>
    /// Base64-encoded image data (PNG format)
    /// </summary>
    public string? Base64Data { get; set; }

    /// <summary>
    /// URL to the generated image (if returned by provider)
    /// </summary>
    public string? Url { get; set; }

    /// <summary>
    /// The revised/enhanced prompt used by the model (DALL-E 3 feature)
    /// </summary>
    public string? RevisedPrompt { get; set; }

    /// <summary>
    /// MIME type of the image (e.g., "image/png", "image/jpeg")
    /// </summary>
    public string MediaType { get; set; } = "image/png";

    /// <summary>
    /// Width of the generated image in pixels
    /// </summary>
    public int? Width { get; set; }

    /// <summary>
    /// Height of the generated image in pixels
    /// </summary>
    public int? Height { get; set; }
}

