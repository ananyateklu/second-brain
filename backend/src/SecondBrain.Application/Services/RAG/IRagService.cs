using SecondBrain.Application.Services.RAG.Models;

namespace SecondBrain.Application.Services.RAG;

public interface IRagService
{
    Task<RagContext> RetrieveContextAsync(
        string query,
        string userId,
        int? topK = null,
        float? similarityThreshold = null,
        string? vectorStoreProvider = null,
        string? conversationId = null,
        CancellationToken cancellationToken = default);

    string EnhancePromptWithContext(string originalPrompt, RagContext context);
}

