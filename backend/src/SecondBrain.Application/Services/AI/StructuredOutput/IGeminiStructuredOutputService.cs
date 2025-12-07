namespace SecondBrain.Application.Services.AI.StructuredOutput;

/// <summary>
/// Service for generating structured JSON output from Gemini using type-safe schemas.
/// Ensures model responses conform to specified C# types.
/// </summary>
public interface IGeminiStructuredOutputService
{
    /// <summary>
    /// Generate structured output matching the specified type.
    /// Uses the default Gemini model from configuration.
    /// </summary>
    /// <typeparam name="T">The type to generate. Must be a class with public properties.</typeparam>
    /// <param name="prompt">The prompt to send to the model.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The parsed response, or null if generation/parsing failed.</returns>
    Task<T?> GenerateAsync<T>(string prompt, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Generate structured output matching the specified type using a specific model.
    /// </summary>
    /// <typeparam name="T">The type to generate. Must be a class with public properties.</typeparam>
    /// <param name="prompt">The prompt to send to the model.</param>
    /// <param name="model">The Gemini model to use (e.g., "gemini-2.0-flash").</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The parsed response, or null if generation/parsing failed.</returns>
    Task<T?> GenerateAsync<T>(string prompt, string model, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Generate structured output with additional options.
    /// </summary>
    /// <typeparam name="T">The type to generate. Must be a class with public properties.</typeparam>
    /// <param name="prompt">The prompt to send to the model.</param>
    /// <param name="options">Additional generation options.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The parsed response, or null if generation/parsing failed.</returns>
    Task<T?> GenerateAsync<T>(string prompt, StructuredOutputOptions options, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// Check if the Gemini structured output service is available.
    /// </summary>
    bool IsAvailable { get; }
}

/// <summary>
/// Options for structured output generation.
/// </summary>
public class StructuredOutputOptions
{
    /// <summary>
    /// The Gemini model to use. If null, uses default from configuration.
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
}
