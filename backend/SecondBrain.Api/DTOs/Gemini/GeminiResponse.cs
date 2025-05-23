using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Gemini
{
    public class GeminiResponse
{
    [JsonPropertyName("candidates")]
    public required Candidate[] Candidates { get; set; }

    [JsonPropertyName("promptFeedback")]
    public PromptFeedback? PromptFeedback { get; set; }
}

    public class Candidate
{
    [JsonPropertyName("content")]
    public required GeminiContent Content { get; set; }

    [JsonPropertyName("finishReason")]
    public string? FinishReason { get; set; }

    [JsonPropertyName("index")]
    public int Index { get; set; }

    [JsonPropertyName("safetyRatings")]
    public SafetyRating[]? SafetyRatings { get; set; }
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
    public SafetyRating[]? SafetyRatings { get; set; }
}
}
