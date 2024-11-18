namespace SecondBrain.Api.DTOs.Llama
{
    public class LlamaRequest
    {
        public string Prompt { get; set; }
        public string ModelName { get; set; }
        public int NumPredict { get; set; } = 2048;
    }
} 