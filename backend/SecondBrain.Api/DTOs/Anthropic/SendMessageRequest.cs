using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Anthropic
{
    public class SendMessageRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; }

        [JsonPropertyName("max_tokens")]
        public int MaxTokens { get; set; }

        [JsonPropertyName("messages")]
        public List<Message> Messages { get; set; }

        [JsonPropertyName("tools")]
        public List<Tool> Tools { get; set; }
    }

    public class Message
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } // "user" or "assistant"

        [JsonPropertyName("content")]
        public string Content { get; set; }
    }

    public class Tool
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } // Must match regex ^[a-zA-Z0-9_-]{1,64}$

        [JsonPropertyName("description")]
        public string Description { get; set; } // Detailed description of the tool

        [JsonPropertyName("input_schema")]
        public object InputSchema { get; set; } // JSON Schema object
    }
}
