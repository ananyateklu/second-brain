namespace SecondBrain.Api.Models.Agent
{
    public class ExecutionMetadata
    {
        public string Model { get; set; } = string.Empty;
        public double ExecutionTime { get; set; }
        public TokenUsage TokenUsage { get; set; } = new();
        public string Provider { get; set; } = string.Empty;
        public string RequestId { get; set; } = string.Empty;
        public double TotalExecutionTime { get; set; }
        public string AgentType { get; set; } = string.Empty;
        public string? Prompt { get; set; }
    }
}