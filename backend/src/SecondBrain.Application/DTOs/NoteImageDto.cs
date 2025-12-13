namespace SecondBrain.Application.DTOs;

/// <summary>
/// DTO for creating/updating note images.
/// </summary>
public class NoteImageDto
{
    /// <summary>
    /// Optional ID for existing images (used when updating).
    /// </summary>
    public string? Id { get; set; }

    /// <summary>
    /// Base64-encoded image data (without data URL prefix).
    /// </summary>
    public required string Base64Data { get; set; }

    /// <summary>
    /// MIME type of the image (e.g., 'image/jpeg', 'image/png').
    /// </summary>
    public string MediaType { get; set; } = "image/jpeg";

    /// <summary>
    /// Original filename (optional).
    /// </summary>
    public string? FileName { get; set; }

    /// <summary>
    /// User-provided alternative text describing the image.
    /// </summary>
    public string? AltText { get; set; }
}
