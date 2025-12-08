using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Notes.GetAllNotes;

/// <summary>
/// Query to retrieve all notes for a user.
/// Returns lightweight NoteListResponse (with summary instead of full content) for better performance.
/// </summary>
public record GetAllNotesQuery(string UserId) : IRequest<Result<IEnumerable<NoteListResponse>>>;
