using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Perplexity
{
    public class PerplexityCompletion
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    public class PerplexityChoice
    {
        [JsonPropertyName("index")]
        public int Index { get; set; }

        [JsonPropertyName("message")]
        public PerplexityCompletion Message { get; set; } = new PerplexityCompletion();

        [JsonPropertyName("finish_reason")]
        public string FinishReason { get; set; } = string.Empty;
    }

    public class PerplexityUsage
    {
        [JsonPropertyName("prompt_tokens")]
        public int PromptTokens { get; set; }

        [JsonPropertyName("completion_tokens")]
        public int CompletionTokens { get; set; }

        [JsonPropertyName("total_tokens")]
        public int TotalTokens { get; set; }
    }

    public class PerplexityResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("choices")]
        public List<PerplexityChoice> Choices { get; set; } = new List<PerplexityChoice>();

        [JsonPropertyName("usage")]
        public PerplexityUsage Usage { get; set; } = new PerplexityUsage();
    }

    public class PerplexityErrorResponse
    {
        [JsonPropertyName("error")]
        public PerplexityError Error { get; set; } = new PerplexityError();
    }

    public class PerplexityError
    {
        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;
    }

    public class SearchResponse
    {
        public string Result { get; set; } = string.Empty;
        public PerplexityUsage Usage { get; set; } = new PerplexityUsage();
        public string Model { get; set; } = string.Empty;
    }
}