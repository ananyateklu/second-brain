using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.RAG.Models;
using SecondBrain.Application.Services.VectorStore;
using SecondBrain.Application.Utilities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.RAG;

public class RagService : IRagService
{
    private readonly IEmbeddingProviderFactory _embeddingProviderFactory;
    private readonly IVectorStore _vectorStore;
    private readonly RagSettings _settings;
    private readonly ILogger<RagService> _logger;

    public RagService(
        IEmbeddingProviderFactory embeddingProviderFactory,
        IVectorStore vectorStore,
        IOptions<RagSettings> settings,
        ILogger<RagService> logger)
    {
        _embeddingProviderFactory = embeddingProviderFactory;
        _vectorStore = vectorStore;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<RagContext> RetrieveContextAsync(
        string query,
        string userId,
        int? topK = null,
        float? similarityThreshold = null,
        string? vectorStoreProvider = null,
        CancellationToken cancellationToken = default)
    {
        var context = new RagContext();

        try
        {
            _logger.LogInformation(
                "Starting RAG context retrieval. UserId: {UserId}, Query: {Query}, TopK: {TopK}, Threshold: {Threshold}, VectorStore: {VectorStore}",
                userId, query, topK ?? _settings.TopK, similarityThreshold ?? _settings.SimilarityThreshold, vectorStoreProvider ?? "default");

            // Set vector store provider override if specified
            if (!string.IsNullOrWhiteSpace(vectorStoreProvider) && _vectorStore is CompositeVectorStore compositeStore)
            {
                compositeStore.SetProviderOverride(vectorStoreProvider);
                _logger.LogInformation("Using vector store provider override: {Provider}", vectorStoreProvider);
            }

            // Get embedding provider
            var embeddingProvider = _embeddingProviderFactory.GetDefaultProvider();
            _logger.LogInformation(
                "Using embedding provider: {Provider}, Model: {Model}",
                embeddingProvider.ProviderName, embeddingProvider.ModelName);

            // Generate embedding for the query
            var embeddingResponse = await embeddingProvider.GenerateEmbeddingAsync(query, cancellationToken);

            if (!embeddingResponse.Success)
            {
                _logger.LogWarning(
                    "Failed to generate embedding for query. Provider: {Provider}, Error: {Error}",
                    embeddingProvider.ProviderName, embeddingResponse.Error);
                return context;
            }

            _logger.LogInformation(
                "Successfully generated query embedding. Dimensions: {Dimensions}, TokensUsed: {Tokens}",
                embeddingResponse.Embedding.Count, embeddingResponse.TokensUsed);

            context.TotalTokensUsed = embeddingResponse.TokensUsed;

            // Search vector store for similar notes
            var searchResults = await _vectorStore.SearchAsync(
                embeddingResponse.Embedding,
                userId,
                topK ?? _settings.TopK,
                similarityThreshold ?? _settings.SimilarityThreshold,
                cancellationToken);

            context.RetrievedNotes = searchResults;

            // Format context for AI prompt
            if (searchResults.Any())
            {
                context.FormattedContext = FormatContextForPrompt(searchResults);
                _logger.LogInformation(
                    "Retrieved {Count} relevant notes for query. Scores: [{Scores}]",
                    searchResults.Count,
                    string.Join(", ", searchResults.Select(r => $"{r.NoteTitle}:{r.SimilarityScore:F4}")));
            }
            else
            {
                _logger.LogInformation("No relevant notes found for query. UserId: {UserId}", userId);
            }

            return context;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving RAG context. UserId: {UserId}, Query: {Query}", userId, query);
            return context;
        }
    }

    public string EnhancePromptWithContext(string originalPrompt, RagContext context)
    {
        // If no context was retrieved, we still want to inform the AI that it has access to the knowledge base
        // but found nothing relevant. This prevents the "I don't have access to your notes" hallucination.
        if (string.IsNullOrWhiteSpace(context.FormattedContext))
        {
            return $@"You are a helpful AI assistant with access to the user's personal knowledge base (Second Brain). 

SYSTEM UPDATE: A semantic search was performed on the user's notes for the query ""{originalPrompt}"", but NO relevant notes were found (similarity score was too low).

INSTRUCTIONS:
1. Answer the user's query based on your general knowledge.
2. Inform the user that you searched their Second Brain but didn't find any specific notes related to this query.
3. DO NOT say you cannot access their notes. You DO have access, but the search yielded no results for this specific topic.
4. If the user's query was a greeting or general conversation, simply converse naturally.

USER QUERY: {originalPrompt}

ANSWER:";
        }

        // Create an enhanced prompt with context
        var enhancedPrompt = $@"You are a helpful AI assistant with access to the user's personal knowledge base. The following notes have been retrieved from their knowledge base based on semantic similarity to their query.

Each note contains:
- Title: The note's title
- Tags: Categorization tags
- Created/Updated dates: When the note was created and last modified
- Content: The actual note content

RETRIEVED NOTES FROM KNOWLEDGE BASE:
{context.FormattedContext}

---

INSTRUCTIONS:
1. Answer the user's query using ONLY the information from the retrieved notes above.
2. **Citation Rule**: When using information from a note, you must cite it using the format [Note Title]. Example: ""According to [Project Alpha Plan], the deadline is...""
3. **Dates**: If asked about dates/timing, prioritize the Created/Updated dates explicitly mentioned in the note metadata.
4. **Uncertainty**: If the retrieved notes do not contain the answer, explicitly state: ""I cannot find this information in your notes."" Do not guess or hallucinate.
5. **Direct Quotes**: Use direct quotes where possible to increase accuracy, formatted as ""quote"".
6. **Context Awareness**: If the user greets you or asks a general question not requiring notes (e.g., ""Hi"", ""Who are you?""), answer naturally but mention you can search their notes.

USER QUERY: {originalPrompt}

ANSWER:";

        return enhancedPrompt;
    }

    private string FormatContextForPrompt(List<VectorSearchResult> searchResults)
    {
        var contextParts = new List<string>();

        foreach (var result in searchResults.Take(_settings.TopK))
        {
            var parsedNote = NoteContentParser.Parse(result.Content);
            var contextPart = $@"
=== NOTE {searchResults.IndexOf(result) + 1} (Relevance Score: {result.SimilarityScore:F2}) ===
Title: {parsedNote.Title ?? result.NoteTitle}
{(parsedNote.Tags?.Any() == true ? $"Tags: {string.Join(", ", parsedNote.Tags)}\n" : "")}{(parsedNote.CreatedDate.HasValue ? $"Created: {parsedNote.CreatedDate:yyyy-MM-dd}\n" : "")}{(parsedNote.UpdatedDate.HasValue ? $"Last Updated: {parsedNote.UpdatedDate:yyyy-MM-dd}\n" : "")}
Content:
{parsedNote.Content}
";
            contextParts.Add(contextPart);
        }

        var formattedContext = string.Join("\n", contextParts);

        // Truncate if context exceeds max length
        if (formattedContext.Length > _settings.MaxContextLength)
        {
            formattedContext = formattedContext.Substring(0, _settings.MaxContextLength) + "\n... (context truncated)";
        }

        return formattedContext;
    }
}

