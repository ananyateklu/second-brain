using MediatR;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.GeminiFiles.UploadBase64;

public record UploadBase64GeminiFileCommand(
    string Base64Content,
    string FileName,
    string? DisplayName,
    string? MimeType,
    bool WaitForProcessing = true
) : IRequest<Result<GeminiUploadedFile>>;
