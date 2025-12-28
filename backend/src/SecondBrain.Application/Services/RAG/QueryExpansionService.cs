using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI;
using SecondBrain.Application.Services.AI.Interfaces;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.StructuredOutput;
using SecondBrain.Application.Services.AI.StructuredOutput.Models;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.Embeddings.Models;
using SecondBrain.Application.Services.RAG.Models;

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
    /// <param name="query">The user's search query</param>
    /// <param name="options">Optional RagOptions with provider/model overrides from user preferences</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<QueryExpansionResult> ExpandQueryWithHyDEAsync(
        string query,
        RagOptions? options = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates multiple query variations to capture different phrasings
    /// </summary>
    /// <param name="query">The user's search query</param>
    /// <param name="count">Number of variations to generate</param>
    /// <param name="options">Optional RagOptions with provider/model overrides from user preferences</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<List<string>> GenerateMultiQueryAsync(
        string query,
        int count = 3,
        RagOptions? options = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Full query expansion pipeline - returns embeddings for original query, HyDE, and multi-query
    /// </summary>
    /// <param name="query">The user's search query</param>
    /// <param name="enableQueryExpansion">Whether to generate multi-query variations (null uses default setting)</param>
    /// <param name="enableHyDE">Whether to use HyDE (Hypothetical Document Embeddings) (null uses default setting)</param>
    /// <param name="options">Optional RagOptions with provider/model overrides from user preferences</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task<ExpandedQueryEmbeddings> GetExpandedQueryEmbeddingsAsync(
        string query,
        bool? enableQueryExpansion = null,
        bool? enableHyDE = null,
        RagOptions? options = null,
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

    /// <summary>
    /// The dimension of the embeddings (768, 1024, 1536, or 3072).
    /// Used to filter stored embeddings to matching dimensions during search.
    /// </summary>
    public int EmbeddingDimensions { get; set; } = 1536;
}

public class QueryExpansionService : IQueryExpansionService
{
    private readonly IAIProviderFactory _aiProviderFactory;
    private readonly IEmbeddingProviderFactory _embeddingProviderFactory;
    private readonly IStructuredOutputService? _structuredOutputService;
    private readonly RagSettings _settings;
    private readonly ILogger<QueryExpansionService> _logger;

