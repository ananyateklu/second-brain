namespace SecondBrain.Api.Models.Agent
{
    public class AIResponse
    {
        public required string Content { get; set; }
        public required string Type { get; set; }
        public ExecutionMetadata? Metadata { get; set; }
    }
}