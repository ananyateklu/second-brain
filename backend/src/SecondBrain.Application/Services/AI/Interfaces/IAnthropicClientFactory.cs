using Anthropic.SDK;

namespace SecondBrain.Application.Services.AI.Interfaces;

/// <summary>
/// Factory interface for creating Anthropic (Claude) clients.
/// This abstraction enables unit testing by allowing mocked clients to be injected.
/// </summary>
public interface IAnthropicClientFactory
{
    /// <summary>
    /// Creates an Anthropic client with the specified API key.
    /// </summary>
    /// <param name="apiKey">The Anthropic API key.</param>
    /// <returns>An Anthropic client instance, or null if creation fails.</returns>
    AnthropicClient? CreateClient(string apiKey);
}

/// <summary>
/// Default implementation of IAnthropicClientFactory that creates real Anthropic SDK clients.
/// </summary>
public class AnthropicClientFactory : IAnthropicClientFactory
{
    public AnthropicClient? CreateClient(string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return null;
        }

        try
        {
            return new AnthropicClient(new APIAuthentication(apiKey));
        }
        catch
        {
            return null;
        }
    }
}

