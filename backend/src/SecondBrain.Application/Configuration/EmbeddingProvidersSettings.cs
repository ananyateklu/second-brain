using System.ComponentModel.DataAnnotations;

namespace SecondBrain.Application.Configuration;

public class EmbeddingProvidersSettings
{
    public const string SectionName = "EmbeddingProviders";

    public string DefaultProvider { get; set; } = "OpenAI";
    public OpenAIEmbeddingSettings OpenAI { get; set; } = new();
    public GeminiEmbeddingSettings Gemini { get; set; } = new();
    public OllamaEmbeddingSettings Ollama { get; set; } = new();
    // We can include Pinecone here if we want to configure it under EmbeddingProviders,
    // but currently it uses the main PineconeSettings.
}

public class OpenAIEmbeddingSettings
{
    public bool Enabled { get; set; } = true;
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://api.openai.com/v1";
    public string Model { get; set; } = "text-embedding-3-small";
    public int Dimensions { get; set; } = 1536;
    public int TimeoutSeconds { get; set; } = 30;
}

public class GeminiEmbeddingSettings
{
    public bool Enabled { get; set; } = true;
    public string? ApiKey { get; set; }
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";
    public string Model { get; set; } = "models/text-embedding-004";
    public int Dimensions { get; set; } = 768;
    public int TimeoutSeconds { get; set; } = 30;
}

public class OllamaEmbeddingSettings
{
    public bool Enabled { get; set; } = false;
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public string Model { get; set; } = "nomic-embed-text";
    public int Dimensions { get; set; } = 768;
    public int TimeoutSeconds { get; set; } = 120;
}

public class RagSettings
{
    public const string SectionName = "RAG";

    // Basic settings
    public int ChunkSize { get; set; } = 500;
    public int ChunkOverlap { get; set; } = 100; // Increased for better context preservation
    public int TopK { get; set; } = 5;
    public float SimilarityThreshold { get; set; } = 0.3f;
    public int MaxContextLength { get; set; } = 4000;
    public bool EnableChunking { get; set; } = true;

    // Options: "PostgreSQL", "Pinecone", "Both"
    public string VectorStoreProvider { get; set; } = "PostgreSQL";

    // Hybrid Search Settings (Vector + BM25 with RRF)
    public bool EnableHybridSearch { get; set; } = true;
    public float VectorWeight { get; set; } = 0.7f;
    public float BM25Weight { get; set; } = 0.3f;
    public int RRFConstant { get; set; } = 60; // Standard RRF k constant

    /// <summary>
    /// Use PostgreSQL 18 native hybrid search (single-query RRF).
    /// When enabled, combines vector and BM25 search in a single SQL query for better performance.
    /// Requires PostgreSQL 18 with Async I/O and proper indexes (HNSW, GIN).
    /// </summary>
    public bool EnableNativeHybridSearch { get; set; } = true;

    // Query Expansion Settings
    public bool EnableQueryExpansion { get; set; } = true;
    public bool EnableHyDE { get; set; } = true; // Hypothetical Document Embeddings
    public int MultiQueryCount { get; set; } = 3; // Number of query variations to generate

    // Reranking Settings
    public bool EnableReranking { get; set; } = true;
    public int InitialRetrievalCount { get; set; } = 20; // Retrieve more, then rerank to TopK
    public string RerankingProvider { get; set; } = "OpenAI"; // Which LLM to use for reranking

    // Semantic Chunking Settings
    public bool EnableSemanticChunking { get; set; } = true;
    public int MinChunkSize { get; set; } = 100; // Minimum tokens per chunk
    public int MaxChunkSize { get; set; } = 800; // Maximum tokens per chunk

    // Analytics/Observability Settings
    public bool EnableAnalytics { get; set; } = true;
    public bool LogDetailedMetrics { get; set; } = false;
}
