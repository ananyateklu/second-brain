using OllamaSharp.Models.Chat;

namespace SecondBrain.Application.Services.AI.Chat;

/// <summary>
/// Interface for stateful Ollama chat sessions.
/// Wraps OllamaSharp's Chat class to provide conversation management.
/// </summary>
public interface IOllamaChatSession : IDisposable
{
    /// <summary>
    /// Gets the current conversation history
    /// </summary>
    IReadOnlyList<Message> Messages { get; }

    /// <summary>
    /// Gets the model being used for this session
    /// </summary>
    string Model { get; }

    /// <summary>
    /// Gets the current system prompt
    /// </summary>
    string? SystemPrompt { get; }

    /// <summary>
    /// Sends a message and streams the response
    /// </summary>
    /// <param name="message">The user message to send</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Async enumerable of response chunks</returns>
    IAsyncEnumerable<string> SendAsync(string message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sends a message and gets the complete response
    /// </summary>
    /// <param name="message">The user message to send</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The complete assistant response</returns>
    Task<string> SendAndGetResponseAsync(string message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Clears the conversation history
    /// </summary>
    void ClearHistory();

    /// <summary>
    /// Sets or updates the system prompt
    /// </summary>
    /// <param name="systemPrompt">The new system prompt</param>
    void SetSystemPrompt(string systemPrompt);

    /// <summary>
    /// Adds a message to the conversation history manually
    /// </summary>
    /// <param name="role">The role (user, assistant, system)</param>
    /// <param name="content">The message content</param>
    void AddMessage(string role, string content);
}
