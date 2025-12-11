using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Controller for managing Gemini file uploads for code execution and multimodal analysis.
/// Files are stored for 48 hours in Gemini's file storage.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/gemini/files")]
[Route("api/v{version:apiVersion}/gemini/files")]
[Authorize]
[Produces("application/json")]
public class GeminiFilesController : ControllerBase
{
    private readonly GeminiProvider _geminiProvider;
    private readonly ILogger<GeminiFilesController> _logger;

    // Maximum file size: 2GB (Gemini's limit)
    private const long MaxFileSize = 2L * 1024 * 1024 * 1024;

    // Maximum base64 request size: ~2.67GB (base64 encoding increases size by ~33%)
    // Formula: ceil(MaxFileSize * 4 / 3) + JSON overhead (~1KB)
    private const long MaxBase64RequestSize = (MaxFileSize * 4 / 3) + (1024 * 1024);

    // Supported MIME types for code execution
    private static readonly HashSet<string> SupportedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        // Data files (for code execution analysis)
        "text/csv",
        "application/json",
        "text/plain",
        "application/xml",
        "text/xml",
        "text/tab-separated-values",

        // Images (for multimodal)
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",

        // Documents
        "application/pdf",

        // Code files
        "text/x-python",
        "application/x-python-code",
        "text/javascript",
        "application/javascript"
    };

    public GeminiFilesController(
        GeminiProvider geminiProvider,
        ILogger<GeminiFilesController> logger)
    {
        _geminiProvider = geminiProvider;
        _logger = logger;
    }

    /// <summary>
    /// Upload a file to Gemini for use with code execution or multimodal analysis.
    /// </summary>
    /// <param name="file">The file to upload (max 2GB)</param>
    /// <param name="displayName">Optional display name for the file</param>
    /// <param name="waitForProcessing">If true, wait for file to become active (default: true)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The uploaded file metadata</returns>
    [HttpPost("upload")]
    [RequestSizeLimit(MaxFileSize)]
    [ProducesResponseType(typeof(GeminiUploadedFile), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<GeminiUploadedFile>> UploadFile(
        IFormFile file,
        [FromQuery] string? displayName = null,
        [FromQuery] bool waitForProcessing = true,
        CancellationToken cancellationToken = default)
    {
        if (!_geminiProvider.IsEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "Gemini provider is not enabled" });
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { error = "No file provided" });
        }

        if (file.Length > MaxFileSize)
        {
            return BadRequest(new { error = $"File size exceeds maximum allowed ({MaxFileSize / (1024 * 1024 * 1024)}GB)" });
        }

        // Validate MIME type
        var contentType = file.ContentType ?? "application/octet-stream";
        if (!SupportedMimeTypes.Contains(contentType))
        {
            _logger.LogWarning("Unsupported file type uploaded: {ContentType}", contentType);
            // Allow upload anyway - Gemini will reject if truly unsupported
        }

        // Use streaming to avoid loading large files into memory
        // For files under 10MB, use in-memory upload for efficiency
        // For larger files, stream to temp file to avoid OOM
        const long InMemoryThreshold = 10L * 1024 * 1024; // 10MB

        string? tempFilePath = null;
        try
        {
            GeminiFileUploadRequest request;

            if (file.Length <= InMemoryThreshold)
            {
                // Small file: read into memory (efficient for small files)
                using var memoryStream = new MemoryStream((int)file.Length);
                await file.CopyToAsync(memoryStream, cancellationToken);

                request = new GeminiFileUploadRequest
                {
                    Bytes = memoryStream.ToArray(),
                    FileName = file.FileName,
                    DisplayName = displayName ?? file.FileName,
                    MimeType = contentType
                };
            }
            else
            {
                // Large file: stream to temp file to avoid OOM
                tempFilePath = Path.Combine(Path.GetTempPath(), $"gemini-upload-{Guid.NewGuid()}{Path.GetExtension(file.FileName)}");

                _logger.LogDebug("Streaming large file ({Size} bytes) to temp path: {TempPath}",
                    file.Length, tempFilePath);

                await using (var fileStream = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, FileOptions.Asynchronous))
                {
                    await file.CopyToAsync(fileStream, cancellationToken);
                }

                request = new GeminiFileUploadRequest
                {
                    FilePath = tempFilePath,
                    FileName = file.FileName, // Preserve original filename for Gemini registration
                    DisplayName = displayName ?? file.FileName,
                    MimeType = contentType
                };
            }

            _logger.LogInformation(
                "Uploading file {FileName} ({Size} bytes, {ContentType}) to Gemini",
                file.FileName, file.Length, contentType);

            GeminiUploadedFile? result;
            if (waitForProcessing)
            {
                result = await _geminiProvider.UploadAndWaitAsync(request, cancellationToken: cancellationToken);
            }
            else
            {
                result = await _geminiProvider.UploadFileAsync(request, cancellationToken);
            }

            if (result == null)
            {
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "Failed to upload file to Gemini" });
            }

            _logger.LogInformation(
                "File uploaded successfully: {Name} (state: {State}, uri: {Uri})",
                result.Name, result.State, result.Uri);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file to Gemini");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { error = "An error occurred while uploading the file" });
        }
        finally
        {
            // Clean up temp file if created
            if (tempFilePath != null)
            {
                try
                {
                    System.IO.File.Delete(tempFilePath);
                    _logger.LogDebug("Cleaned up temp file: {TempPath}", tempFilePath);
                }
                catch (Exception cleanupEx)
                {
                    _logger.LogWarning(cleanupEx, "Failed to clean up temp file: {TempPath}", tempFilePath);
                }
            }
        }
    }

    /// <summary>
    /// Get metadata for an uploaded file.
    /// </summary>
    /// <param name="fileName">The file name (e.g., "files/abc123")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    [HttpGet("{*fileName}")]
    [ProducesResponseType(typeof(GeminiUploadedFile), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GeminiUploadedFile>> GetFile(
        string fileName,
        CancellationToken cancellationToken = default)
    {
        if (!_geminiProvider.IsEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "Gemini provider is not enabled" });
        }

        var file = await _geminiProvider.GetFileAsync(fileName, cancellationToken);
        if (file == null)
        {
            return NotFound(new { error = $"File not found: {fileName}" });
        }

        return Ok(file);
    }

    /// <summary>
    /// List all uploaded files.
    /// </summary>
    /// <param name="maxResults">Maximum number of files to return (default: 100)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    [HttpGet]
    [ProducesResponseType(typeof(List<GeminiUploadedFile>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<GeminiUploadedFile>>> ListFiles(
        [FromQuery] int maxResults = 100,
        CancellationToken cancellationToken = default)
    {
        if (!_geminiProvider.IsEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "Gemini provider is not enabled" });
        }

        var files = await _geminiProvider.ListFilesAsync(maxResults, cancellationToken);
        return Ok(files);
    }

    /// <summary>
    /// Delete an uploaded file.
    /// </summary>
    /// <param name="fileName">The file name (e.g., "files/abc123")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    [HttpDelete("{*fileName}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteFile(
        string fileName,
        CancellationToken cancellationToken = default)
    {
        if (!_geminiProvider.IsEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "Gemini provider is not enabled" });
        }

        var success = await _geminiProvider.DeleteFileAsync(fileName, cancellationToken);
        if (!success)
        {
            return NotFound(new { error = $"File not found or could not be deleted: {fileName}" });
        }

        return NoContent();
    }

    /// <summary>
    /// Upload a file from base64-encoded content (for programmatic uploads).
    /// </summary>
    /// <param name="request">The upload request with base64 content</param>
    /// <param name="cancellationToken">Cancellation token</param>
    [HttpPost("upload/base64")]
    [RequestSizeLimit(MaxBase64RequestSize)]
    [ProducesResponseType(typeof(GeminiUploadedFile), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<GeminiUploadedFile>> UploadBase64(
        [FromBody] Base64FileUploadRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!_geminiProvider.IsEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "Gemini provider is not enabled" });
        }

        if (string.IsNullOrEmpty(request.Base64Content))
        {
            return BadRequest(new { error = "Base64 content is required" });
        }

        if (string.IsNullOrEmpty(request.FileName))
        {
            return BadRequest(new { error = "File name is required" });
        }

        try
        {
            var fileBytes = Convert.FromBase64String(request.Base64Content);

            if (fileBytes.LongLength > MaxFileSize)
            {
                return BadRequest(new { error = $"File size exceeds maximum allowed ({MaxFileSize / (1024 * 1024 * 1024)}GB)" });
            }

            var uploadRequest = new GeminiFileUploadRequest
            {
                Bytes = fileBytes,
                FileName = request.FileName,
                DisplayName = request.DisplayName ?? request.FileName,
                MimeType = request.MimeType ?? "application/octet-stream"
            };

            var result = request.WaitForProcessing
                ? await _geminiProvider.UploadAndWaitAsync(uploadRequest, cancellationToken: cancellationToken)
                : await _geminiProvider.UploadFileAsync(uploadRequest, cancellationToken);

            if (result == null)
            {
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "Failed to upload file to Gemini" });
            }

            return Ok(result);
        }
        catch (FormatException)
        {
            return BadRequest(new { error = "Invalid base64 content" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading base64 file to Gemini");
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { error = "An error occurred while uploading the file" });
        }
    }
}

/// <summary>
/// Request for uploading a file via base64-encoded content.
/// </summary>
public class Base64FileUploadRequest
{
    /// <summary>
    /// The base64-encoded file content.
    /// </summary>
    public string Base64Content { get; set; } = string.Empty;

    /// <summary>
    /// The file name (e.g., "data.csv").
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// Optional display name for the file.
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// The MIME type of the file.
    /// </summary>
    public string? MimeType { get; set; }

    /// <summary>
    /// Whether to wait for the file to finish processing (default: true).
    /// </summary>
    public bool WaitForProcessing { get; set; } = true;
}
