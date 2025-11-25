namespace SecondBrain.Application.Services.Embeddings;

public interface IEmbeddingProviderFactory
{
    IEmbeddingProvider GetProvider(string providerName);
    IEmbeddingProvider GetDefaultProvider();
    IEnumerable<IEmbeddingProvider> GetAllProviders();
}

