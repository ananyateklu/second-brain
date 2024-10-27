using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Anthropic
{
    public class AnthropicErrorResponse
    {
        [JsonPropertyName("type")]
        public string Type { get; set; }

        [JsonPropertyName("error")]
        public AnthropicErrorDetail Error { get; set; }
    }

    public class AnthropicErrorDetail
    {
        [JsonPropertyName("type")]
        public string Type { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; }
    }
}
