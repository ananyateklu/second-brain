using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.Services.AI.Interfaces;

/// <summary>
/// Interface for AI providers that support image generation
/// </summary>
public interface IImageGenerationProvider
{
    /// <summary>
    /// The name of the provider (e.g., "OpenAI", "Gemini", "Grok")
    /// </summary>
    string ProviderName { get; }

    /// <summary>
    /// Whether the provider is enabled in configuration
    /// </summary>
    bool IsEnabled { get; }

    /// <summary>
    /// Generate an image from a text prompt
    /// </summary>
    Task<ImageGenerationResponse> GenerateImageAsync(
        ImageGenerationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if the provider is available and responding
    /// </summary>
    Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the list of supported image generation models for this provider
    /// </summary>
    IEnumerable<string> GetSupportedModels();

    /// <summary>
    /// Get the list of supported image sizes for a given model
    /// </summary>
    IEnumerable<string> GetSupportedSizes(string model);
}

