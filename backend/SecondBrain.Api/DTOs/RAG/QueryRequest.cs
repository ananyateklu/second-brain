namespace SecondBrain.Api.DTOs.RAG
{
    public class QueryRequest
    {
        public string AssistantId { get; set; } = string.Empty;
        public string Prompt { get; set; } = string.Empty;
    }
} 