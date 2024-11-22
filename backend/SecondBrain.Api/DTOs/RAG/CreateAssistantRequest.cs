namespace SecondBrain.Api.DTOs.RAG
{
    public class CreateAssistantRequest
    {
        public string FileId { get; set; } = string.Empty;
        public string Instructions { get; set; } = string.Empty;
    }
} 