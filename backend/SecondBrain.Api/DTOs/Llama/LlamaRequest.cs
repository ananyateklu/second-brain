namespace SecondBrain.Api.DTOs.Llama
{
    public class LlamaRequest
    {
        public required string Prompt { get; set; }
        public required string ModelName { get; set; }
        public int NumPredict { get; set; } = 2048;
    }
} 