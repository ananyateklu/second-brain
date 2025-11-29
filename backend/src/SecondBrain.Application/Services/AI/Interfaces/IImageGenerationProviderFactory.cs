namespace SecondBrain.Application.Services.AI.Interfaces;

/// <summary>
/// Factory for creating image generation providers
/// </summary>
public interface IImageGenerationProviderFactory
{
    /// <summary>
    /// Get an image generation provider by name
    /// </summary>
    /// <param name="providerName">The name of the provider (e.g., "OpenAI", "Gemini", "Grok")</param>
    /// <returns>The image generation provider</returns>
    /// <exception cref="ArgumentException">Thrown when the provider is not found</exception>
    IImageGenerationProvider GetProvider(string providerName);

    /// <summary>
    /// Get all available image generation providers
    /// </summary>
    IEnumerable<IImageGenerationProvider> GetAllProviders();

    /// <summary>
    /// Get all enabled image generation providers
    /// </summary>
    IEnumerable<IImageGenerationProvider> GetEnabledProviders();

    /// <summary>
    /// Check if a provider exists and supports image generation
    /// </summary>
    bool HasProvider(string providerName);
}

