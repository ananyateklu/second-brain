using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Core.Common;
using SecondBrain.Core.Enums;

namespace SecondBrain.Application.Commands.Notes.UpdateNote;

/// <summary>
/// Handler for UpdateNoteCommand - updates an existing note with ownership verification.
/// Delegates to INoteOperationService for business logic.
/// </summary>
public class UpdateNoteCommandHandler : IRequestHandler<UpdateNoteCommand, Result<NoteResponse>>
{
    private readonly INoteOperationService _noteOperationService;
    private readonly ILogger<UpdateNoteCommandHandler> _logger;

    public UpdateNoteCommandHandler(
        INoteOperationService noteOperationService,
        ILogger<UpdateNoteCommandHandler> logger)
    {
        _noteOperationService = noteOperationService;
        _logger = logger;
    }

    public async Task<Result<NoteResponse>> Handle(
        UpdateNoteCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Updating note {NoteId} for user {UserId}", request.NoteId, request.UserId);

        // Map command to operation request - Web source for API requests
        var operationRequest = new UpdateNoteOperationRequest
        {
            NoteId = request.NoteId,
            UserId = request.UserId,
            Title = request.Title,
            Content = request.Content,
            ContentJson = request.ContentJson?.ValueKind == System.Text.Json.JsonValueKind.Undefined
                ? null
                : request.ContentJson?.GetRawText(),
            UpdateContentJson = request.UpdateContentJson,
            Tags = request.Tags,
            Folder = request.Folder,
            UpdateFolder = request.UpdateFolder,
            IsArchived = request.IsArchived,
            Images = request.Images,
            DeletedImageIds = request.DeletedImageIds,
            Source = NoteSource.Web // Web API always uses Web source
        };

        var result = await _noteOperationService.UpdateAsync(operationRequest, cancellationToken);

        return result.Match(
            onSuccess: op => Result<NoteResponse>.Success(op.Note.ToResponse()),
            onFailure: error => Result<NoteResponse>.Failure(error)
        );
    }
}
