namespace SecondBrain.Application.Services.AI.StructuredOutput;

/// <summary>
/// Service for generating structured JSON output from Gemini using type-safe schemas.
/// Ensures model responses conform to specified C# types.
/// This is the legacy Gemini-specific interface. Consider using IStructuredOutputService for cross-provider support.
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

// Note: StructuredOutputOptions is now defined in IStructuredOutputService.cs
// and used by all providers for consistency.
