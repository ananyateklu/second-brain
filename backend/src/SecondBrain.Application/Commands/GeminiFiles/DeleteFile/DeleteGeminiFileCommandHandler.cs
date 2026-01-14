using MediatR;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.GeminiFiles.DeleteFile;

public class DeleteGeminiFileCommandHandler : IRequestHandler<DeleteGeminiFileCommand, Result<bool>>
{
    private readonly GoogleProvider _googleProvider;

    public DeleteGeminiFileCommandHandler(GoogleProvider googleProvider)
    {
        _googleProvider = googleProvider;
    }

    public async Task<Result<bool>> Handle(DeleteGeminiFileCommand request, CancellationToken cancellationToken)
    {
        if (!_googleProvider.IsEnabled)
        {
            return Result<bool>.Failure(Error.Custom("ServiceUnavailable", "Gemini provider is not enabled"));
        }

        var success = await _googleProvider.DeleteFileAsync(request.FileName, cancellationToken);
        if (!success)
        {
            return Result<bool>.Failure(Error.NotFound("File", request.FileName));
        }

        return Result<bool>.Success(true);
    }
}
