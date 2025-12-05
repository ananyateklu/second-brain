using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Core.Common;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Queries.Notes.GetAllNotes;

/// <summary>
/// Handler for GetAllNotesQuery - retrieves all notes for a user
/// </summary>
public class GetAllNotesQueryHandler : IRequestHandler<GetAllNotesQuery, Result<IEnumerable<NoteResponse>>>
{
    private readonly INoteRepository _noteRepository;
    private readonly ILogger<GetAllNotesQueryHandler> _logger;

    public GetAllNotesQueryHandler(
        INoteRepository noteRepository,
        ILogger<GetAllNotesQueryHandler> logger)
    {
        _noteRepository = noteRepository;
        _logger = logger;
    }

    public async Task<Result<IEnumerable<NoteResponse>>> Handle(
        GetAllNotesQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Retrieving all notes for user. UserId: {UserId}", request.UserId);

        var notes = await _noteRepository.GetByUserIdAsync(request.UserId);
        var responses = notes.Select(n => n.ToResponse());

        return Result<IEnumerable<NoteResponse>>.Success(responses);
    }
}
