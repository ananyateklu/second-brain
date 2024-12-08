using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Gemini
{
    public class GeminiRequest
    {
        [JsonPropertyName("contents")]
        public required GeminiContent[] Contents { get; set; }

        [JsonPropertyName("safetySettings")]
        public required SafetySetting[] SafetySettings { get; set; }

        [JsonPropertyName("generationConfig")]
        public required GenerationConfig GenerationConfig { get; set; }
    }

    public class GeminiContent
    {
        [JsonPropertyName("parts")]
        public required ContentPart[] Parts { get; set; }
    }

    public class ContentPart
    {
        [JsonPropertyName("text")]
        public required string Text { get; set; }
    }

    public class SafetySetting
    {
        [JsonPropertyName("category")]
        public required string Category { get; set; }

        [JsonPropertyName("threshold")]
        public required string Threshold { get; set; }
    }

    public class GenerationConfig
    {
        [JsonPropertyName("stopSequences")]
        public required string[] StopSequences { get; set; }

        [JsonPropertyName("temperature")]
        public float Temperature { get; set; }

        [JsonPropertyName("maxOutputTokens")]
        public int MaxOutputTokens { get; set; }

        [JsonPropertyName("topP")]
        public float TopP { get; set; }

        [JsonPropertyName("topK")]
        public int TopK { get; set; }
    }
}
