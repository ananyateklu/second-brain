using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.Notes.GetNoteById;

/// <summary>
/// Handler for GetNoteByIdQuery - retrieves a specific note by ID with ownership verification
/// </summary>
public class GetNoteByIdQueryHandler : IRequestHandler<GetNoteByIdQuery, Result<NoteResponse>>
{
    private readonly INoteRepository _noteRepository;
    private readonly ILogger<GetNoteByIdQueryHandler> _logger;

    public GetNoteByIdQueryHandler(
        INoteRepository noteRepository,
        ILogger<GetNoteByIdQueryHandler> logger)
    {
        _noteRepository = noteRepository;
        _logger = logger;
    }

    public async Task<Result<NoteResponse>> Handle(
        GetNoteByIdQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Retrieving note. NoteId: {NoteId}, UserId: {UserId}", request.NoteId, request.UserId);

        var note = await _noteRepository.GetByIdAsync(request.NoteId);

        if (note == null)
        {
            return Result<NoteResponse>.Failure(
                new Error("NotFound", $"Note with ID '{request.NoteId}' was not found"));
        }

        // Verify ownership
        if (note.UserId != request.UserId)
        {
            _logger.LogWarning(
                "User attempted to access note belonging to another user. UserId: {UserId}, NoteId: {NoteId}, NoteUserId: {NoteUserId}",
                request.UserId, request.NoteId, note.UserId);

            return Result<NoteResponse>.Failure(
                Error.Forbidden("Access denied to this note"));
        }

        return Result<NoteResponse>.Success(note.ToResponse());
    }
}
