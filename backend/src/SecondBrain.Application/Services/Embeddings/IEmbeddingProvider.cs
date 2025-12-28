using SecondBrain.Application.Services.Embeddings.Models;

namespace SecondBrain.Application.Services.Embeddings;

/// <summary>
/// Information about an available embedding model
/// </summary>
public class EmbeddingModelInfo
{
    /// <summary>Model identifier (e.g., "text-embedding-3-small")</summary>
    public required string ModelId { get; init; }

    /// <summary>Human-readable display name</summary>
    public required string DisplayName { get; init; }

    /// <summary>Output dimensions for the model (default/configured value)</summary>
    public required int Dimensions { get; init; }

    /// <summary>Whether this model can be used with Pinecone (requires 1536 dims)</summary>
    public bool SupportsPinecone => Dimensions == 1536 || (SupportsCustomDimensions && MaxDimensions >= 1536 && MinDimensions <= 1536);

    /// <summary>Optional description of the model</summary>
    public string? Description { get; init; }

    /// <summary>Whether this is the default/recommended model for the provider</summary>
    public bool IsDefault { get; init; }

    /// <summary>Whether this model supports custom output dimensions</summary>
    public bool SupportsCustomDimensions { get; init; }

    /// <summary>Minimum allowed dimensions (only set if SupportsCustomDimensions is true)</summary>
    public int? MinDimensions { get; init; }

    /// <summary>Maximum allowed dimensions (only set if SupportsCustomDimensions is true)</summary>
    public int? MaxDimensions { get; init; }
}

public interface IEmbeddingProvider
{
    string ProviderName { get; }
    string ModelName { get; }
    bool IsEnabled { get; }
    int Dimensions { get; }

    /// <summary>
    /// Get available embedding models for this provider.
    /// This method fetches models dynamically from the provider's API when possible.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of available embedding models</returns>
    Task<IEnumerable<EmbeddingModelInfo>> GetAvailableModelsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate embedding for a single text.
    /// </summary>
    /// <param name="text">Text to embed</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <param name="customDimensions">Optional custom dimensions (for providers that support it like Cohere embed-v4.0)</param>
    /// <param name="modelOverride">Optional model override to use instead of the default configured model</param>
    Task<EmbeddingResponse> GenerateEmbeddingAsync(
        string text,
        CancellationToken cancellationToken = default,
        int? customDimensions = null,
        string? modelOverride = null);

    /// <summary>
    /// Generate embeddings for multiple texts.
    /// </summary>
    /// <param name="texts">Texts to embed</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <param name="customDimensions">Optional custom dimensions (for providers that support it like Cohere embed-v4.0)</param>
    /// <param name="modelOverride">Optional model override to use instead of the default configured model</param>
    Task<BatchEmbeddingResponse> GenerateEmbeddingsAsync(
        IEnumerable<string> texts,
        CancellationToken cancellationToken = default,
        int? customDimensions = null,
        string? modelOverride = null);

    Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default);
}

