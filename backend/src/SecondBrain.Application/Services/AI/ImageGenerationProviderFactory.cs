using SecondBrain.Application.Services.AI.Interfaces;

namespace SecondBrain.Application.Services.AI;

/// <summary>
/// Factory for managing image generation providers
/// </summary>
public class ImageGenerationProviderFactory : IImageGenerationProviderFactory
{
    private readonly Dictionary<string, IImageGenerationProvider> _providers;

    public ImageGenerationProviderFactory(IEnumerable<IImageGenerationProvider> providers)
    {
        _providers = providers.ToDictionary(
            p => p.ProviderName,
            p => p,
            StringComparer.OrdinalIgnoreCase);
    }

    public IImageGenerationProvider GetProvider(string providerName)
    {
        if (_providers.TryGetValue(providerName, out var provider))
        {
            return provider;
        }

        throw new ArgumentException(
            $"Image generation provider '{providerName}' not found. Available providers: {string.Join(", ", _providers.Keys)}",
            nameof(providerName));
    }

    public IEnumerable<IImageGenerationProvider> GetAllProviders()
    {
        return _providers.Values;
    }

    public IEnumerable<IImageGenerationProvider> GetEnabledProviders()
    {
        return _providers.Values.Where(p => p.IsEnabled);
    }

    public bool HasProvider(string providerName)
    {
        return _providers.ContainsKey(providerName);
    }
}

