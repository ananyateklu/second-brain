using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Indexing.ReindexNote;

/// <summary>
/// Handler for ReindexNoteCommand
/// </summary>
public class ReindexNoteCommandHandler : IRequestHandler<ReindexNoteCommand, Result<bool>>
{
    private readonly IIndexingService _indexingService;
    private readonly ILogger<ReindexNoteCommandHandler> _logger;

    public ReindexNoteCommandHandler(
        IIndexingService indexingService,
        ILogger<ReindexNoteCommandHandler> logger)
    {
        _indexingService = indexingService;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(
        ReindexNoteCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Reindexing note. NoteId: {NoteId}", request.NoteId);

        try
        {
            var success = await _indexingService.ReindexNoteAsync(request.NoteId, cancellationToken);

            if (!success)
            {
                return Result<bool>.Failure(Error.NotFound($"Note '{request.NoteId}' not found or failed to reindex"));
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reindexing note. NoteId: {NoteId}", request.NoteId);
            return Result<bool>.Failure(Error.Internal("Failed to reindex note"));
        }
    }
}
