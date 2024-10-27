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
    }

    public class Message
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } // "user" or "assistant"

        [JsonPropertyName("content")]
        public string Content { get; set; }
    }
}
