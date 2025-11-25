namespace SecondBrain.Application.Services.AI.Interfaces;

public interface IAIProviderFactory
{
    IAIProvider GetProvider(string providerName);
    IEnumerable<IAIProvider> GetAllProviders();
    IEnumerable<IAIProvider> GetEnabledProviders();
}
