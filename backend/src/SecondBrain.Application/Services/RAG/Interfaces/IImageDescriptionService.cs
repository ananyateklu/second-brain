namespace SecondBrain.Application.Services.RAG.Interfaces;

/// <summary>
/// Service for extracting text descriptions from images using vision-capable AI models.
/// Used to enable multi-modal RAG by converting images to searchable text.
/// </summary>
public interface IImageDescriptionService
{
    /// <summary>
    /// Checks if image description extraction is available (at least one vision provider configured).
    /// </summary>
    bool IsAvailable { get; }

    /// <summary>
    /// Extracts a text description from an image for RAG indexing.
    /// </summary>
    /// <param name="base64ImageData">Base64-encoded image data (without data URL prefix).</param>
    /// <param name="mediaType">MIME type of the image (e.g., 'image/jpeg').</param>
    /// <param name="context">Optional context about the image (e.g., note title, surrounding text).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Description result with extracted text and metadata.</returns>
    Task<ImageDescriptionResult> ExtractDescriptionAsync(
        string base64ImageData,
        string mediaType,
        string? context = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Extracts descriptions from multiple images in batch.
    /// </summary>
    /// <param name="images">List of images to process.</param>
    /// <param name="context">Optional context about the images.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of description results.</returns>
    Task<List<ImageDescriptionResult>> ExtractDescriptionsBatchAsync(
        IEnumerable<ImageInput> images,
        string? context = null,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Input for batch image description extraction.
/// </summary>
public class ImageInput
{
    public required string Id { get; set; }
    public required string Base64Data { get; set; }
    public required string MediaType { get; set; }
    public string? AltText { get; set; }
}

/// <summary>
/// Result of image description extraction.
/// </summary>
public class ImageDescriptionResult
{
    /// <summary>
    /// ID of the image (for batch processing).
    /// </summary>
    public string? ImageId { get; set; }

    /// <summary>
    /// Whether extraction was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Extracted text description of the image.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Error message if extraction failed.
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Provider used for extraction (e.g., 'gemini', 'openai').
    /// </summary>
    public string? Provider { get; set; }

    /// <summary>
    /// Model used for extraction (e.g., 'gemini-1.5-flash').
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Input tokens used for extraction (for cost tracking).
    /// </summary>
    public int? InputTokens { get; set; }

    /// <summary>
    /// Output tokens used for extraction (for cost tracking).
    /// </summary>
    public int? OutputTokens { get; set; }

    public static ImageDescriptionResult Failure(string? imageId, string error) => new()
    {
        ImageId = imageId,
        Success = false,
        Error = error
    };

    public static ImageDescriptionResult Ok(string? imageId, string description, string provider, string model) => new()
    {
        ImageId = imageId,
        Success = true,
        Description = description,
        Provider = provider,
        Model = model
    };
}
