using System.IO;
using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class TextToSpeechResponse
    {
        [JsonIgnore]
        public Stream AudioStream { get; set; }

        [JsonPropertyName("model")]
        public string Model { get; set; }

        [JsonPropertyName("usage")]
        public Usage Usage { get; set; }
    }
} 