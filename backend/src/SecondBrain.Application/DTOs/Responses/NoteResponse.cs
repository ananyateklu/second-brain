using System.Text.Json;

namespace SecondBrain.Application.DTOs.Responses;

/// <summary>
/// Response model containing full note data (used for get-by-id endpoint)
/// </summary>
public sealed class NoteResponse
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Text content of the note (markdown format for search and display).
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// TipTap/ProseMirror JSON representation of the note content.
    /// This is the canonical format for UI editing - when present, it should be
    /// preferred over Content for editing to avoid lossy format conversions.
    /// </summary>
    public JsonElement? ContentJson { get; set; }

    /// <summary>
    /// Content format indicator: "markdown", "html", or "tiptap_json"
    /// </summary>
    public string ContentFormat { get; set; } = "markdown";

    /// <summary>
    /// AI-generated summary of the note (considering title, tags, and content).
    /// </summary>
    public string? Summary { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsArchived { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Source { get; set; } = "web";
    public string? ExternalId { get; set; }
    public string? Folder { get; set; }

    /// <summary>
    /// Images attached to this note (for multi-modal RAG support).
    /// </summary>
    public List<NoteImageResponse> Images { get; set; } = new();
}

/// <summary>
/// Response model for note images.
/// </summary>
public sealed class NoteImageResponse
{
    public string Id { get; set; } = string.Empty;
    public string NoteId { get; set; } = string.Empty;

    /// <summary>
    /// Base64-encoded image data.
    /// </summary>
    public string Base64Data { get; set; } = string.Empty;

    /// <summary>
    /// MIME type of the image.
    /// </summary>
    public string MediaType { get; set; } = "image/jpeg";

    /// <summary>
    /// Original filename.
    /// </summary>
    public string? FileName { get; set; }

    /// <summary>
    /// Position/order of the image within the note.
    /// </summary>
    public int ImageIndex { get; set; }

    /// <summary>
    /// AI-generated description of the image content.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// User-provided alternative text.
    /// </summary>
    public string? AltText { get; set; }

    /// <summary>
    /// Provider used to generate the description.
    /// </summary>
    public string? DescriptionProvider { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

