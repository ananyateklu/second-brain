using System.IO;
using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class TextToSpeechResponse
    {
        [JsonIgnore]
        public required Stream AudioStream { get; set; }

        [JsonPropertyName("model")]
        public required string Model { get; set; }

        [JsonPropertyName("usage")]
        public required Usage Usage { get; set; }
    }
} 