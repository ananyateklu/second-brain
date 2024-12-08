using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class ImageGenerationRequest
    {
        [JsonPropertyName("model")]
        public required string Model { get; set; }

        [JsonPropertyName("prompt")]
        public required string Prompt { get; set; }

        [JsonPropertyName("n")]
        public int N { get; set; } = 1;

        [JsonPropertyName("size")]
        public required string Size { get; set; } = "1024x1024";

        [JsonPropertyName("quality")]
        public required string Quality { get; set; } = "standard";

        [JsonPropertyName("style")]
        public required string Style { get; set; } = "natural";
    }

    public class ImageGenerationResponse
    {
        [JsonPropertyName("data")]
        public required List<ImageData> Data { get; set; }
    }

    public class ImageData
    {
        [JsonPropertyName("url")]
        public required string Url { get; set; }
    }
} 