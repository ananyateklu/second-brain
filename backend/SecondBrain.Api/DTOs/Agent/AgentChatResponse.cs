namespace SecondBrain.Api.DTOs.Agent
{
    public class AgentChatResponse
    {
        public required string Id { get; set; }
        public required string ModelId { get; set; }
        public required string Title { get; set; }
        public DateTime LastUpdated { get; set; }
        public bool IsActive { get; set; }
        public List<AgentMessageResponse> Messages { get; set; } = new();
    }

    public class AgentMessageResponse
    {
        public required string Id { get; set; }
        public required string Role { get; set; }
        public required string Content { get; set; }
        public DateTime Timestamp { get; set; }
        public required string Status { get; set; }
        public List<string> Reactions { get; set; } = new();
        public Dictionary<string, object> Metadata { get; set; } = new();
    }
}