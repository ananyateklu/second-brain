using System.Text.Json.Serialization;

namespace SecondBrain.Api.Models.Agent
{
    public class TokenUsageDetails
    {
        [JsonPropertyName("text_tokens")]
        public int? TextTokens { get; set; }

        [JsonPropertyName("audio_tokens")]
        public int? AudioTokens { get; set; }

        [JsonPropertyName("image_tokens")]
        public int? ImageTokens { get; set; }

        [JsonPropertyName("cached_tokens")]
        public int? CachedTokens { get; set; }
    }

    public class TokenUsage
    {
        [JsonPropertyName("prompt_tokens")]
        public int PromptTokens { get; set; }

        [JsonPropertyName("completion_tokens")]
        public int CompletionTokens { get; set; }

        [JsonPropertyName("total_tokens")]
        public int TotalTokens { get; set; }

        [JsonPropertyName("prompt_tokens_details")]
        public TokenUsageDetails? PromptTokensDetails { get; set; }
    }
}