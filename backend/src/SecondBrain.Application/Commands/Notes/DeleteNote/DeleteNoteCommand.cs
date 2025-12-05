using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Notes.DeleteNote;

/// <summary>
/// Command to delete a note (verifies ownership)
/// </summary>
public record DeleteNoteCommand(string NoteId, string UserId) : IRequest<Result>;
