using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class OpenAIErrorResponse
    {
        [JsonPropertyName("error")]
        public OpenAIErrorDetail Error { get; set; }
    }

    public class OpenAIErrorDetail
    {
        [JsonPropertyName("message")]
        public string Message { get; set; }

        [JsonPropertyName("type")]
        public string Type { get; set; }

        [JsonPropertyName("code")]
        public string Code { get; set; }
    }
} 