using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.Services.AI.Interfaces;

public interface IAIProvider
{
    string ProviderName { get; }
    bool IsEnabled { get; }

    Task<AIResponse> GenerateCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default);

    Task<AIResponse> GenerateChatCompletionAsync(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default);

    Task<IAsyncEnumerable<string>> StreamCompletionAsync(
        AIRequest request,
        CancellationToken cancellationToken = default);

    Task<IAsyncEnumerable<string>> StreamChatCompletionAsync(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings = null,
        CancellationToken cancellationToken = default);

    Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default);

    Task<AIProviderHealth> GetHealthStatusAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets health status with optional configuration overrides (e.g., remote URL for Ollama)
    /// </summary>
    Task<AIProviderHealth> GetHealthStatusAsync(
        Dictionary<string, string>? configOverrides,
        CancellationToken cancellationToken = default)
    {
        // Default implementation ignores config overrides
        return GetHealthStatusAsync(cancellationToken);
    }

    /// <summary>
    /// Stream chat completion with callback for token usage reporting.
    /// This allows capturing actual provider token counts after streaming completes.
    /// </summary>
    /// <param name="messages">The conversation messages</param>
    /// <param name="settings">Optional AI request settings</param>
    /// <param name="onUsageAvailable">Callback invoked when token usage is available (at end of stream)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Async enumerable of response tokens</returns>
    Task<IAsyncEnumerable<string>> StreamChatCompletionWithUsageAsync(
        IEnumerable<ChatMessage> messages,
        AIRequest? settings,
        Action<StreamingTokenUsage>? onUsageAvailable,
        CancellationToken cancellationToken = default)
    {
        // Default implementation: stream without usage tracking
        return StreamChatCompletionAsync(messages, settings, cancellationToken);
    }
}
