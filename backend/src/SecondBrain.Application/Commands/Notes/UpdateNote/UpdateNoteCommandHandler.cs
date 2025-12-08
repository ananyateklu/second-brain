using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Notes.UpdateNote;

/// <summary>
/// Handler for UpdateNoteCommand - updates an existing note with ownership verification
/// </summary>
public class UpdateNoteCommandHandler : IRequestHandler<UpdateNoteCommand, Result<NoteResponse>>
{
    private readonly INoteRepository _noteRepository;
    private readonly INoteSummaryService _summaryService;
    private readonly ILogger<UpdateNoteCommandHandler> _logger;

    public UpdateNoteCommandHandler(
        INoteRepository noteRepository,
        INoteSummaryService summaryService,
        ILogger<UpdateNoteCommandHandler> logger)
    {
        _noteRepository = noteRepository;
        _summaryService = summaryService;
        _logger = logger;
    }

    public async Task<Result<NoteResponse>> Handle(
        UpdateNoteCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Updating note. NoteId: {NoteId}, UserId: {UserId}", request.NoteId, request.UserId);

        var existingNote = await _noteRepository.GetByIdAsync(request.NoteId);

        if (existingNote == null)
        {
            return Result<NoteResponse>.Failure(
                new Error("NotFound", $"Note with ID '{request.NoteId}' was not found"));
        }

        // Verify ownership
        if (existingNote.UserId != request.UserId)
        {
            _logger.LogWarning(
                "User attempted to update note belonging to another user. UserId: {UserId}, NoteId: {NoteId}, NoteUserId: {NoteUserId}",
                request.UserId, request.NoteId, existingNote.UserId);

            return Result<NoteResponse>.Failure(
                Error.Forbidden("Access denied to this note"));
        }

        // Store old values for summary regeneration check
        var oldContent = existingNote.Content;
        var oldTitle = existingNote.Title;
        var oldTags = existingNote.Tags.ToList();

        // Create an UpdateNoteRequest to use existing mapping logic
        var updateRequest = new UpdateNoteRequest
        {
            Title = request.Title,
            Content = request.Content,
            Tags = request.Tags,
            IsArchived = request.IsArchived,
            Folder = request.Folder,
            UpdateFolder = request.UpdateFolder
        };

        existingNote.UpdateFrom(updateRequest);

        // Check if summary should be regenerated
        var shouldRegenerate = _summaryService.ShouldRegenerateSummary(
            oldContent,
            existingNote.Content,
            oldTitle,
            existingNote.Title,
            oldTags,
            existingNote.Tags);

        if (shouldRegenerate)
        {
            _logger.LogDebug("Regenerating summary for note: {NoteId}", request.NoteId);
            existingNote.Summary = await _summaryService.GenerateSummaryAsync(
                existingNote.Title,
                existingNote.Content,
                existingNote.Tags,
                cancellationToken);
        }
        // If note has no summary yet and summary service is enabled, generate one
        else if (string.IsNullOrEmpty(existingNote.Summary) && _summaryService.IsEnabled)
        {
            _logger.LogDebug("Generating initial summary for note without summary: {NoteId}", request.NoteId);
            existingNote.Summary = await _summaryService.GenerateSummaryAsync(
                existingNote.Title,
                existingNote.Content,
                existingNote.Tags,
                cancellationToken);
        }

        var updatedNote = await _noteRepository.UpdateAsync(request.NoteId, existingNote);

        if (updatedNote == null)
        {
            return Result<NoteResponse>.Failure(
                new Error("UpdateFailed", "Failed to update the note"));
        }

        _logger.LogInformation(
            "Note updated successfully. NoteId: {NoteId}, SummaryRegenerated: {Regenerated}",
            request.NoteId,
            shouldRegenerate);

        return Result<NoteResponse>.Success(updatedNote.ToResponse());
    }
}
