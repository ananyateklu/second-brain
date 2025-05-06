namespace SecondBrain.Api.Models
{
    public class OllamaRequest
    {
        public string Prompt { get; set; } = string.Empty;
        public string ModelId { get; set; } = string.Empty;
        public string MessageId { get; set; } = string.Empty;
        public int NumPredict { get; set; } = 2048;
    }
} 