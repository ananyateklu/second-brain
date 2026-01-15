using SecondBrain.Application.Services.AI.Interfaces;

namespace SecondBrain.Application.Services.AI;

public class AIProviderFactory : IAIProviderFactory
{
    private readonly IServiceProvider _serviceProvider;
    private readonly Dictionary<string, Type> _providerTypes;

    public AIProviderFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;

        // Register provider types by name
        _providerTypes = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase)
        {
            { "openai", typeof(Providers.OpenAIProvider) },
            { "google", typeof(Providers.GoogleProvider) },
            { "anthropic", typeof(Providers.AnthropicProvider) },
            { "ollama", typeof(Providers.OllamaProvider) },
            { "xai", typeof(Providers.XaiProvider) },
            { "cohere", typeof(Providers.CohereProvider) }
        };
    }

    public IAIProvider GetProvider(string providerName)
    {
        if (!_providerTypes.TryGetValue(providerName, out var providerType))
        {
            throw new ArgumentException($"Unknown AI provider: {providerName}. Available providers: {string.Join(", ", _providerTypes.Keys)}");
        }

        var provider = _serviceProvider.GetService(providerType) as IAIProvider;

        if (provider == null)
        {
            throw new InvalidOperationException($"Failed to resolve provider: {providerName}");
        }

        return provider;
    }

    public IEnumerable<IAIProvider> GetAllProviders()
    {
        var providers = new List<IAIProvider>();
        var seenTypes = new HashSet<Type>();

        foreach (var providerType in _providerTypes.Values)
        {
            // Skip if we've already processed this provider type (handles aliases)
            if (seenTypes.Contains(providerType))
            {
                continue;
            }

            seenTypes.Add(providerType);
            var provider = _serviceProvider.GetService(providerType) as IAIProvider;
            if (provider != null)
            {
                providers.Add(provider);
            }
        }

        return providers;
    }

    public IEnumerable<IAIProvider> GetEnabledProviders()
    {
        return GetAllProviders().Where(p => p.IsEnabled);
    }
}
