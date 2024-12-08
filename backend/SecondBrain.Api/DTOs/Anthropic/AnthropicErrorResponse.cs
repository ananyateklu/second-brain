using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Anthropic
{
    public class AnthropicErrorResponse
    {
        [JsonPropertyName("type")]
        public required string Type { get; set; }

        [JsonPropertyName("error")]
        public required AnthropicErrorDetail Error { get; set; }
    }

    public class AnthropicErrorDetail
    {
        [JsonPropertyName("type")]
        public required string Type { get; set; }

        [JsonPropertyName("message")]
        public required string Message { get; set; }
    }
}
