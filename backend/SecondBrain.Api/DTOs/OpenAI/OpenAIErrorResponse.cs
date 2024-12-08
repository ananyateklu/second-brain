using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class OpenAIErrorResponse
    {
        [JsonPropertyName("error")]
        public required OpenAIErrorDetail Error { get; set; }
    }

    public class OpenAIErrorDetail
    {
        [JsonPropertyName("message")]
        public required string Message { get; set; }

        [JsonPropertyName("type")]
        public required string Type { get; set; }

        [JsonPropertyName("code")]
        public required string Code { get; set; }
    }
} 