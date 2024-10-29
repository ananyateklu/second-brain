using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Anthropic
{
    public class SendMessageResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; }

        [JsonPropertyName("role")]
        public string Role { get; set; }

        [JsonPropertyName("content")]
        public List<ContentBlock> Content { get; set; }

        [JsonPropertyName("model")]
        public string Model { get; set; }

        [JsonPropertyName("stop_reason")]
        public string StopReason { get; set; }

        [JsonPropertyName("stop_sequence")]
        public object StopSequence { get; set; }

        [JsonPropertyName("usage")]
        public Usage Usage { get; set; }
    }

    public class ContentBlock
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } // e.g., "text", "tool_use", "tool_result"

        // For "text" type
        [JsonPropertyName("text")]
        public string Text { get; set; }

        // For "tool_use" type
        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; }

        [JsonPropertyName("input")]
        public object Input { get; set; }

        // For "tool_result" type
        [JsonPropertyName("tool_use_id")]
        public string ToolUseId { get; set; }

        [JsonPropertyName("content")]
        public object Content { get; set; }

        [JsonPropertyName("is_error")]
        public bool? IsError { get; set; }
    }

    public class Usage
    {
        [JsonPropertyName("input_tokens")]
        public int InputTokens { get; set; }

        [JsonPropertyName("output_tokens")]
        public int OutputTokens { get; set; }
    }
}
