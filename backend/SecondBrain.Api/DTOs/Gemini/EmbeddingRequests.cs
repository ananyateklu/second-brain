using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SecondBrain.Api.DTOs.Gemini
{
    public class EmbeddingRequest
    {
        [JsonPropertyName("content")]
        public required GeminiContent Content { get; set; }
        
        [JsonPropertyName("taskType")]
        public string? TaskType { get; set; } // e.g., "SEMANTIC_SIMILARITY", "RETRIEVAL_DOCUMENT"
        
        [JsonPropertyName("title")]
        public string? Title { get; set; } // Optional for RETRIEVAL_DOCUMENT
        
        [JsonPropertyName("outputDimensionality")]
        public int? OutputDimensionality { get; set; } // Optional
    }
    
    public class EmbeddingResponse
    {
        [JsonPropertyName("embedding")]
        public required EmbeddingValues Embedding { get; set; }
    }
    
    public class EmbeddingValues
    {
        [JsonPropertyName("values")]
        public required List<float> Values { get; set; }
    }
    
    public class BatchEmbeddingRequest
    {
        [JsonPropertyName("requests")]
        public required List<EmbeddingRequest> Requests { get; set; }
    }
    
    public class BatchEmbeddingResponse
    {
        [JsonPropertyName("embeddings")]
        public required List<EmbeddingValues> Embeddings { get; set; }
    }
    
    public enum EmbeddingTaskType
    {
        SEMANTIC_SIMILARITY,
        RETRIEVAL_DOCUMENT,
        RETRIEVAL_QUERY,
        CLASSIFICATION,
        CLUSTERING
    }
} 