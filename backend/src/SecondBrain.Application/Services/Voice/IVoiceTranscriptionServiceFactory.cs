namespace SecondBrain.Application.Services.Voice;

/// <summary>
/// Factory for creating STT transcription service providers
/// </summary>
public interface IVoiceTranscriptionServiceFactory
{
    /// <summary>
    /// Get an STT provider by name (Deepgram, Google, Whisper, Azure)
    /// </summary>
    /// <param name="providerName">Provider name (case-insensitive)</param>
    /// <returns>The STT provider instance</returns>
    /// <exception cref="ArgumentException">If provider is not found</exception>
    IVoiceTranscriptionService GetProvider(string providerName);

    /// <summary>
    /// Get the default configured STT provider
    /// </summary>
    /// <returns>The default STT provider</returns>
    IVoiceTranscriptionService GetDefaultProvider();

    /// <summary>
    /// Get all registered STT providers
    /// </summary>
    /// <returns>All STT providers</returns>
    IEnumerable<IVoiceTranscriptionService> GetAllProviders();

    /// <summary>
    /// Get all enabled and available STT providers
    /// </summary>
    /// <returns>Enabled STT providers</returns>
    IEnumerable<IVoiceTranscriptionService> GetEnabledProviders();

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
    /// <returns>A healthy STT provider</returns>
    /// <exception cref="InvalidOperationException">If no healthy providers available</exception>
    Task<IVoiceTranscriptionService> GetProviderWithFallbackAsync(
        string providerName,
        CancellationToken cancellationToken = default);
}
