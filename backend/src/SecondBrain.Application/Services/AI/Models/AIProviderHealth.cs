namespace SecondBrain.Application.Services.AI.Models;

public class AIProviderHealth
{
    public string Provider { get; set; } = string.Empty;
    public bool IsHealthy { get; set; }
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = string.Empty;
    public int ResponseTimeMs { get; set; }
    public string? Version { get; set; }
    public IEnumerable<string>? AvailableModels { get; set; }
    public string? ErrorMessage { get; set; }
}
