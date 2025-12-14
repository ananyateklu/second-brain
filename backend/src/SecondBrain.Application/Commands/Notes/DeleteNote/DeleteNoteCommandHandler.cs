using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Core.Common;
using SecondBrain.Core.Enums;

namespace SecondBrain.Application.Commands.Notes.DeleteNote;

/// <summary>
/// Handler for DeleteNoteCommand - deletes a note with ownership verification.
/// Delegates to INoteOperationService for business logic.
/// </summary>
public class DeleteNoteCommandHandler : IRequestHandler<DeleteNoteCommand, Result>
{
    private readonly INoteOperationService _noteOperationService;
    private readonly ILogger<DeleteNoteCommandHandler> _logger;

    public DeleteNoteCommandHandler(
        INoteOperationService noteOperationService,
        ILogger<DeleteNoteCommandHandler> logger)
    {
        _noteOperationService = noteOperationService;
        _logger = logger;
    }

    public async Task<Result> Handle(
        DeleteNoteCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Deleting note {NoteId} for user {UserId}", request.NoteId, request.UserId);

        // Map command to operation request - hard delete (soft delete = false)
        var operationRequest = new DeleteNoteOperationRequest
        {
            NoteId = request.NoteId,
            UserId = request.UserId,
            Source = NoteSource.Web,
            SoftDelete = false // Original behavior was hard delete
        };

        var result = await _noteOperationService.DeleteAsync(operationRequest, cancellationToken);

        return result.Match(
            onSuccess: _ => Result.Success(),
            onFailure: error => Result.Failure(error)
        );
    }
}
