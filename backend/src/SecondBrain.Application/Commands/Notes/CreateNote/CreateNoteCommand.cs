using System.Text.Json;
using MediatR;
using SecondBrain.Application.DTOs;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;
using SecondBrain.Core.Enums;

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
    string UserId,
    List<NoteImageDto>? Images = null,
    JsonElement? ContentJson = null,
    NoteSource? Source = null,
    string? McpServerName = null
) : IRequest<Result<NoteResponse>>;
