using OpenAI;
using OpenAI.Chat;

namespace SecondBrain.Application.Services.AI.Interfaces;

/// <summary>
/// Factory interface for creating OpenAI clients.
/// This abstraction enables unit testing by allowing mocked clients to be injected.
/// </summary>
public interface IOpenAIClientFactory
{
    /// <summary>
    /// Creates a ChatClient for the specified model.
    /// </summary>
    /// <param name="apiKey">The OpenAI API key.</param>
    /// <param name="model">The model name.</param>
    /// <returns>A ChatClient instance, or null if creation fails.</returns>
    ChatClient? CreateChatClient(string apiKey, string model);
}

/// <summary>
/// Default implementation of IOpenAIClientFactory that creates real OpenAI SDK clients.
/// </summary>
public class OpenAIClientFactory : IOpenAIClientFactory
{
    public ChatClient? CreateChatClient(string apiKey, string model)
    {
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(model))
        {
            return null;
        }

        try
        {
            var client = new OpenAIClient(apiKey);
            return client.GetChatClient(model);
        }
        catch
        {
            return null;
        }
    }
}

