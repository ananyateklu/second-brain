using System.Text.Json.Serialization;

namespace SecondBrain.Api.Models.Agent
{
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
        public Dictionary<string, int>? TokenUsage { get; set; }

        [JsonPropertyName("request_id")]
        public string? RequestId { get; set; }

        [JsonPropertyName("research_parameters")]
        public Dictionary<string, object>? ResearchParameters { get; set; }
    }

    public class AgentResponse
    {
        [JsonPropertyName("result")]
        public required string Result { get; set; }

        [JsonPropertyName("metadata")]
        public ExecutionMetadata? Metadata { get; set; }
    }
} 