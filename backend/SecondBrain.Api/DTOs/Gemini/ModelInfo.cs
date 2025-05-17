using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace SecondBrain.Api.DTOs.Gemini
{
    public class ModelInfo
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
        
        [JsonPropertyName("version")]
        public string Version { get; set; } = string.Empty;
        
        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = string.Empty;
        
        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;
        
        [JsonPropertyName("inputTokenLimit")]
        public int InputTokenLimit { get; set; }
        
        [JsonPropertyName("outputTokenLimit")]
        public int OutputTokenLimit { get; set; }
        
        [JsonPropertyName("supportedGenerationMethods")]
        public List<string> SupportedGenerationMethods { get; set; } = new();
        
        [JsonPropertyName("temperature")]
        public float? DefaultTemperature { get; set; }
        
        [JsonPropertyName("topP")]
        public float? DefaultTopP { get; set; }
        
        [JsonPropertyName("topK")]
        public int? DefaultTopK { get; set; }
    }

    public class ListModelsResponse
    {
        [JsonPropertyName("models")]
        public List<ModelInfo> Models { get; set; } = new();
        
        [JsonPropertyName("nextPageToken")]
        public string? NextPageToken { get; set; }
    }

    public class TokenCountRequest
    {
        [JsonPropertyName("contents")]
        public List<GeminiContent> Contents { get; set; } = new();
    }

    public class TokenCountResponse
    {
        [JsonPropertyName("totalTokens")]
        public int TotalTokens { get; set; }
    }
} 