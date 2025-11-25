using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;

namespace SecondBrain.Application.Services.Embeddings;

public class EmbeddingProviderFactory : IEmbeddingProviderFactory
{
    private readonly IEnumerable<IEmbeddingProvider> _providers;
    private readonly string _defaultProviderName;

    public EmbeddingProviderFactory(
        IEnumerable<IEmbeddingProvider> providers,
        IOptions<EmbeddingProvidersSettings> settings)
    {
        _providers = providers;
        _defaultProviderName = settings.Value.DefaultProvider;
    }

    public IEmbeddingProvider GetProvider(string providerName)
    {
        var provider = _providers.FirstOrDefault(p =>
            p.ProviderName.Equals(providerName, StringComparison.OrdinalIgnoreCase));

        if (provider == null)
        {
            throw new ArgumentException($"Embedding provider '{providerName}' not found");
        }

        if (!provider.IsEnabled)
        {
            throw new InvalidOperationException($"Embedding provider '{providerName}' is not enabled");
        }

        return provider;
    }

    public IEmbeddingProvider GetDefaultProvider()
    {
        return GetProvider(_defaultProviderName);
    }

    public IEnumerable<IEmbeddingProvider> GetAllProviders()
    {
        return _providers.Where(p => p.IsEnabled);
    }
}

