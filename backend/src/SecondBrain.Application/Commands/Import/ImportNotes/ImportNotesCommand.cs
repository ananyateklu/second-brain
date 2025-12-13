using MediatR;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Import.ImportNotes;

/// <summary>
/// Command to import notes from external sources
/// </summary>
public record ImportNotesCommand(
    string UserId,
    List<ImportNoteRequest> Notes
) : IRequest<Result<ImportNotesResponse>>;
