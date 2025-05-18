using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class OpenAIModelInfo
    {
        [JsonPropertyName("id")]
        public required string Id { get; set; }

        [JsonPropertyName("object")]
        public required string Object { get; set; } // e.g., "model"

        [JsonPropertyName("created")]
        public long Created { get; set; } // Unix timestamp

        [JsonPropertyName("owned_by")]
        public required string OwnedBy { get; set; }

        // OpenAI's actual /v1/models endpoint might return more fields.
        // Common ones that could be useful if available:
        // [JsonPropertyName("display_name")] 
        // public string? DisplayName { get; set; }

        // [JsonPropertyName("description")]
        // public string? Description { get; set; }

        // [JsonPropertyName("context_window")]
        // public int? ContextWindow { get; set; }
    }
} 