    public QueryExpansionService(
        IAIProviderFactory aiProviderFactory,
        IEmbeddingProviderFactory embeddingProviderFactory,
        IOptions<RagSettings> settings,
        ILogger<QueryExpansionService> logger,
        IStructuredOutputService? structuredOutputService = null)
    {
        _aiProviderFactory = aiProviderFactory;
        _embeddingProviderFactory = embeddingProviderFactory;
        _structuredOutputService = structuredOutputService;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<QueryExpansionResult> ExpandQueryWithHyDEAsync(
        string query,
        RagOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var result = new QueryExpansionResult { OriginalQuery = query };

        if (!_settings.EnableHyDE)
        {
            result.Success = false;
            result.Error = "HyDE is disabled in settings";
            return result;
        }

        // Resolve effective provider/model: user preferences > global defaults
        var effectiveProvider = options?.HyDEProvider ?? _settings.HyDEProvider;
        var effectiveModel = options?.HyDEModel ?? _settings.HyDEModel;

        try
        {
            _logger.LogInformation("Generating hypothetical document for query: {Query}. Provider: {Provider}, Model: {Model}",
                query.Substring(0, Math.Min(50, query.Length)),
                effectiveProvider,
                effectiveModel ?? "default");

            // Try structured output first for reliable document extraction
            if (_structuredOutputService != null)
            {
                var structuredResult = await GenerateStructuredHyDEDocumentAsync(query, effectiveProvider, effectiveModel, cancellationToken);
                if (structuredResult != null)
                {
                    result.HypotheticalDocument = structuredResult;
                    result.Success = true;
                    _logger.LogDebug("Generated structured HyDE document: {Doc}",
                        result.HypotheticalDocument.Substring(0, Math.Min(100, result.HypotheticalDocument.Length)));
                    return result;
                }

                _logger.LogDebug("Structured output failed for HyDE, falling back to text generation");
            }

            // Fallback to text-based generation
            return await GenerateTextBasedHyDEDocumentAsync(query, result, effectiveProvider, effectiveModel, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating HyDE document for query");
            result.Success = false;
            result.Error = ex.Message;
        }

        return result;
    }

    /// <summary>
    /// Generates HyDE document using structured output for reliable extraction.
    /// </summary>
    private async Task<string?> GenerateStructuredHyDEDocumentAsync(
        string query,
        string provider,
        string? model,
        CancellationToken cancellationToken)
    {
        try
        {
            var prompt = $@"Generate a hypothetical document that would answer this question.

Question: {query}

Write a detailed paragraph as if it were found in a document that directly answers this question.
Be specific and include relevant details, facts, and terminology.
Also identify the key concepts covered in your response.";

            var structuredOptions = new StructuredOutputOptions
            {
                Temperature = 0.7f,
                MaxTokens = 2048,  // Increased from 600 - structured output needs room for JSON schema overhead
                SystemInstruction = "You are a document generator. Create hypothetical documents that would contain information to answer the given question.",
                Model = model
            };

            var result = await _structuredOutputService!.GenerateAsync<HyDEDocumentResult>(
                provider,
                prompt,
                structuredOptions,
                cancellationToken);

            if (result != null && !string.IsNullOrWhiteSpace(result.Document))
            {
                if (result.KeyConcepts.Count > 0)
                {
                    _logger.LogDebug("HyDE key concepts: {Concepts}", string.Join(", ", result.KeyConcepts));
                }
                return result.Document;
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Structured HyDE generation failed");
            return null;
        }
    }

    /// <summary>
    /// Generates HyDE document using text-based response.
    /// </summary>
    private async Task<QueryExpansionResult> GenerateTextBasedHyDEDocumentAsync(
        string query,
        QueryExpansionResult result,
        string providerName,
        string? modelName,
        CancellationToken cancellationToken)
    {
        var provider = _aiProviderFactory.GetProvider(providerName);
        if (provider == null)
        {
            _logger.LogWarning("AI provider {Provider} not available for HyDE", providerName);
            result.Success = false;
            result.Error = $"AI provider {providerName} not available";
            return result;
        }

        var hydePrompt = $@"You are a helpful assistant that generates hypothetical documents.

Given the following question, write a detailed paragraph that would be found in a document that directly answers this question.
Write as if you are writing content from that document, not as if you are answering the question.
Be specific and include relevant details, facts, and terminology that would appear in such a document.

Question: {query}

Hypothetical document paragraph:";

        var request = new AIRequest
        {
            Prompt = hydePrompt,
            MaxTokens = 500,
            Temperature = 0.7f,
            Model = modelName
        };
        var aiResponse = await provider.GenerateCompletionAsync(request, cancellationToken);
        var response = aiResponse.Content;

        if (!string.IsNullOrWhiteSpace(response))
        {
            result.HypotheticalDocument = response.Trim();
            result.Success = true;
            _logger.LogDebug("Generated text-based HyDE document: {Doc}",
                result.HypotheticalDocument.Substring(0, Math.Min(100, result.HypotheticalDocument.Length)));
        }
        else
        {
            result.Success = false;
            result.Error = "Empty response from AI provider";
        }

        return result;
    }

    public async Task<List<string>> GenerateMultiQueryAsync(
        string query,
        int count = 3,
        RagOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var variations = new List<string> { query }; // Always include original

        if (!_settings.EnableQueryExpansion || count <= 1)
        {
            return variations;
        }

        // Resolve effective provider/model: user preferences > global defaults
        var effectiveProvider = options?.QueryExpansionProvider ?? _settings.QueryExpansionProvider;
        var effectiveModel = options?.QueryExpansionModel ?? _settings.QueryExpansionModel;

        try
        {
            _logger.LogInformation("Generating {Count} query variations for: {Query}. Provider: {Provider}, Model: {Model}",
                count, query.Substring(0, Math.Min(50, query.Length)),
                effectiveProvider,
                effectiveModel ?? "default");

            // Try structured output first for reliable query list extraction
            if (_structuredOutputService != null)
            {
                var structuredQueries = await GenerateStructuredMultiQueryAsync(query, count - 1, effectiveProvider, effectiveModel, cancellationToken);
                if (structuredQueries != null && structuredQueries.Count > 0)
                {
                    variations.AddRange(structuredQueries);
                    _logger.LogDebug("Generated {Count} structured query variations: {Queries}",
                        structuredQueries.Count, string.Join(" | ", structuredQueries));
                    return variations;
                }

                _logger.LogDebug("Structured output failed for multi-query, falling back to text parsing");
            }

            // Fallback to text-based generation
            var textQueries = await GenerateTextBasedMultiQueryAsync(query, count - 1, effectiveProvider, effectiveModel, cancellationToken);
            variations.AddRange(textQueries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating multi-query variations");
        }

        return variations;
    }

    /// <summary>
    /// Generates query variations using structured output for reliable list extraction.
    /// </summary>
    private async Task<List<string>?> GenerateStructuredMultiQueryAsync(
        string query,
        int count,
        string provider,
        string? model,
        CancellationToken cancellationToken)
    {
        try
        {
            var prompt = $@"Generate {count} alternative search queries for the following question.

Original question: {query}

Generate variations that:
- Use different phrasings or synonyms
- Capture different aspects of the question
- Would help find relevant documents in a search

Provide exactly {count} alternative queries.";

            var structuredOptions = new StructuredOutputOptions
            {
                Temperature = 0.8f,
                MaxTokens = 1024,  // Increased from 400 - structured output needs room for JSON schema overhead
                SystemInstruction = "You are a search query generator. Create alternative phrasings of user queries to improve search recall.",
                Model = model
            };

            var result = await _structuredOutputService!.GenerateAsync<MultiQueryResult>(
                provider,
                prompt,
                structuredOptions,
                cancellationToken);

            if (result != null && result.Queries.Count > 0)
            {
                // Filter and clean queries
                var cleanedQueries = result.Queries
                    .Where(q => !string.IsNullOrWhiteSpace(q) && q.Length > 5)
                    .Take(count)
                    .ToList();

                if (!string.IsNullOrEmpty(result.Explanation))
                {
                    _logger.LogDebug("Multi-query explanation: {Explanation}", result.Explanation);
                }

                return cleanedQueries;
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Structured multi-query generation failed");
            return null;
        }
    }

    /// <summary>
    /// Generates query variations using text-based response with line parsing.
    /// </summary>
    private async Task<List<string>> GenerateTextBasedMultiQueryAsync(
        string query,
        int count,
        string providerName,
        string? modelName,
        CancellationToken cancellationToken)
    {
        var aiProvider = _aiProviderFactory.GetProvider(providerName);
        if (aiProvider == null)
        {
            _logger.LogWarning("AI provider {Provider} not available for multi-query generation", providerName);
            return [];
        }

        var multiQueryPrompt = $@"You are a helpful assistant that generates search query variations.

Given the following question, generate {count} alternative phrasings or related queries that would help find relevant information.
Each variation should capture a different aspect or phrasing of the original question.
Return ONLY the queries, one per line, without numbering or bullets.

Original question: {query}

Alternative queries:";

        var request = new AIRequest { Prompt = multiQueryPrompt, MaxTokens = 300, Temperature = 0.8f, Model = modelName };
        var aiResponse = await aiProvider.GenerateCompletionAsync(request, cancellationToken);
        var response = aiResponse.Content;

        if (!string.IsNullOrWhiteSpace(response))
        {
            var generatedQueries = response
                .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(q => q.Trim())
                .Where(q => !string.IsNullOrWhiteSpace(q) && q.Length > 5)
                .Take(count)
                .ToList();

            _logger.LogDebug("Generated {Count} text-based query variations: {Queries}",
                generatedQueries.Count, string.Join(" | ", generatedQueries));

            return generatedQueries;
        }

        return [];
    }

    public async Task<ExpandedQueryEmbeddings> GetExpandedQueryEmbeddingsAsync(
        string query,
        bool? enableQueryExpansion = null,
        bool? enableHyDE = null,
        RagOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var result = new ExpandedQueryEmbeddings { OriginalQuery = query };

        // Use specified embedding provider if provided, otherwise use default
        // IMPORTANT: For RAG search to work correctly, this must match the provider used during indexing
        var embeddingProvider = !string.IsNullOrEmpty(options?.EmbeddingProvider)
            ? _embeddingProviderFactory.GetProvider(options.EmbeddingProvider)
            : _embeddingProviderFactory.GetDefaultProvider();

        _logger.LogDebug(
            "Using embedding provider: {Provider} (dimensions: {Dims}) for query expansion",
            embeddingProvider.ProviderName, embeddingProvider.Dimensions);

        var totalTokens = 0;

        // Resolve effective settings: passed parameters override defaults from config
        var effectiveEnableHyDE = enableHyDE ?? _settings.EnableHyDE;
        var effectiveEnableQueryExpansion = enableQueryExpansion ?? _settings.EnableQueryExpansion;

        try
        {
            _logger.LogInformation("Starting query expansion pipeline for: {Query}",
                query.Substring(0, Math.Min(50, query.Length)));

            // 1. Generate embedding for original query
            // Pass custom dimensions AND model from RagOptions to ensure query embedding matches stored embedding dimensions
            _logger.LogInformation(
                "Generating query embedding with override. Dimensions: {Dimensions}, Model: {Model}, Provider: {Provider}",
                options?.EmbeddingDimensions, options?.EmbeddingModel ?? "default", embeddingProvider.ProviderName);
            var originalEmbedding = await embeddingProvider.GenerateEmbeddingAsync(query, cancellationToken, options?.EmbeddingDimensions, options?.EmbeddingModel);
            if (originalEmbedding.Success)
            {
                result.OriginalEmbedding = originalEmbedding.Embedding;
                totalTokens += originalEmbedding.TokensUsed;

                // Set embedding dimensions from actual embedding or provider configuration
                result.EmbeddingDimensions = originalEmbedding.Embedding.Any()
                    ? originalEmbedding.Embedding.Count
                    : embeddingProvider.Dimensions;
            }
            else
            {
                _logger.LogWarning("Failed to generate original query embedding: {Error}", originalEmbedding.Error);
                return result;
            }

            // 2. Generate HyDE embedding if enabled
            if (effectiveEnableHyDE)
            {
                var hydeResult = await ExpandQueryWithHyDEAsync(query, options, cancellationToken);
                if (hydeResult.Success && !string.IsNullOrWhiteSpace(hydeResult.HypotheticalDocument))
                {
                    result.HypotheticalDocument = hydeResult.HypotheticalDocument;

                    var hydeEmbedding = await embeddingProvider.GenerateEmbeddingAsync(
                        hydeResult.HypotheticalDocument, cancellationToken, options?.EmbeddingDimensions, options?.EmbeddingModel);

                    if (hydeEmbedding.Success)
                    {
                        result.HyDEEmbedding = hydeEmbedding.Embedding;
                        totalTokens += hydeEmbedding.TokensUsed;
                    }
                }
            }

            // 3. Generate multi-query embeddings if enabled
            if (effectiveEnableQueryExpansion && _settings.MultiQueryCount > 1)
            {
                var queryVariations = await GenerateMultiQueryAsync(
                    query, _settings.MultiQueryCount, options, cancellationToken);

                result.QueryVariations = queryVariations;

                // Generate embeddings for variations (skip original as we already have it)
                foreach (var variation in queryVariations.Skip(1))
                {
                    var variationEmbedding = await embeddingProvider.GenerateEmbeddingAsync(
                        variation, cancellationToken, options?.EmbeddingDimensions, options?.EmbeddingModel);

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

