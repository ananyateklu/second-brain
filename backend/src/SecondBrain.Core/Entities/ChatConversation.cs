using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SecondBrain.Core.Entities;

[Table("chat_conversations")]
public class ChatConversation
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("title")]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [Column("provider")]
    [MaxLength(50)]
    public string Provider { get; set; } = string.Empty;

    [Column("model")]
    [MaxLength(100)]
    public string Model { get; set; } = string.Empty;

    [Column("rag_enabled")]
    public bool RagEnabled { get; set; } = false;

    [Column("agent_enabled")]
    public bool AgentEnabled { get; set; } = false;

    [Column("agent_capabilities")]
    public string? AgentCapabilities { get; set; }

    [Column("vector_store_provider")]
    [MaxLength(50)]
    public string? VectorStoreProvider { get; set; }

    [Column("user_id")]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property for messages (stored in separate table)
    public List<ChatMessage> Messages { get; set; } = new();
}

[Table("chat_messages")]
public class ChatMessage
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("conversation_id")]
    [MaxLength(128)]
    public string ConversationId { get; set; } = string.Empty;

    [Column("role")]
    [MaxLength(20)]
    public string Role { get; set; } = string.Empty; // "user" or "assistant"

    [Column("content")]
    public string Content { get; set; } = string.Empty;

    [Column("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [Column("input_tokens")]
    public int? InputTokens { get; set; }

    [Column("output_tokens")]
    public int? OutputTokens { get; set; }

    [Column("duration_ms")]
    public double? DurationMs { get; set; }

    // Navigation property back to conversation (ignored to prevent circular serialization)
    [ForeignKey("ConversationId")]
    [JsonIgnore]
    public ChatConversation? Conversation { get; set; }

    // Navigation properties for related data
    public List<RetrievedNote> RetrievedNotes { get; set; } = new();
    public List<ToolCall> ToolCalls { get; set; } = new();
}

[Table("tool_calls")]
public class ToolCall
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("message_id")]
    [MaxLength(128)]
    public string MessageId { get; set; } = string.Empty;

    [Column("tool_name")]
    [MaxLength(100)]
    public string ToolName { get; set; } = string.Empty;

    [Column("arguments")]
    public string Arguments { get; set; } = string.Empty;

    [Column("result")]
    public string Result { get; set; } = string.Empty;

    [Column("executed_at")]
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;

    [Column("success")]
    public bool Success { get; set; } = true;

    // Navigation property back to message (ignored to prevent circular serialization)
    [ForeignKey("MessageId")]
    [JsonIgnore]
    public ChatMessage? Message { get; set; }
}

[Table("retrieved_notes")]
public class RetrievedNote
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("message_id")]
    [MaxLength(128)]
    public string MessageId { get; set; } = string.Empty;

    [Column("note_id")]
    [MaxLength(128)]
    public string NoteId { get; set; } = string.Empty;

    [Column("title")]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [Column("tags", TypeName = "text[]")]
    public List<string> Tags { get; set; } = new();

    [Column("relevance_score")]
    public float RelevanceScore { get; set; }

    [Column("chunk_content")]
    public string ChunkContent { get; set; } = string.Empty;

    [Column("chunk_index")]
    public int ChunkIndex { get; set; }

    // Navigation property back to message (ignored to prevent circular serialization)
    [ForeignKey("MessageId")]
    [JsonIgnore]
    public ChatMessage? Message { get; set; }
}
