namespace SecondBrain.Application.Services.Voice;

/// <summary>
/// Factory for creating TTS synthesis service providers
/// </summary>
public interface IVoiceSynthesisServiceFactory
{
    /// <summary>
    /// Get a TTS provider by name (ElevenLabs, Google, OpenAI, Azure)
    /// </summary>
    /// <param name="providerName">Provider name (case-insensitive)</param>
    /// <returns>The TTS provider instance</returns>
    /// <exception cref="ArgumentException">If provider is not found</exception>
    IVoiceSynthesisService GetProvider(string providerName);

    /// <summary>
    /// Get the default configured TTS provider
    /// </summary>
    /// <returns>The default TTS provider</returns>
    IVoiceSynthesisService GetDefaultProvider();

    /// <summary>
    /// Get all registered TTS providers
    /// </summary>
    /// <returns>All TTS providers</returns>
    IEnumerable<IVoiceSynthesisService> GetAllProviders();

    /// <summary>
    /// Get all enabled and available TTS providers
    /// </summary>
    /// <returns>Enabled TTS providers</returns>
    IEnumerable<IVoiceSynthesisService> GetEnabledProviders();

    /// <summary>
    /// Check if a provider exists
    /// </summary>
    /// <param name="providerName">Provider name</param>
    /// <returns>True if provider exists</returns>
    bool HasProvider(string providerName);

    /// <summary>
    /// Get a provider with automatic fallback if the requested provider is unavailable
    /// </summary>
    /// <param name="providerName">Preferred provider name</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A healthy TTS provider</returns>
    /// <exception cref="InvalidOperationException">If no healthy providers available</exception>
    Task<IVoiceSynthesisService> GetProviderWithFallbackAsync(
        string providerName,
        CancellationToken cancellationToken = default);
}
