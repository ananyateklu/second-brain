using Google.GenAI;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.AI.Models;

namespace SecondBrain.Application.Services.AI.FileManagement;

/// <summary>
/// Service for managing files in Gemini's file storage.
/// Extracted from GeminiProvider for better separation of concerns.
/// </summary>
public class GeminiFileService : IGeminiFileService
{
    private readonly Client? _client;
    private readonly ILogger<GeminiFileService> _logger;
    private readonly bool _isEnabled;

    /// <summary>
    /// Buffer size for stream operations (80KB)
    /// </summary>
    private const int StreamBufferSize = 81920;

    /// <summary>
    /// Polling interval when waiting for file processing
    /// </summary>
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(2);

    public GeminiFileService(
        IOptions<AIProvidersSettings> settings,
        ILogger<GeminiFileService> logger)
    {
        _logger = logger;

        var geminiSettings = settings.Value.Gemini;
        if (geminiSettings != null && !string.IsNullOrEmpty(geminiSettings.ApiKey))
        {
            _client = new Client(apiKey: geminiSettings.ApiKey);
            _isEnabled = true;
            _logger.LogInformation("GeminiFileService initialized");
        }
        else
        {
            _isEnabled = false;
            _logger.LogWarning("GeminiFileService not configured - API key missing");
        }
    }

    /// <inheritdoc />
    public bool IsEnabled => _isEnabled;

    /// <inheritdoc />
    public async Task<GeminiUploadedFile?> UploadFileAsync(
        GeminiFileUploadRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!_isEnabled || _client == null)
        {
            _logger.LogWarning("Gemini file upload called but service is not enabled");
            return null;
        }

