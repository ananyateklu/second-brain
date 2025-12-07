namespace SecondBrain.Application.Services.AI.Models;

public class AIRequest
{
    public string Prompt { get; set; } = string.Empty;
    public string? Model { get; set; }
    public int? MaxTokens { get; set; }
    public float? Temperature { get; set; }
    public Dictionary<string, object>? AdditionalParameters { get; set; }

    /// <summary>
    /// Optional override for Ollama base URL (for remote Ollama support)
    /// </summary>
    public string? OllamaBaseUrl { get; set; }

    /// <summary>
    /// Enable extended thinking for complex reasoning (Claude 3.5+ models)
    /// </summary>
    public bool? EnableThinking { get; set; }

    /// <summary>
    /// Token budget for thinking process (min: 1024, default: 10000)
    /// </summary>
    public int? ThinkingBudget { get; set; }

    /// <summary>
    /// Enable prompt caching to reduce costs and latency (Claude)
    /// </summary>
    public bool? EnablePromptCaching { get; set; }
}
