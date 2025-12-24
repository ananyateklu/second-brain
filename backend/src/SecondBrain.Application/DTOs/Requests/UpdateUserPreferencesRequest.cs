namespace SecondBrain.Application.DTOs.Requests;

public class UpdateUserPreferencesRequest
{
    public string? ChatProvider { get; set; }
    public string? ChatModel { get; set; }
    public string? VectorStoreProvider { get; set; }
    public string? DefaultNoteView { get; set; }
    public int? ItemsPerPage { get; set; }
    public string? FontSize { get; set; }
    public bool? EnableNotifications { get; set; }
    public string? OllamaRemoteUrl { get; set; }
    public bool? UseRemoteOllama { get; set; }
    public string? RerankingProvider { get; set; }

    // Note Summary settings
    public bool? NoteSummaryEnabled { get; set; }
    public string? NoteSummaryProvider { get; set; }
    public string? NoteSummaryModel { get; set; }

    // RAG Feature Toggles
    public bool? RagEnableHyde { get; set; }
    public bool? RagEnableQueryExpansion { get; set; }
    public bool? RagEnableHybridSearch { get; set; }
    public bool? RagEnableReranking { get; set; }
    public bool? RagEnableAnalytics { get; set; }

    // Reranking Model Setting
    public string? RagRerankingModel { get; set; }

    // HyDE Provider Settings
    public string? RagHydeProvider { get; set; }
    public string? RagHydeModel { get; set; }

    // Query Expansion Provider Settings
    public string? RagQueryExpansionProvider { get; set; }
    public string? RagQueryExpansionModel { get; set; }

    // RAG Advanced Settings - Tier 1: Core Retrieval
    public int? RagTopK { get; set; }
    public float? RagSimilarityThreshold { get; set; }
    public int? RagInitialRetrievalCount { get; set; }
    public float? RagMinRerankScore { get; set; }

    // RAG Advanced Settings - Tier 2: Hybrid Search
    public float? RagVectorWeight { get; set; }
    public float? RagBm25Weight { get; set; }
    public int? RagMultiQueryCount { get; set; }
    public int? RagMaxContextLength { get; set; }

    // RAG Embedding Settings
    public string? RagEmbeddingProvider { get; set; }
    public string? RagEmbeddingModel { get; set; }
    public int? RagEmbeddingDimensions { get; set; }
}

