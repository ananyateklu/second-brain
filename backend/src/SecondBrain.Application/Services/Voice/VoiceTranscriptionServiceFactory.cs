using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;

namespace SecondBrain.Application.Services.Voice;

/// <summary>
/// Factory for creating and managing STT transcription service providers
/// </summary>
public class VoiceTranscriptionServiceFactory : IVoiceTranscriptionServiceFactory
{
    private readonly IServiceProvider _serviceProvider;
    private readonly VoiceSettings _settings;
    private readonly ILogger<VoiceTranscriptionServiceFactory> _logger;
    private readonly Dictionary<string, Type> _providerTypes;

    public VoiceTranscriptionServiceFactory(
        IServiceProvider serviceProvider,
        IOptions<VoiceSettings> voiceSettings,
        ILogger<VoiceTranscriptionServiceFactory> logger)
    {
        _serviceProvider = serviceProvider;
        _settings = voiceSettings.Value;
        _logger = logger;

        // Register all known STT providers (case-insensitive)
        // Currently only Deepgram, but architecture allows adding more
        _providerTypes = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase)
        {
            { "deepgram", typeof(DeepgramTranscriptionService) }
            // Future: { "google", typeof(GoogleSTTService) }
            // Future: { "whisper", typeof(WhisperTranscriptionService) }
            // Future: { "azure", typeof(AzureSTTService) }
        };
    }

    /// <inheritdoc />
    public IVoiceTranscriptionService GetProvider(string providerName)
    {
        if (string.IsNullOrWhiteSpace(providerName))
        {
            throw new ArgumentException("Provider name cannot be null or empty", nameof(providerName));
        }

        if (!_providerTypes.TryGetValue(providerName, out var providerType))
        {
            throw new ArgumentException(
                $"Unknown STT provider: '{providerName}'. Available providers: {string.Join(", ", _providerTypes.Keys)}",
                nameof(providerName));
        }

        var provider = _serviceProvider.GetService(providerType) as IVoiceTranscriptionService;

        if (provider == null)
        {
            throw new InvalidOperationException(
                $"Failed to resolve STT provider '{providerName}'. Ensure it is registered in DI.");
        }

        _logger.LogDebug("Resolved STT provider: {ProviderName}, Available: {IsAvailable}",
            provider.ProviderName, provider.IsAvailable);

        return provider;
    }

    /// <inheritdoc />
    public IVoiceTranscriptionService GetDefaultProvider()
    {
        return GetProvider(_settings.DefaultSTTProvider);
    }

    /// <inheritdoc />
    public IEnumerable<IVoiceTranscriptionService> GetAllProviders()
    {
        return _providerTypes.Values
            .Distinct()
            .Select(t => _serviceProvider.GetService(t) as IVoiceTranscriptionService)
            .Where(p => p != null)!;
    }

    /// <inheritdoc />
    public IEnumerable<IVoiceTranscriptionService> GetEnabledProviders()
    {
        return GetAllProviders().Where(p => p.IsAvailable);
    }

    /// <inheritdoc />
    public bool HasProvider(string providerName)
    {
        return !string.IsNullOrWhiteSpace(providerName) &&
               _providerTypes.ContainsKey(providerName);
    }

    /// <inheritdoc />
    public async Task<IVoiceTranscriptionService> GetProviderWithFallbackAsync(
        string providerName,
        CancellationToken cancellationToken = default)
    {
        // First try the requested provider
        var provider = GetProvider(providerName);
        var (isHealthy, _) = await provider.CheckHealthAsync(cancellationToken);

        if (isHealthy)
        {
            return provider;
        }

        _logger.LogWarning("STT provider '{ProviderName}' is unhealthy, checking fallback providers",
            providerName);

        // Try other enabled providers as fallback
        foreach (var fallback in GetEnabledProviders().Where(p => p.ProviderName != providerName))
        {
            var (fallbackHealthy, fallbackError) = await fallback.CheckHealthAsync(cancellationToken);

            if (fallbackHealthy)
            {
                _logger.LogWarning(
                    "Falling back to STT provider '{FallbackProvider}' (requested: '{RequestedProvider}')",
                    fallback.ProviderName, providerName);
                return fallback;
            }

            _logger.LogDebug("Fallback provider '{Provider}' is also unhealthy: {Error}",
                fallback.ProviderName, fallbackError);
        }

        throw new InvalidOperationException(
            $"No healthy STT providers available. Requested: '{providerName}'. " +
            $"Tried: {string.Join(", ", GetEnabledProviders().Select(p => p.ProviderName))}");
    }
}
