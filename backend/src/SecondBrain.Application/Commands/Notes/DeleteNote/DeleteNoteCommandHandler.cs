using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Notes.DeleteNote;

/// <summary>
/// Handler for DeleteNoteCommand - deletes a note with ownership verification
/// </summary>
public class DeleteNoteCommandHandler : IRequestHandler<DeleteNoteCommand, Result>
{
    private readonly INoteRepository _noteRepository;
    private readonly ILogger<DeleteNoteCommandHandler> _logger;

    public DeleteNoteCommandHandler(
        INoteRepository noteRepository,
        ILogger<DeleteNoteCommandHandler> logger)
    {
        _noteRepository = noteRepository;
        _logger = logger;
    }

    public async Task<Result> Handle(
        DeleteNoteCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Deleting note. NoteId: {NoteId}, UserId: {UserId}", request.NoteId, request.UserId);

        var existingNote = await _noteRepository.GetByIdAsync(request.NoteId);

        if (existingNote == null)
        {
            return Result.Failure(
                new Error("NotFound", $"Note with ID '{request.NoteId}' was not found"));
        }

        // Verify ownership
        if (existingNote.UserId != request.UserId)
        {
            _logger.LogWarning(
                "User attempted to delete note belonging to another user. UserId: {UserId}, NoteId: {NoteId}, NoteUserId: {NoteUserId}",
                request.UserId, request.NoteId, existingNote.UserId);

            return Result.Failure(
                new Error("Unauthorized", "Access denied to this note"));
        }

        var deleted = await _noteRepository.DeleteAsync(request.NoteId);

        if (!deleted)
        {
            return Result.Failure(
                new Error("DeleteFailed", "Failed to delete the note"));
        }

        _logger.LogInformation("Note deleted successfully. NoteId: {NoteId}", request.NoteId);

        return Result.Success();
    }
}
