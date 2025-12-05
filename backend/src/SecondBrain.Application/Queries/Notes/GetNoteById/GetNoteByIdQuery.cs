using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Notes.GetNoteById;

/// <summary>
/// Query to retrieve a specific note by ID (verifies ownership)
/// </summary>
public record GetNoteByIdQuery(string NoteId, string UserId) : IRequest<Result<NoteResponse>>;
