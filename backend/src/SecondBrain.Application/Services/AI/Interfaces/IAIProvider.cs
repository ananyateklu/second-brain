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
}
