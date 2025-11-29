namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model for image generation API
/// </summary>
public class ImageGenerationApiResponse
{
    public bool Success { get; set; }
    public List<GeneratedImageDto> Images { get; set; } = new();
    public string Model { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string? Error { get; set; }
    public string ConversationId { get; set; } = string.Empty;
}

/// <summary>
/// DTO for a generated image
/// </summary>
public class GeneratedImageDto
{
    public string? Base64Data { get; set; }
    public string? Url { get; set; }
    public string? RevisedPrompt { get; set; }
    public string MediaType { get; set; } = "image/png";
    public int? Width { get; set; }
    public int? Height { get; set; }
}

/// <summary>
/// Information about an image generation provider
/// </summary>
public class ImageProviderInfo
{
    public string Provider { get; set; } = string.Empty;
    public List<string> Models { get; set; } = new();
    public bool IsEnabled { get; set; }
}

