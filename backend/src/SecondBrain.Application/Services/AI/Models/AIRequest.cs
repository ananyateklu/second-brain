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
}
