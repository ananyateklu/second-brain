using MediatR;
using SecondBrain.Application.DTOs;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Notes.UpdateNote;

/// <summary>
/// Command to update an existing note (verifies ownership)
/// </summary>
public record UpdateNoteCommand(
    string NoteId,
    string? Title,
    string? Content,
    List<string>? Tags,
    bool? IsArchived,
    string? Folder,
    bool UpdateFolder,
    string UserId,
    List<NoteImageDto>? Images = null,
    List<string>? DeletedImageIds = null
) : IRequest<Result<NoteResponse>>;
