using SecondBrain.Application.Services.RAG.Models;

namespace SecondBrain.Application.Services.RAG;

public interface IRagService
{
    /// <summary>
    /// Retrieves context from the user's notes using the RAG pipeline.
    /// </summary>
    /// <param name="query">The user's query</param>
    /// <param name="userId">The user's ID</param>
    /// <param name="topK">Number of results to return (optional, uses default if not specified)</param>
    /// <param name="similarityThreshold">Minimum similarity threshold (optional)</param>
    /// <param name="vectorStoreProvider">Override vector store provider (optional)</param>
    /// <param name="conversationId">Conversation ID for analytics (optional)</param>
    /// <param name="options">User-specific RAG options to override default settings (optional)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>RAG context with retrieved notes and formatted context</returns>
    Task<RagContext> RetrieveContextAsync(
        string query,
        string userId,
        int? topK = null,
        float? similarityThreshold = null,
        string? vectorStoreProvider = null,
        string? conversationId = null,
        RagOptions? options = null,
        CancellationToken cancellationToken = default);

    string EnhancePromptWithContext(string originalPrompt, RagContext context);
}