        try
        {
            Google.GenAI.Types.File? response = null;

            if (request.Bytes != null && !string.IsNullOrEmpty(request.FileName))
            {
                // Upload from bytes
                _logger.LogInformation("Uploading file {FileName} ({Size} bytes) to Gemini",
                    request.FileName, request.Bytes.Length);

                response = await _client.Files.UploadAsync(
                    bytes: request.Bytes,
                    fileName: request.FileName);
            }
            else if (request.FileStream != null && !string.IsNullOrEmpty(request.FileName))
            {
                // Upload from stream
                _logger.LogInformation("Uploading file {FileName} from stream to Gemini",
                    request.FileName);

                var fileBytes = await StreamToBytesAsync(request.FileStream, cancellationToken);

                _logger.LogDebug("Stream read complete, uploading {BytesCount} bytes for {FileName}",
                    fileBytes.Length, request.FileName);

                response = await _client.Files.UploadAsync(
                    bytes: fileBytes,
                    fileName: request.FileName);
            }
            else if (!string.IsNullOrEmpty(request.FilePath))
            {
                // Upload from file path
                _logger.LogInformation("Uploading file from path {FilePath} to Gemini", request.FilePath);

                if (!string.IsNullOrEmpty(request.FileName))
                {
                    _logger.LogInformation("Using custom filename {FileName} for temp file upload", request.FileName);
                }

                response = await _client.Files.UploadAsync(filePath: request.FilePath);
            }
            else
            {
                _logger.LogError("File upload request must include either Bytes+FileName, FileStream+FileName, or FilePath");
                return null;
            }

            if (response == null)
            {
                _logger.LogError("Gemini file upload returned null response");
                return null;
            }

            var uploadedFile = MapToUploadedFile(response);
            _logger.LogInformation("File uploaded successfully: {Name} (state: {State})",
                uploadedFile.Name, uploadedFile.State);

            return uploadedFile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload file to Gemini");
            return null;
        }
    }

    /// <inheritdoc />
    public async Task<GeminiUploadedFile?> WaitForFileProcessingAsync(
        string fileName,
        int maxWaitSeconds = 60,
        CancellationToken cancellationToken = default)
    {
        if (!_isEnabled || _client == null)
            return null;

        var startTime = DateTime.UtcNow;

        while ((DateTime.UtcNow - startTime).TotalSeconds < maxWaitSeconds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                var file = await _client.Files.GetAsync(name: fileName);
                if (file == null)
                {
                    _logger.LogWarning("File {FileName} not found", fileName);
                    return null;
                }

                var uploadedFile = MapToUploadedFile(file);

                if (uploadedFile.State == "ACTIVE")
                {
                    _logger.LogInformation("File {FileName} is now active", fileName);
                    return uploadedFile;
                }

                if (uploadedFile.State == "FAILED")
                {
                    _logger.LogError("File {FileName} processing failed: {Error}",
                        fileName, uploadedFile.Error);
                    return uploadedFile;
                }

                _logger.LogDebug("File {FileName} still processing (state: {State}), waiting...",
                    fileName, uploadedFile.State);

                await Task.Delay(PollInterval, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking file status for {FileName}", fileName);
                return null;
            }
        }

        _logger.LogWarning("Timed out waiting for file {FileName} to process", fileName);
        return null;
    }

    /// <inheritdoc />
    public async Task<GeminiUploadedFile?> GetFileAsync(
        string fileName,
        CancellationToken cancellationToken = default)
    {
        if (!_isEnabled || _client == null)
            return null;

        try
        {
            var file = await _client.Files.GetAsync(name: fileName);
            return file != null ? MapToUploadedFile(file) : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get file metadata for {FileName}", fileName);
            return null;
        }
    }

    /// <inheritdoc />
    public async Task<bool> DeleteFileAsync(
        string fileName,
        CancellationToken cancellationToken = default)
    {
        if (!_isEnabled || _client == null)
            return false;

        try
        {
            await _client.Files.DeleteAsync(name: fileName);
            _logger.LogInformation("File {FileName} deleted successfully", fileName);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file {FileName}", fileName);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<List<GeminiUploadedFile>> ListFilesAsync(
        int maxResults = 100,
        CancellationToken cancellationToken = default)
    {
        if (!_isEnabled || _client == null)
            return [];

        try
        {
            var result = new List<GeminiUploadedFile>();
            var config = new Google.GenAI.Types.ListFilesConfig { PageSize = maxResults };
            var pager = await _client.Files.ListAsync(config);

            // Iterate through pages
            await foreach (var file in pager)
            {
                cancellationToken.ThrowIfCancellationRequested();
                result.Add(MapToUploadedFile(file));
                if (result.Count >= maxResults)
                    break;
            }

            _logger.LogInformation("Listed {Count} files from Gemini", result.Count);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list files from Gemini");
            return [];
        }
    }

    /// <inheritdoc />
    public async Task<GeminiUploadedFile?> UploadAndWaitAsync(
        GeminiFileUploadRequest request,
        int maxWaitSeconds = 60,
        CancellationToken cancellationToken = default)
    {
        var uploadedFile = await UploadFileAsync(request, cancellationToken);
        if (uploadedFile == null)
            return null;

        if (uploadedFile.IsReady)
            return uploadedFile;

        return await WaitForFileProcessingAsync(uploadedFile.Name, maxWaitSeconds, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<byte[]> StreamToBytesAsync(Stream stream, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(stream);

        using var memoryStream = new MemoryStream();
        await stream.CopyToAsync(memoryStream, StreamBufferSize, cancellationToken);
        return memoryStream.ToArray();
    }

    /// <summary>
    /// Maps the SDK File type to our GeminiUploadedFile model.
    /// </summary>
    private static GeminiUploadedFile MapToUploadedFile(Google.GenAI.Types.File file)
    {
        return new GeminiUploadedFile
        {
            Name = file.Name ?? string.Empty,
            DisplayName = file.DisplayName ?? string.Empty,
            MimeType = file.MimeType ?? string.Empty,
            SizeBytes = file.SizeBytes ?? 0,
            Uri = file.Uri ?? string.Empty,
            State = file.State?.ToString() ?? "UNKNOWN",
            CreateTime = file.CreateTime,
            ExpirationTime = file.ExpirationTime,
            Error = file.Error?.Message
        };
    }
}
