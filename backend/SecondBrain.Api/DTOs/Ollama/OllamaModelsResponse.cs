using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Ollama
{
    public class OllamaModelsResponse
    {
        [JsonPropertyName("models")]
        public List<OllamaModel> Models { get; set; } = new List<OllamaModel>();
    }

    public class OllamaModel
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("modified_at")]
        public string ModifiedAt { get; set; } = string.Empty;

        [JsonPropertyName("size")]
        public long Size { get; set; }

        [JsonPropertyName("digest")]
        public string Digest { get; set; } = string.Empty;

        [JsonPropertyName("details")]
        public OllamaModelDetails Details { get; set; } = new OllamaModelDetails();
    }

    public class OllamaModelDetails
    {
        [JsonPropertyName("format")]
        public string Format { get; set; } = string.Empty;

        [JsonPropertyName("family")]
        public string Family { get; set; } = string.Empty;

        [JsonPropertyName("families")]
        public List<string>? Families { get; set; }

        [JsonPropertyName("parameter_size")]
        public string ParameterSize { get; set; } = string.Empty;

        [JsonPropertyName("quantization_level")]
        public string QuantizationLevel { get; set; } = string.Empty;
    }
} 