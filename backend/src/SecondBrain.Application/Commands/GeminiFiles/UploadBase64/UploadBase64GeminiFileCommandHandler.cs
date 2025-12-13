using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.GeminiFiles.UploadBase64;

public class UploadBase64GeminiFileCommandHandler : IRequestHandler<UploadBase64GeminiFileCommand, Result<GeminiUploadedFile>>
{
    private readonly GeminiProvider _geminiProvider;
    private readonly ILogger<UploadBase64GeminiFileCommandHandler> _logger;

    // Maximum file size: 2GB (Gemini's limit)
    private const long MaxFileSize = 2L * 1024 * 1024 * 1024;

    public UploadBase64GeminiFileCommandHandler(
        GeminiProvider geminiProvider,
        ILogger<UploadBase64GeminiFileCommandHandler> logger)
    {
        _geminiProvider = geminiProvider;
        _logger = logger;
    }

    public async Task<Result<GeminiUploadedFile>> Handle(UploadBase64GeminiFileCommand command, CancellationToken cancellationToken)
    {
        if (!_geminiProvider.IsEnabled)
        {
            return Result<GeminiUploadedFile>.Failure(Error.Custom("ServiceUnavailable", "Gemini provider is not enabled"));
        }

        if (string.IsNullOrEmpty(command.Base64Content))
        {
            return Result<GeminiUploadedFile>.Failure(Error.Validation("Base64 content is required"));
        }

        if (string.IsNullOrEmpty(command.FileName))
        {
            return Result<GeminiUploadedFile>.Failure(Error.Validation("File name is required"));
        }

        try
        {
            var fileBytes = Convert.FromBase64String(command.Base64Content);

            if (fileBytes.LongLength > MaxFileSize)
            {
                return Result<GeminiUploadedFile>.Failure(
                    Error.Validation($"File size exceeds maximum allowed ({MaxFileSize / (1024 * 1024 * 1024)}GB)"));
            }

            var uploadRequest = new GeminiFileUploadRequest
            {
                Bytes = fileBytes,
                FileName = command.FileName,
                DisplayName = command.DisplayName ?? command.FileName,
                MimeType = command.MimeType ?? "application/octet-stream"
            };

            var result = command.WaitForProcessing
                ? await _geminiProvider.UploadAndWaitAsync(uploadRequest, cancellationToken: cancellationToken)
                : await _geminiProvider.UploadFileAsync(uploadRequest, cancellationToken);

            if (result == null)
            {
                return Result<GeminiUploadedFile>.Failure(Error.Custom("UploadFailed", "Failed to upload file to Gemini"));
            }

            return Result<GeminiUploadedFile>.Success(result);
        }
        catch (FormatException)
        {
            return Result<GeminiUploadedFile>.Failure(Error.Validation("Invalid base64 content"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading base64 file to Gemini");
            return Result<GeminiUploadedFile>.Failure(Error.Custom("UploadFailed", "An error occurred while uploading the file"));
        }
    }
}
