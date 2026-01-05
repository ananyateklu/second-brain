using System.Text.Json;
using MediatR;
using SecondBrain.Application.DTOs;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Enums;

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
    List<string>? DeletedImageIds = null,
    JsonElement? ContentJson = null,
    bool UpdateContentJson = false,
    NoteSource? Source = null,
    string? McpServerName = null
) : IRequest<Result<NoteResponse>>;
