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

    public class ExecutionMetadata
    {
        [JsonPropertyName("model")]
        public required string Model { get; set; }

        [JsonPropertyName("execution_time")]
        public float ExecutionTime { get; set; }

        [JsonPropertyName("prompt")]
        public required string Prompt { get; set; }

        [JsonPropertyName("temperature")]
        public float Temperature { get; set; }

        [JsonPropertyName("provider")]
        public required string Provider { get; set; }

        [JsonPropertyName("tools_used")]
        public List<Tool>? ToolsUsed { get; set; }

        [JsonPropertyName("token_usage")]
        public TokenUsage? TokenUsage { get; set; }

        [JsonPropertyName("request_id")]
        public string? RequestId { get; set; }

        [JsonPropertyName("research_parameters")]
        public Dictionary<string, object>? ResearchParameters { get; set; }

        [JsonPropertyName("agent_type")]
        public string? AgentType { get; set; }

        [JsonPropertyName("base_agent")]
        public string? BaseAgent { get; set; }

        [JsonPropertyName("tool_success_rate")]
        public Dictionary<string, object>? ToolSuccessRate { get; set; }
    }

    public class AgentResponse
    {
        [JsonPropertyName("result")]
        public required string Result { get; set; }

        [JsonPropertyName("metadata")]
        public ExecutionMetadata? Metadata { get; set; }
    }
} 