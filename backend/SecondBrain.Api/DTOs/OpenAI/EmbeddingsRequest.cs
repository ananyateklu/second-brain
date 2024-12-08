using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.OpenAI
{
    public class EmbeddingsRequest
    {
        [JsonPropertyName("input")]
        public required string Input { get; set; }

        [JsonPropertyName("model")]
        public required string Model { get; set; }

        [JsonPropertyName("encoding_format")]
        public required string EncodingFormat { get; set; } = "float";
    }

    public class EmbeddingsResponse
    {
        [JsonPropertyName("object")]
        public required string Object { get; set; }

        [JsonPropertyName("data")]
        public required List<EmbeddingData> Data { get; set; }

        [JsonPropertyName("model")]
        public required string Model { get; set; }

        [JsonPropertyName("usage")]
        public required Usage Usage { get; set; }
    }

    public class EmbeddingData
    {
        [JsonPropertyName("object")]
        public required string Object { get; set; }

        [JsonPropertyName("embedding")]
        public required float[] Embedding { get; set; }

        [JsonPropertyName("index")]
        public int Index { get; set; }
    }
} 