using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class AudioTranscriptionResponse
    {
        [JsonPropertyName("text")]
        public string Text { get; set; }

        [JsonPropertyName("usage")]
        public Usage Usage { get; set; }
    }
} 