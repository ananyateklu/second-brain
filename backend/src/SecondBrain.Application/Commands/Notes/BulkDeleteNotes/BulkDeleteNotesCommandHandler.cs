using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Core.Common;
using SecondBrain.Core.Enums;

namespace SecondBrain.Application.Commands.Notes.BulkDeleteNotes;

/// <summary>
/// Handler for BulkDeleteNotesCommand - deletes multiple notes at once.
/// Uses INoteOperationService to ensure proper version tracking for all deletions.
/// </summary>
public class BulkDeleteNotesCommandHandler : IRequestHandler<BulkDeleteNotesCommand, Result<int>>
{
    private readonly INoteOperationService _noteOperationService;
    private readonly ILogger<BulkDeleteNotesCommandHandler> _logger;

    public BulkDeleteNotesCommandHandler(
        INoteOperationService noteOperationService,
        ILogger<BulkDeleteNotesCommandHandler> logger)
    {
        _noteOperationService = noteOperationService;
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

        // Delegate to NoteOperationService for proper version tracking
        var operationRequest = new BulkDeleteNotesOperationRequest
        {
            NoteIds = request.NoteIds,
            UserId = request.UserId,
            Source = NoteSource.Web,
            SoftDelete = true // Web UI uses soft delete by default
        };

        var result = await _noteOperationService.BulkDeleteAsync(operationRequest, cancellationToken);

        return result.Match(
            onSuccess: bulkResult =>
            {
                _logger.LogInformation(
                    "Bulk deleted {DeletedCount} notes for user {UserId} (source: {Source})",
                    bulkResult.DeletedCount, request.UserId, bulkResult.Source);
                return Result<int>.Success(bulkResult.DeletedCount);
            },
            onFailure: error =>
            {
                _logger.LogWarning("Bulk delete failed: {Error}", error.Message);
                return Result<int>.Failure(error);
            }
        );
    }
}
