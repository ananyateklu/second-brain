namespace SecondBrain.Application.DTOs.Requests;

/// <summary>
/// Request model for generating AI-powered suggested prompts based on user's notes
/// </summary>
public class GenerateSuggestedPromptsRequest
{
    /// <summary>
    /// The AI provider to use for generating prompts (e.g., "OpenAI", "Anthropic", "Gemini")
    /// </summary>
    public string? Provider { get; set; }

    /// <summary>
    /// The model to use for generating prompts (e.g., "gpt-4o-mini", "claude-3-haiku")
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Number of prompts to generate (default: 4)
    /// </summary>
    public int Count { get; set; } = 4;
}

