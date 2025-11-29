namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Request model for image generation
/// </summary>
public class ImageGenerationRequest
{
    /// <summary>
    /// The text prompt describing the image to generate
    /// </summary>
    public string Prompt { get; set; } = string.Empty;

    /// <summary>
    /// The model to use for generation (e.g., "dall-e-3", "grok-2-image")
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// The size of the generated image (e.g., "1024x1024", "1792x1024")
    /// </summary>
    public string Size { get; set; } = "1024x1024";

    /// <summary>
    /// The quality of the generated image ("standard" or "hd")
    /// Only supported by some providers like DALL-E 3
    /// </summary>
    public string Quality { get; set; } = "standard";

    /// <summary>
    /// The style of the generated image ("vivid" or "natural")
    /// Only supported by some providers like DALL-E 3
    /// </summary>
    public string Style { get; set; } = "vivid";

    /// <summary>
    /// Number of images to generate (1-4, depending on provider)
    /// </summary>
    public int Count { get; set; } = 1;

    /// <summary>
    /// Response format preference ("url" or "b64_json")
    /// </summary>
    public string ResponseFormat { get; set; } = "b64_json";
}

