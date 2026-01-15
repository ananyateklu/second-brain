using MediatR;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GeminiFiles.GetFile;

public class GetGeminiFileQueryHandler : IRequestHandler<GetGeminiFileQuery, Result<GeminiUploadedFile>>
{
    private readonly GoogleProvider _googleProvider;

    public GetGeminiFileQueryHandler(GoogleProvider googleProvider)
    {
        _googleProvider = googleProvider;
    }

    public async Task<Result<GeminiUploadedFile>> Handle(GetGeminiFileQuery request, CancellationToken cancellationToken)
    {
        if (!_googleProvider.IsEnabled)
        {
            return Result<GeminiUploadedFile>.Failure(Error.Custom("ServiceUnavailable", "Gemini provider is not enabled"));
        }

        var file = await _googleProvider.GetFileAsync(request.FileName, cancellationToken);
        if (file == null)
        {
            return Result<GeminiUploadedFile>.Failure(Error.NotFound("File", request.FileName));
        }

        return Result<GeminiUploadedFile>.Success(file);
    }
}
