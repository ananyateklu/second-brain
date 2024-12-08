using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class TextToSpeechRequest
    {
        [JsonPropertyName("input")]
        public required string Input { get; set; }

        [JsonPropertyName("model")]
        public required string Model { get; set; }

        [JsonPropertyName("voice")]
        public required string Voice { get; set; } = "alloy";
    }
} 