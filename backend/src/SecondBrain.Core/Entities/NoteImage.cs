using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SecondBrain.Core.Entities;

/// <summary>
/// Represents an image attached to a note for multi-modal RAG support.
/// Image content is stored as base64 and can be analyzed via vision models.
/// </summary>
[Table("note_images")]
public class NoteImage
{
    [Key]
    [Column("id")]
    public string Id { get; set; } = string.Empty;

    [Column("note_id")]
    [MaxLength(128)]
    public string NoteId { get; set; } = string.Empty;

    [Column("user_id")]
    [MaxLength(128)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// Base64-encoded image data (without data URL prefix).
    /// </summary>
    [Column("base64_data")]
    public string Base64Data { get; set; } = string.Empty;

    /// <summary>
    /// MIME type of the image (e.g., 'image/jpeg', 'image/png').
    /// </summary>
    [Column("media_type")]
    [MaxLength(100)]
    public string MediaType { get; set; } = "image/jpeg";

    /// <summary>
    /// Original filename (optional).
    /// </summary>
    [Column("file_name")]
    [MaxLength(255)]
    public string? FileName { get; set; }

    /// <summary>
    /// Position/order of the image within the note.
    /// </summary>
    [Column("image_index")]
    public int ImageIndex { get; set; }

    /// <summary>
    /// AI-generated description of the image content for RAG indexing.
    /// Extracted using vision models (Gemini, OpenAI, Claude).
    /// </summary>
    [Column("description")]
    [MaxLength(4000)]
    public string? Description { get; set; }

    /// <summary>
    /// Alternative text provided by the user (if any).
    /// </summary>
    [Column("alt_text")]
    [MaxLength(500)]
    public string? AltText { get; set; }

    /// <summary>
    /// Provider used to generate the description (e.g., 'gemini', 'openai').
    /// </summary>
    [Column("description_provider")]
    [MaxLength(50)]
    public string? DescriptionProvider { get; set; }

    /// <summary>
    /// Model used to generate the description (e.g., 'gemini-1.5-flash').
    /// </summary>
    [Column("description_model")]
    [MaxLength(100)]
    public string? DescriptionModel { get; set; }

    /// <summary>
    /// When the description was generated.
    /// </summary>
    [Column("description_generated_at")]
    public DateTime? DescriptionGeneratedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property back to note (ignored to prevent circular serialization).
    /// </summary>
    [ForeignKey("NoteId")]
    [JsonIgnore]
    public Note? Note { get; set; }
}
