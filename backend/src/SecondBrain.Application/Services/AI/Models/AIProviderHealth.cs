namespace SecondBrain.Application.Services.AI.Models;

public class AIProviderHealth
{
    public string Provider { get; set; } = string.Empty;
    public bool IsHealthy { get; set; }
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = string.Empty;
    public int ResponseTimeMs { get; set; }
    public string? Version { get; set; }

    /// <summary>
    /// List of available model IDs. Kept for backward compatibility.
    /// </summary>
    public IEnumerable<string>? AvailableModels { get; set; }

    /// <summary>
    /// Detailed model information including context window limits.
    /// Preferred over AvailableModels for clients that need context information.
    /// </summary>
    public IEnumerable<AIModelInfo>? Models { get; set; }

    public string? ErrorMessage { get; set; }
}
