using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class ImageGenerationRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; }

        [JsonPropertyName("prompt")]
        public string Prompt { get; set; }

        [JsonPropertyName("n")]
        public int N { get; set; } = 1;

        [JsonPropertyName("size")]
        public string Size { get; set; } = "1024x1024";

        [JsonPropertyName("quality")]
        public string Quality { get; set; } = "standard";

        [JsonPropertyName("style")]
        public string Style { get; set; } = "natural";
    }

    public class ImageGenerationResponse
    {
        [JsonPropertyName("data")]
        public List<ImageData> Data { get; set; }
    }

    public class ImageData
    {
        [JsonPropertyName("url")]
        public string Url { get; set; }
    }
} 