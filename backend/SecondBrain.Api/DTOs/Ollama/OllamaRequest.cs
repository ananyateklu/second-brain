namespace SecondBrain.Api.DTOs.Ollama
{
    public class OllamaRequest
    {
        public string Prompt { get; set; } = string.Empty;
        public string ModelId { get; set; } = string.Empty;
        public int? MaxTokens { get; set; }
        public float? Temperature { get; set; }
        public float? TopP { get; set; }
        public float? FrequencyPenalty { get; set; }
        public float? PresencePenalty { get; set; }
        public int NumPredict { get; set; } = 2048;
    }
} 