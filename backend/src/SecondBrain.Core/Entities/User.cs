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
    public string VectorStoreProvider { get; set; } = "Pinecone";

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

    // Navigation property back to User
    [ForeignKey("UserId")]
    public User? User { get; set; }
}
