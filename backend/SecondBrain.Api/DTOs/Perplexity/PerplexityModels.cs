using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Perplexity
{
    public enum PerplexityModelType
    {
        // Search Models
        Sonar = 0,
        SonarPro = 1,
        
        // Research Models
        SonarDeepResearch = 2,
        
        // Reasoning Models
        SonarReasoning = 3,
        SonarReasoningPro = 4
    }

    public class PerplexityModelInfo
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("category")]
        public string Category { get; set; } = string.Empty;
    }

    public class AvailableModelsResponse
    {
        [JsonPropertyName("models")]
        public List<PerplexityModelInfo> Models { get; set; } = new List<PerplexityModelInfo>();
    }
} 