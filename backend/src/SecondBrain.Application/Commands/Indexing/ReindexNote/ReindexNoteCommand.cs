using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Indexing.ReindexNote;

/// <summary>
/// Command to reindex a specific note
/// </summary>
public record ReindexNoteCommand(
    string NoteId
) : IRequest<Result<bool>>;
