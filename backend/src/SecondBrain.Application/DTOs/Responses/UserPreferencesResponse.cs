namespace SecondBrain.Application.DTOs.Responses;

public class UserPreferencesResponse
{
    public string? ChatProvider { get; set; }
    public string? ChatModel { get; set; }
    public string VectorStoreProvider { get; set; } = "PostgreSQL";
    public string DefaultNoteView { get; set; } = "list";
    public int ItemsPerPage { get; set; } = 20;
    public string FontSize { get; set; } = "medium";
    public bool EnableNotifications { get; set; } = true;
    public string? OllamaRemoteUrl { get; set; }
    public bool UseRemoteOllama { get; set; } = false;
    public string? RerankingProvider { get; set; }

    // Note Summary settings
    public bool NoteSummaryEnabled { get; set; } = true;
    public string? NoteSummaryProvider { get; set; } = "OpenAI";
    public string? NoteSummaryModel { get; set; } = "gpt-4o-mini";

    // RAG Feature Toggles
    public bool RagEnableHyde { get; set; } = true;
    public bool RagEnableQueryExpansion { get; set; } = true;
    public bool RagEnableHybridSearch { get; set; } = true;
    public bool RagEnableReranking { get; set; } = true;
    public bool RagEnableAnalytics { get; set; } = true;

    // Reranking Model Setting
    public string? RagRerankingModel { get; set; }

    // HyDE Provider Settings
    public string? RagHydeProvider { get; set; }
    public string? RagHydeModel { get; set; }

    // Query Expansion Provider Settings
    public string? RagQueryExpansionProvider { get; set; }
    public string? RagQueryExpansionModel { get; set; }

    // RAG Advanced Settings - Tier 1: Core Retrieval
    public int RagTopK { get; set; } = 5;
    public float RagSimilarityThreshold { get; set; } = 0.3f;
    public int RagInitialRetrievalCount { get; set; } = 20;
    public float RagMinRerankScore { get; set; } = 3.0f;

    // RAG Advanced Settings - Tier 2: Hybrid Search
    public float RagVectorWeight { get; set; } = 0.7f;
    public float RagBm25Weight { get; set; } = 0.3f;
    public int RagMultiQueryCount { get; set; } = 3;
    public int RagMaxContextLength { get; set; } = 4000;

    // RAG Embedding Settings
    public string? RagEmbeddingProvider { get; set; }
    public string? RagEmbeddingModel { get; set; }
    public int? RagEmbeddingDimensions { get; set; }
}

