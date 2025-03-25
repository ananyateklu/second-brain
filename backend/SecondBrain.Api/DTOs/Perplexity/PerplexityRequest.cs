using System.Collections.Generic;
using System.Text.Json.Serialization;
using SecondBrain.Api.Constants;

namespace SecondBrain.Api.DTOs.Perplexity
{
    public class PerplexityMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    public class PerplexityRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = PerplexityModels.Default;

        [JsonPropertyName("messages")]
        public List<PerplexityMessage> Messages { get; set; } = new List<PerplexityMessage>();

        [JsonPropertyName("temperature")]
        public double? Temperature { get; set; }

        [JsonPropertyName("top_p")]
        public double? TopP { get; set; }

        [JsonPropertyName("max_tokens")]
        public int? MaxTokens { get; set; }

        [JsonPropertyName("stream")]
        public bool Stream { get; set; } = false;
    }

    public class SearchRequest
    {
        public string Query { get; set; } = string.Empty;
        public double? Temperature { get; set; } = 0.7;
        public string? Model { get; set; } = PerplexityModels.Default;
    }
} 