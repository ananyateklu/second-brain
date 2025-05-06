namespace SecondBrain.Api.DTOs.Ollama
{
    public class OllamaResponse
    {
        public required string Content { get; set; }
        public required string Model { get; set; }
    }
} 