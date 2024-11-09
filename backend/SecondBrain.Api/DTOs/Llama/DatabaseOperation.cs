using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Llama
{
    public class DatabaseOperation
    {
        [JsonPropertyName("function")]
        public string Function { get; set; } = string.Empty;

        [JsonPropertyName("arguments")]
        public Dictionary<string, string> Arguments { get; set; } = new();
    }
} 