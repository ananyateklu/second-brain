namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model for AI-generated suggested prompts
/// </summary>
public class SuggestedPromptsResponse
{
    /// <summary>
    /// Whether the generation was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// List of generated prompt suggestions
    /// </summary>
    public List<SuggestedPromptDto> Prompts { get; set; } = new();

    /// <summary>
    /// Error message if generation failed
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// The provider used for generation
    /// </summary>
    public string Provider { get; set; } = string.Empty;

    /// <summary>
    /// The model used for generation
    /// </summary>
    public string Model { get; set; } = string.Empty;
}

/// <summary>
/// DTO for a single suggested prompt
/// </summary>
public class SuggestedPromptDto
{
    /// <summary>
    /// Unique identifier for the prompt
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Short label displayed on the prompt chip
    /// </summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>
    /// Full prompt template that will be inserted when clicked
    /// </summary>
    public string PromptTemplate { get; set; } = string.Empty;

    /// <summary>
    /// Category/icon type for the prompt (e.g., "summarize", "analyze", "create", "explore")
    /// </summary>
    public string Category { get; set; } = "explore";
}

