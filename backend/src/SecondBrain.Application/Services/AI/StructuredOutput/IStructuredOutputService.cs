namespace SecondBrain.Application.Services.AI.StructuredOutput;

/// <summary>
/// Unified service for generating structured JSON output from any AI provider.
/// Ensures model responses conform to specified C# types using provider-specific mechanisms.
/// </summary>
public interface IStructuredOutputService
{
    /// <summary>
    /// Generate structured output matching the specified type using the default provider.
    /// </summary>
    /// <typeparam name="T">The type to generate. Must be a class with public properties.</typeparam>
    /// <param name="prompt">The prompt to send to the model.</param>
    /// <param name="options">Optional generation options.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The parsed response, or null if generation/parsing failed.</returns>
    Task<T?> GenerateAsync<T>(
        string prompt,
        StructuredOutputOptions? options = null,
        CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Generate structured output matching the specified type using a specific provider.
    /// </summary>
    /// <typeparam name="T">The type to generate. Must be a class with public properties.</typeparam>
    /// <param name="provider">The AI provider to use (e.g., "OpenAI", "Anthropic", "Gemini", "Grok", "Ollama").</param>
    /// <param name="prompt">The prompt to send to the model.</param>
    /// <param name="options">Optional generation options.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The parsed response, or null if generation/parsing failed.</returns>
    Task<T?> GenerateAsync<T>(
        string provider,
        string prompt,
        StructuredOutputOptions? options = null,
        CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Get the list of available providers that support structured output.
    /// </summary>
    IEnumerable<string> GetAvailableProviders();

    /// <summary>
    /// Check if a specific provider is available and configured.
    /// </summary>
    /// <param name="provider">The provider name to check.</param>
    bool IsProviderAvailable(string provider);

    /// <summary>
    /// Get the default provider name.
    /// </summary>
    string DefaultProvider { get; }
}

/// <summary>
/// Options for structured output generation.
/// </summary>
public class StructuredOutputOptions
{
    /// <summary>
    /// The model to use. If null, uses the provider's default model.
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Temperature for generation (0.0-1.0). Lower = more deterministic.
    /// Default is 0.1 for structured output to ensure consistency.
    /// </summary>
    public float Temperature { get; set; } = 0.1f;

    /// <summary>
    /// Maximum tokens for the response.
    /// </summary>
    public int? MaxTokens { get; set; }

    /// <summary>
    /// System instruction to prepend to the prompt.
    /// </summary>
    public string? SystemInstruction { get; set; }

    /// <summary>
    /// Whether to use strict schema validation (where supported).
    /// Default is true for reliable structured output.
    /// </summary>
    public bool StrictMode { get; set; } = true;
}

/// <summary>
/// Result of a structured output generation, including metadata.
/// </summary>
/// <typeparam name="T">The type of the generated result.</typeparam>
public class StructuredOutputResult<T> where T : class
{
    /// <summary>
    /// Whether the generation was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The generated result, or null if generation failed.
    /// </summary>
    public T? Result { get; set; }

    /// <summary>
    /// The provider that was used for generation.
    /// </summary>
    public string Provider { get; set; } = string.Empty;

    /// <summary>
    /// The model that was used for generation.
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// Error message if generation failed.
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// The raw JSON response from the model (for debugging).
    /// </summary>
    public string? RawResponse { get; set; }

    /// <summary>
    /// Input tokens used (if available).
    /// </summary>
    public int? InputTokens { get; set; }

    /// <summary>
    /// Output tokens used (if available).
    /// </summary>
    public int? OutputTokens { get; set; }
}
