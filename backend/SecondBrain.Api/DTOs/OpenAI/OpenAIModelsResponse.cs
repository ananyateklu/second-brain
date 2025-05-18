using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class OpenAIModelsResponse
    {
        [JsonPropertyName("object")]
        public required string Object { get; set; } // e.g., "list"

        [JsonPropertyName("data")]
        public required List<OpenAIModelInfo> Data { get; set; }

        // The example didn't show pagination fields like has_more, first_id, last_id
        // but OpenAI list APIs often have them. If they exist, they can be added here.
        // For example:
        // [JsonPropertyName("has_more")]
        // public bool? HasMore { get; set; }
    }
} 