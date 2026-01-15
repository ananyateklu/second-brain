using MediatR;
using SecondBrain.Application.Services.AI.Models;
using SecondBrain.Application.Services.AI.Providers;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.GeminiFiles.ListFiles;

public class ListGeminiFilesQueryHandler : IRequestHandler<ListGeminiFilesQuery, Result<List<GeminiUploadedFile>>>
{
    private readonly GoogleProvider _googleProvider;

    public ListGeminiFilesQueryHandler(GoogleProvider googleProvider)
    {
        _googleProvider = googleProvider;
    }

    public async Task<Result<List<GeminiUploadedFile>>> Handle(ListGeminiFilesQuery request, CancellationToken cancellationToken)
    {
        if (!_googleProvider.IsEnabled)
        {
            return Result<List<GeminiUploadedFile>>.Failure(Error.Custom("ServiceUnavailable", "Gemini provider is not enabled"));
        }

        var files = await _googleProvider.ListFilesAsync(request.MaxResults, cancellationToken);
        return Result<List<GeminiUploadedFile>>.Success(files);
    }
}
