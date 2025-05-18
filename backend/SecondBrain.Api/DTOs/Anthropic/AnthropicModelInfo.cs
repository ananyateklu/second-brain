using System.Text.Json.Serialization;
using System.Collections.Generic; // Added for List<string>

namespace SecondBrain.Api.DTOs.Anthropic
{
    public class AnthropicModelInfo
    {
        [JsonPropertyName("id")]
        public required string Id { get; set; }

        // Removed Name property as it was redundant with Id for mapping purposes.
        // The frontend will map Anthropic's 'id' to AIModel.id and 'display_name' to AIModel.name.

        [JsonPropertyName("display_name")]
        public required string DisplayName { get; set; }
        
        [JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }

        [JsonPropertyName("type")]
        public required string Type { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
        
        [JsonPropertyName("input_token_limit")] // This is a standard field name from Anthropic docs
        public int? InputTokenLimit { get; set; }

        [JsonPropertyName("output_token_limit")] // This is a standard field name from Anthropic docs
        public int? OutputTokenLimit { get; set; }
        
        // Retaining these as they are common and useful, even if not in the minimal example
        [JsonPropertyName("context_window_size")] 
        public int? ContextWindowSize { get; set; } // Often same as input_token_limit

        [JsonPropertyName("max_output_tokens")] 
        public int? MaxOutputTokens { get; set; } // Often same as output_token_limit

        [JsonPropertyName("capabilities")] 
        public List<string>? Capabilities { get; set; }
    }
} 