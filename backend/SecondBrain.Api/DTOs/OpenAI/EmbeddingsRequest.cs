using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class EmbeddingsRequest
    {
        [JsonPropertyName("input")]
        public string Input { get; set; }

        [JsonPropertyName("model")]
        public string Model { get; set; }

        [JsonPropertyName("encoding_format")]
        public string EncodingFormat { get; set; } = "float";
    }

    public class EmbeddingsResponse
    {
        [JsonPropertyName("object")]
        public string Object { get; set; }

        [JsonPropertyName("data")]
        public List<EmbeddingData> Data { get; set; }

        [JsonPropertyName("model")]
        public string Model { get; set; }

        [JsonPropertyName("usage")]
        public Usage Usage { get; set; }
    }

    public class EmbeddingData
    {
        [JsonPropertyName("object")]
        public string Object { get; set; }

        [JsonPropertyName("embedding")]
        public float[] Embedding { get; set; }

        [JsonPropertyName("index")]
        public int Index { get; set; }
    }
} 