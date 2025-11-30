using OpenAI;
using OpenAI.Embeddings;

namespace SecondBrain.Application.Services.Embeddings.Interfaces;

/// <summary>
/// Factory interface for creating OpenAI embedding clients.
/// This abstraction enables unit testing by allowing mocked clients to be injected.
/// </summary>
public interface IOpenAIEmbeddingClientFactory
{
    /// <summary>
    /// Creates an embedding client for the specified model.
    /// </summary>
    /// <param name="apiKey">The OpenAI API key.</param>
    /// <param name="model">The embedding model name.</param>
    /// <returns>An embedding client instance, or null if creation fails.</returns>
    EmbeddingClient? CreateClient(string apiKey, string model);
}

/// <summary>
/// Default implementation of IOpenAIEmbeddingClientFactory that creates real OpenAI SDK clients.
/// </summary>
public class OpenAIEmbeddingClientFactory : IOpenAIEmbeddingClientFactory
{
    public EmbeddingClient? CreateClient(string apiKey, string model)
    {
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(model))
        {
            return null;
        }

        try
        {
            var client = new OpenAIClient(apiKey);
            return client.GetEmbeddingClient(model);
        }
        catch
        {
            return null;
        }
    }
}

