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

    // Navigation property back to User
    [ForeignKey("UserId")]
    public User? User { get; set; }
}
