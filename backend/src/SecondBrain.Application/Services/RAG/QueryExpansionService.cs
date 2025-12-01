using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.Embeddings.Models;

namespace SecondBrain.Application.Services.RAG;

/// <summary>
/// Service for query expansion using HyDE (Hypothetical Document Embeddings) 
/// and multi-query generation to improve retrieval recall
/// </summary>
public interface IQueryExpansionService
{
    /// <summary>
    /// Expands a user query using HyDE - generates a hypothetical document that would answer the query
    /// </summary>
    Task<QueryExpansionResult> ExpandQueryWithHyDEAsync(
        string query,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates multiple query variations to capture different phrasings
    /// </summary>
    Task<List<string>> GenerateMultiQueryAsync(
        string query,
        int count = 3,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Full query expansion pipeline - returns embeddings for original query, HyDE, and multi-query
    /// </summary>
    Task<ExpandedQueryEmbeddings> GetExpandedQueryEmbeddingsAsync(
        string query,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of HyDE query expansion
/// </summary>
public class QueryExpansionResult
{
    public string OriginalQuery { get; set; } = string.Empty;
    public string HypotheticalDocument { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// Contains all expanded query embeddings for comprehensive retrieval
/// </summary>
public class ExpandedQueryEmbeddings
{
    public string OriginalQuery { get; set; } = string.Empty;
    public List<double> OriginalEmbedding { get; set; } = new();
    public List<double>? HyDEEmbedding { get; set; }
    public List<List<double>> MultiQueryEmbeddings { get; set; } = new();
    public List<string> QueryVariations { get; set; } = new();
    public string? HypotheticalDocument { get; set; }
    public int TotalTokensUsed { get; set; }
}

public class QueryExpansionService : IQueryExpansionService
{
    private readonly IAIProviderFactory _aiProviderFactory;
    private readonly IEmbeddingProviderFactory _embeddingProviderFactory;
    private readonly RagSettings _settings;
    private readonly ILogger<QueryExpansionService> _logger;

    public QueryExpansionService(
        IAIProviderFactory aiProviderFactory,
        IEmbeddingProviderFactory embeddingProviderFactory,
        IOptions<RagSettings> settings,
        ILogger<QueryExpansionService> logger)
    {
        _aiProviderFactory = aiProviderFactory;
        _embeddingProviderFactory = embeddingProviderFactory;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<QueryExpansionResult> ExpandQueryWithHyDEAsync(
        string query,
        CancellationToken cancellationToken = default)
    {
        var result = new QueryExpansionResult { OriginalQuery = query };

        if (!_settings.EnableHyDE)
        {
            result.Success = false;
            result.Error = "HyDE is disabled in settings";
            return result;
        }

        try
        {
            _logger.LogInformation("Generating hypothetical document for query: {Query}",
                query.Substring(0, Math.Min(50, query.Length)));

            // Get the AI provider for HyDE generation
            var provider = _aiProviderFactory.GetProvider(_settings.RerankingProvider);
            if (provider == null)
            {
                _logger.LogWarning("AI provider {Provider} not available for HyDE", _settings.RerankingProvider);
                result.Success = false;
                result.Error = $"AI provider {_settings.RerankingProvider} not available";
                return result;
            }

            var hydePrompt = $@"You are a helpful assistant that generates hypothetical documents.

Given the following question, write a detailed paragraph that would be found in a document that directly answers this question. 
Write as if you are writing content from that document, not as if you are answering the question.
Be specific and include relevant details, facts, and terminology that would appear in such a document.

Question: {query}

Hypothetical document paragraph:";

            var request = new AIRequest { Prompt = hydePrompt, MaxTokens = 500, Temperature = 0.7f };
            var aiResponse = await provider.GenerateCompletionAsync(request, cancellationToken);
            var response = aiResponse.Content;

            if (!string.IsNullOrWhiteSpace(response))
            {
                result.HypotheticalDocument = response.Trim();
                result.Success = true;
                _logger.LogDebug("Generated HyDE document: {Doc}",
                    result.HypotheticalDocument.Substring(0, Math.Min(100, result.HypotheticalDocument.Length)));
            }
            else
            {
                result.Success = false;
                result.Error = "Empty response from AI provider";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating HyDE document for query");
            result.Success = false;
            result.Error = ex.Message;
        }

        return result;
    }

    public async Task<List<string>> GenerateMultiQueryAsync(
        string query,
        int count = 3,
        CancellationToken cancellationToken = default)
    {
        var variations = new List<string> { query }; // Always include original

        if (!_settings.EnableQueryExpansion || count <= 1)
        {
            return variations;
        }

        try
        {
            _logger.LogInformation("Generating {Count} query variations for: {Query}",
                count, query.Substring(0, Math.Min(50, query.Length)));

            var provider = _aiProviderFactory.GetProvider(_settings.RerankingProvider);
            if (provider == null)
            {
                _logger.LogWarning("AI provider not available for multi-query generation");
                return variations;
            }

            var multiQueryPrompt = $@"You are a helpful assistant that generates search query variations.

Given the following question, generate {count - 1} alternative phrasings or related queries that would help find relevant information. 
Each variation should capture a different aspect or phrasing of the original question.
Return ONLY the queries, one per line, without numbering or bullets.

Original question: {query}

Alternative queries:";

            var request = new AIRequest { Prompt = multiQueryPrompt, MaxTokens = 300, Temperature = 0.8f };
            var aiResponse = await provider.GenerateCompletionAsync(request, cancellationToken);
            var response = aiResponse.Content;

            if (!string.IsNullOrWhiteSpace(response))
            {
                var generatedQueries = response
                    .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                    .Select(q => q.Trim())
                    .Where(q => !string.IsNullOrWhiteSpace(q) && q.Length > 5)
                    .Take(count - 1)
                    .ToList();

                variations.AddRange(generatedQueries);

                _logger.LogDebug("Generated {Count} query variations: {Queries}",
                    generatedQueries.Count, string.Join(" | ", generatedQueries));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating multi-query variations");
        }

        return variations;
    }

    public async Task<ExpandedQueryEmbeddings> GetExpandedQueryEmbeddingsAsync(
        string query,
        CancellationToken cancellationToken = default)
    {
        var result = new ExpandedQueryEmbeddings { OriginalQuery = query };
        var embeddingProvider = _embeddingProviderFactory.GetDefaultProvider();
        var totalTokens = 0;

        try
        {
            _logger.LogInformation("Starting query expansion pipeline for: {Query}",
                query.Substring(0, Math.Min(50, query.Length)));

            // 1. Generate embedding for original query
            var originalEmbedding = await embeddingProvider.GenerateEmbeddingAsync(query, cancellationToken);
            if (originalEmbedding.Success)
            {
                result.OriginalEmbedding = originalEmbedding.Embedding;
                totalTokens += originalEmbedding.TokensUsed;
            }
            else
            {
                _logger.LogWarning("Failed to generate original query embedding: {Error}", originalEmbedding.Error);
                return result;
            }

            // 2. Generate HyDE embedding if enabled
            if (_settings.EnableHyDE)
            {
                var hydeResult = await ExpandQueryWithHyDEAsync(query, cancellationToken);
                if (hydeResult.Success && !string.IsNullOrWhiteSpace(hydeResult.HypotheticalDocument))
                {
                    result.HypotheticalDocument = hydeResult.HypotheticalDocument;

                    var hydeEmbedding = await embeddingProvider.GenerateEmbeddingAsync(
                        hydeResult.HypotheticalDocument, cancellationToken);

                    if (hydeEmbedding.Success)
                    {
                        result.HyDEEmbedding = hydeEmbedding.Embedding;
                        totalTokens += hydeEmbedding.TokensUsed;
                    }
                }
            }

            // 3. Generate multi-query embeddings if enabled
            if (_settings.EnableQueryExpansion && _settings.MultiQueryCount > 1)
            {
                var queryVariations = await GenerateMultiQueryAsync(
                    query, _settings.MultiQueryCount, cancellationToken);

                result.QueryVariations = queryVariations;

                // Generate embeddings for variations (skip original as we already have it)
                foreach (var variation in queryVariations.Skip(1))
                {
                    var variationEmbedding = await embeddingProvider.GenerateEmbeddingAsync(
                        variation, cancellationToken);

                    if (variationEmbedding.Success)
                    {
                        result.MultiQueryEmbeddings.Add(variationEmbedding.Embedding);
                        totalTokens += variationEmbedding.TokensUsed;
                    }
                }
            }

            result.TotalTokensUsed = totalTokens;

            _logger.LogInformation(
                "Query expansion complete. HyDE: {HyDE}, MultiQuery: {MultiQuery}, TotalTokens: {Tokens}",
                result.HyDEEmbedding != null, result.MultiQueryEmbeddings.Count, totalTokens);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in query expansion pipeline");
        }

        return result;
    }
}

