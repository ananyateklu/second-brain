using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Notes.CreateNote;

/// <summary>
/// Command to create a new note
/// </summary>
public record CreateNoteCommand(
    string Title,
    string Content,
    List<string> Tags,
    bool IsArchived,
    string? Folder,
    string UserId
) : IRequest<Result<NoteResponse>>;
