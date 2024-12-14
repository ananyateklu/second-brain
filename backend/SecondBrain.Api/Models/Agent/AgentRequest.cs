namespace SecondBrain.Api.Models.Agent
{
    public class AgentRequest
    {
        public required string Prompt { get; set; }
        public required string ModelId { get; set; }
        public int? MaxTokens { get; set; }
        public float? Temperature { get; set; }
        public List<Dictionary<string, object>>? Tools { get; set; }
    }
} 