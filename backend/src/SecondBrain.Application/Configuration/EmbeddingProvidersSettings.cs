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

    public int ChunkSize { get; set; } = 500;
    public int ChunkOverlap { get; set; } = 50;
    public int TopK { get; set; } = 5;
    public float SimilarityThreshold { get; set; } = 0.7f;
    public int MaxContextLength { get; set; } = 4000;
    public bool EnableChunking { get; set; } = true;
    
    // Options: "PostgreSQL", "Pinecone", "Both"
    public string VectorStoreProvider { get; set; } = "PostgreSQL";
}
