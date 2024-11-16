using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Gemini
{
    public class GeminiRequest
    {
        [JsonPropertyName("contents")]
        public GeminiContent[] Contents { get; set; }

        [JsonPropertyName("safetySettings")]
        public SafetySetting[] SafetySettings { get; set; }

        [JsonPropertyName("generationConfig")]
        public GenerationConfig GenerationConfig { get; set; }
    }

    public class GeminiContent
    {
        [JsonPropertyName("parts")]
        public ContentPart[] Parts { get; set; }
    }

    public class ContentPart
    {
        [JsonPropertyName("text")]
        public string Text { get; set; }
    }

    public class SafetySetting
    {
        [JsonPropertyName("category")]
        public string Category { get; set; }

        [JsonPropertyName("threshold")]
        public string Threshold { get; set; }
    }

    public class GenerationConfig
    {
        [JsonPropertyName("stopSequences")]
        public string[] StopSequences { get; set; }

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
