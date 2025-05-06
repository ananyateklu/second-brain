namespace SecondBrain.Api.DTOs.Ollama
{
    public class OllamaRequest
    {
        public required string Prompt { get; set; }
        public required string ModelName { get; set; }
        public int NumPredict { get; set; } = 2048;
    }
} 