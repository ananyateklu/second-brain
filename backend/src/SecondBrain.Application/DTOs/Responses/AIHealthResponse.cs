using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model for AI provider health check
/// </summary>
public class AIHealthResponse
{
    public DateTime CheckedAt { get; set; }
    public IEnumerable<AIProviderHealth> Providers { get; set; } = new List<AIProviderHealth>();
}

/// <summary>
/// Information about an AI provider
/// </summary>
public class ProviderInfo
{
    public string Name { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}

