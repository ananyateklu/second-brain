using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Notes.BulkDeleteNotes;

/// <summary>
/// Handler for BulkDeleteNotesCommand - deletes multiple notes at once
/// </summary>
public class BulkDeleteNotesCommandHandler : IRequestHandler<BulkDeleteNotesCommand, Result<int>>
{
    private readonly INoteRepository _noteRepository;
    private readonly ILogger<BulkDeleteNotesCommandHandler> _logger;

    public BulkDeleteNotesCommandHandler(
        INoteRepository noteRepository,
        ILogger<BulkDeleteNotesCommandHandler> logger)
    {
        _noteRepository = noteRepository;
        _logger = logger;
    }

    public async Task<Result<int>> Handle(
        BulkDeleteNotesCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Bulk deleting notes. Count: {Count}, UserId: {UserId}", request.NoteIds.Count, request.UserId);

        if (request.NoteIds.Count == 0)
        {
            return Result<int>.Success(0);
        }

        // The repository handles ownership verification by filtering on userId
        var deletedCount = await _noteRepository.DeleteManyAsync(request.NoteIds, request.UserId);

        _logger.LogInformation("Bulk deleted {DeletedCount} notes for user {UserId}", deletedCount, request.UserId);

        return Result<int>.Success(deletedCount);
    }
}
