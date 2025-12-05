using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Notes.BulkDeleteNotes;

/// <summary>
/// Command to delete multiple notes at once (verifies ownership)
/// </summary>
public record BulkDeleteNotesCommand(List<string> NoteIds, string UserId) : IRequest<Result<int>>;
