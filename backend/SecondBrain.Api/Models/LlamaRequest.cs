namespace SecondBrain.Api.Models
{
    public class LlamaRequest
    {
        public string Prompt { get; set; } = string.Empty;
        public string ModelId { get; set; } = string.Empty;
        public string MessageId { get; set; } = string.Empty;
    }
} 