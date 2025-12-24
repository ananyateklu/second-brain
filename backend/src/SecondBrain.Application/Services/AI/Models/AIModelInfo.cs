namespace SecondBrain.Application.Services.AI.Models;

/// <summary>
/// Represents detailed information about an AI model, including context window limits.
/// </summary>
public class AIModelInfo
{
    /// <summary>
    /// The unique identifier for the model (e.g., "gpt-4o", "claude-3-5-sonnet-20241022").
    /// </summary>
    public required string Id { get; set; }

    /// <summary>
    /// A human-readable display name for the model.
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// The maximum context window size in tokens (input tokens limit).
    /// </summary>
    public int? ContextWindow { get; set; }

    /// <summary>
    /// The maximum number of output tokens the model can generate.
    /// </summary>
    public int? MaxOutputTokens { get; set; }
}
