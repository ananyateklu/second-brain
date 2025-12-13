using MediatR;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GeminiFiles.GetFile;

public class GetGeminiFileQueryHandler : IRequestHandler<GetGeminiFileQuery, Result<GeminiUploadedFile>>
{
    private readonly GeminiProvider _geminiProvider;

    public GetGeminiFileQueryHandler(GeminiProvider geminiProvider)
    {
        _geminiProvider = geminiProvider;
    }

    public async Task<Result<GeminiUploadedFile>> Handle(GetGeminiFileQuery request, CancellationToken cancellationToken)
    {
        if (!_geminiProvider.IsEnabled)
        {
            return Result<GeminiUploadedFile>.Failure(Error.Custom("ServiceUnavailable", "Gemini provider is not enabled"));
        }

        var file = await _geminiProvider.GetFileAsync(request.FileName, cancellationToken);
        if (file == null)
        {
            return Result<GeminiUploadedFile>.Failure(Error.NotFound("File", request.FileName));
        }

        return Result<GeminiUploadedFile>.Success(file);
    }
}
