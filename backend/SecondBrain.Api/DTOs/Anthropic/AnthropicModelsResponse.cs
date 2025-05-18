using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace SecondBrain.Api.DTOs.Anthropic
{
    public class AnthropicModelsResponse
    {
        [JsonPropertyName("data")]
        public required List<AnthropicModelInfo> Data { get; set; }

        [JsonPropertyName("first_id")]
        public string? FirstId { get; set; }

        [JsonPropertyName("has_more")]
        public bool HasMore { get; set; }

        [JsonPropertyName("last_id")]
        public string? LastId { get; set; }
    }
} 