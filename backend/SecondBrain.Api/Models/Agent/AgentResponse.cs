namespace SecondBrain.Api.Models.Agent
{
    public class AgentResponse
    {
        public required string Result { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
    }
} 