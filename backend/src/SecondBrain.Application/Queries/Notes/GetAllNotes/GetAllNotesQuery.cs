using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Notes.GetAllNotes;

/// <summary>
/// Query to retrieve all notes for a user
/// </summary>
public record GetAllNotesQuery(string UserId) : IRequest<Result<IEnumerable<NoteResponse>>>;
