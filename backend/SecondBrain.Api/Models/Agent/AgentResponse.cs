using System.Text.Json.Serialization;

namespace SecondBrain.Api.Models.Agent
{
    public class AgentResponse
    {
        [JsonPropertyName("result")]
        public required string Result { get; set; }

        [JsonPropertyName("metadata")]
        public ExecutionMetadata? Metadata { get; set; }
    }
}