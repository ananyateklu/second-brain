using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Gemini
{
    public class GeminiResponse
    {
        [JsonPropertyName("candidates")]
        public required Candidate[] Candidates { get; set; }

        [JsonPropertyName("promptFeedback")]
        public required PromptFeedback PromptFeedback { get; set; }
    }

    public class Candidate
    {
        [JsonPropertyName("content")]
        public required GeminiContent Content { get; set; }

        [JsonPropertyName("finishReason")]
        public required string FinishReason { get; set; }

        [JsonPropertyName("index")]
        public int Index { get; set; }

        [JsonPropertyName("safetyRatings")]
        public required SafetyRating[] SafetyRatings { get; set; }
    }

    public class SafetyRating
    {
        [JsonPropertyName("category")]
        public required string Category { get; set; }

        [JsonPropertyName("probability")]
        public required string Probability { get; set; }
    }

    public class PromptFeedback
    {
        [JsonPropertyName("safetyRatings")]
        public required SafetyRating[] SafetyRatings { get; set; }
    }
}
