using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.Services.AI.FileManagement;

/// <summary>
/// Service for managing files in Gemini's file storage.
/// Files are stored for 48 hours and can be referenced in subsequent requests.
/// </summary>
public interface IGeminiFileService
{
    /// <summary>
    /// Gets whether the service is enabled and configured.
    /// </summary>
    bool IsEnabled { get; }

    /// <summary>
    /// Upload a file to Gemini for use with code execution or multimodal prompts.
    /// </summary>
    /// <param name="request">The upload request containing bytes, stream, or file path</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The uploaded file metadata, or null if upload failed</returns>
    Task<GeminiUploadedFile?> UploadFileAsync(
        GeminiFileUploadRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Wait for a file to finish processing and become active.
    /// </summary>
    /// <param name="fileName">The file name (e.g., "files/abc123")</param>
    /// <param name="maxWaitSeconds">Maximum seconds to wait (default: 60)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The file metadata when active, or null if timeout/error</returns>
    Task<GeminiUploadedFile?> WaitForFileProcessingAsync(
        string fileName,
        int maxWaitSeconds = 60,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get metadata for an uploaded file.
    /// </summary>
    /// <param name="fileName">The file name (e.g., "files/abc123")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The file metadata, or null if not found</returns>
    Task<GeminiUploadedFile?> GetFileAsync(
        string fileName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete an uploaded file.
    /// </summary>
    /// <param name="fileName">The file name (e.g., "files/abc123")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if deleted successfully</returns>
    Task<bool> DeleteFileAsync(
        string fileName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// List all uploaded files.
    /// </summary>
    /// <param name="maxResults">Maximum number of files to return (default: 100)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of uploaded files</returns>
    Task<List<GeminiUploadedFile>> ListFilesAsync(
        int maxResults = 100,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Upload a file and wait for it to become active.
    /// This is a convenience method that combines upload and wait.
    /// </summary>
    /// <param name="request">The upload request</param>
    /// <param name="maxWaitSeconds">Maximum seconds to wait for processing</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The active file metadata, or null if upload/processing failed</returns>
    Task<GeminiUploadedFile?> UploadAndWaitAsync(
        GeminiFileUploadRequest request,
        int maxWaitSeconds = 60,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Converts a stream to bytes with optimized buffering.
    /// </summary>
    /// <param name="stream">The source stream</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The byte array</returns>
    Task<byte[]> StreamToBytesAsync(Stream stream, CancellationToken cancellationToken = default);
}
