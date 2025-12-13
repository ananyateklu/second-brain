using MediatR;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.GeminiFiles.DeleteFile;

public class DeleteGeminiFileCommandHandler : IRequestHandler<DeleteGeminiFileCommand, Result<bool>>
{
    private readonly GeminiProvider _geminiProvider;

    public DeleteGeminiFileCommandHandler(GeminiProvider geminiProvider)
    {
        _geminiProvider = geminiProvider;
    }

    public async Task<Result<bool>> Handle(DeleteGeminiFileCommand request, CancellationToken cancellationToken)
    {
        if (!_geminiProvider.IsEnabled)
        {
            return Result<bool>.Failure(Error.Custom("ServiceUnavailable", "Gemini provider is not enabled"));
        }

        var success = await _geminiProvider.DeleteFileAsync(request.FileName, cancellationToken);
        if (!success)
        {
            return Result<bool>.Failure(Error.NotFound("File", request.FileName));
        }

        return Result<bool>.Success(true);
    }
}
