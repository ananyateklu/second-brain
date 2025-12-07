namespace SecondBrain.Application.Services.AI.StructuredOutput;

/// <summary>
/// Interface for provider-specific structured output services.
/// Each AI provider implements this interface with their specific mechanism for structured output.
/// </summary>
public interface IProviderStructuredOutputService
{
    /// <summary>
    /// The name of the AI provider (e.g., "OpenAI", "Anthropic", "Gemini", "Grok", "Ollama").
    /// </summary>
    string ProviderName { get; }

    /// <summary>
    /// Whether this provider is currently available and configured.
    /// </summary>
    bool IsAvailable { get; }

    /// <summary>
    /// Generate structured output matching the specified type.
    /// </summary>
    /// <typeparam name="T">The type to generate. Must be a class with public properties.</typeparam>
    /// <param name="prompt">The prompt to send to the model.</param>
    /// <param name="options">Generation options.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A result containing the parsed response and metadata.</returns>
    Task<StructuredOutputResult<T>> GenerateAsync<T>(
        string prompt,
        StructuredOutputOptions options,
        CancellationToken cancellationToken = default) where T : class;
}
