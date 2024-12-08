using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class AudioTranscriptionResponse
    {
        [JsonPropertyName("text")]
        public required string Text { get; set; }

        [JsonPropertyName("usage")]
        public required Usage Usage { get; set; }
    }
} 