using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SecondBrain.Core.Entities;

[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("email")]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Column("username")]
    [MaxLength(50)]
    public string? Username { get; set; }

    [Column("password_hash")]
    [MaxLength(256)]
    public string? PasswordHash { get; set; }

    [Column("display_name")]
    [MaxLength(256)]
    public string DisplayName { get; set; } = string.Empty;

    [Column("api_key")]
    [MaxLength(256)]
    public string? ApiKey { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // Navigation property for preferences (stored in separate table)
    public UserPreferences? Preferences { get; set; }
}

[Table("user_preferences")]
public class UserPreferences
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("user_id")]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    [Column("chat_provider")]
    [MaxLength(50)]
    public string? ChatProvider { get; set; }

    [Column("chat_model")]
    [MaxLength(100)]
    public string? ChatModel { get; set; }

    [Column("vector_store_provider")]
    [MaxLength(50)]
    public string VectorStoreProvider { get; set; } = "PostgreSQL";

    [Column("default_note_view")]
    [MaxLength(20)]
    public string DefaultNoteView { get; set; } = "list";

    [Column("items_per_page")]
    public int ItemsPerPage { get; set; } = 20;

    [Column("font_size")]
    [MaxLength(20)]
    public string FontSize { get; set; } = "medium";

    [Column("enable_notifications")]
    public bool EnableNotifications { get; set; } = true;

    [Column("ollama_remote_url")]
    [MaxLength(256)]
    public string? OllamaRemoteUrl { get; set; }

    [Column("use_remote_ollama")]
    public bool UseRemoteOllama { get; set; } = false;

    [Column("reranking_provider")]
    [MaxLength(50)]
    public string? RerankingProvider { get; set; }

    // Note Summary settings
    [Column("note_summary_enabled")]
    public bool NoteSummaryEnabled { get; set; } = true;

    [Column("note_summary_provider")]
    [MaxLength(50)]
    public string? NoteSummaryProvider { get; set; } = "OpenAI";

    [Column("note_summary_model")]
    [MaxLength(100)]
    public string? NoteSummaryModel { get; set; } = "gpt-4o-mini";

    // RAG Feature Toggles
    [Column("rag_enable_hyde")]
    public bool RagEnableHyde { get; set; } = true;

    [Column("rag_enable_query_expansion")]
    public bool RagEnableQueryExpansion { get; set; } = true;

    [Column("rag_enable_hybrid_search")]
    public bool RagEnableHybridSearch { get; set; } = true;

    [Column("rag_enable_reranking")]
    public bool RagEnableReranking { get; set; } = true;

    [Column("rag_enable_analytics")]
    public bool RagEnableAnalytics { get; set; } = true;

    // Reranking Model Setting
    [Column("rag_reranking_model")]
    [MaxLength(100)]
    public string? RagRerankingModel { get; set; }

    // HyDE Provider Settings
    [Column("rag_hyde_provider")]
    [MaxLength(50)]
    public string? RagHydeProvider { get; set; }

    [Column("rag_hyde_model")]
    [MaxLength(100)]
    public string? RagHydeModel { get; set; }

    // Query Expansion Provider Settings
    [Column("rag_query_expansion_provider")]
    [MaxLength(50)]
    public string? RagQueryExpansionProvider { get; set; }

    [Column("rag_query_expansion_model")]
    [MaxLength(100)]
    public string? RagQueryExpansionModel { get; set; }

    // RAG Advanced Settings - Tier 1: Core Retrieval
    [Column("rag_top_k")]
    public int RagTopK { get; set; } = 5;

    [Column("rag_similarity_threshold")]
    public float RagSimilarityThreshold { get; set; } = 0.3f;

    [Column("rag_initial_retrieval_count")]
    public int RagInitialRetrievalCount { get; set; } = 20;

    [Column("rag_min_rerank_score")]
    public float RagMinRerankScore { get; set; } = 3.0f;

    // RAG Advanced Settings - Tier 2: Hybrid Search
    [Column("rag_vector_weight")]
    public float RagVectorWeight { get; set; } = 0.7f;

    [Column("rag_bm25_weight")]
    public float RagBm25Weight { get; set; } = 0.3f;

    [Column("rag_multi_query_count")]
    public int RagMultiQueryCount { get; set; } = 3;

    [Column("rag_max_context_length")]
    public int RagMaxContextLength { get; set; } = 4000;

    // RAG Embedding Settings
    [Column("rag_embedding_provider")]
    [MaxLength(50)]
    public string? RagEmbeddingProvider { get; set; }

    [Column("rag_embedding_model")]
    [MaxLength(100)]
    public string? RagEmbeddingModel { get; set; }

    [Column("rag_embedding_dimensions")]
    public int? RagEmbeddingDimensions { get; set; }

    // Navigation property back to User
    [ForeignKey("UserId")]
    public User? User { get; set; }
}
