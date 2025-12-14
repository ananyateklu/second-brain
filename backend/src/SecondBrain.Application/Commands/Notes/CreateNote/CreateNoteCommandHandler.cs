using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Core.Common;
using SecondBrain.Core.Enums;

namespace SecondBrain.Application.Commands.Notes.CreateNote;

/// <summary>
/// Handler for CreateNoteCommand - creates a new note for a user.
/// Delegates to INoteOperationService for business logic.
/// </summary>
public class CreateNoteCommandHandler : IRequestHandler<CreateNoteCommand, Result<NoteResponse>>
{
    private readonly INoteOperationService _noteOperationService;
    private readonly ILogger<CreateNoteCommandHandler> _logger;

    public CreateNoteCommandHandler(
        INoteOperationService noteOperationService,
        ILogger<CreateNoteCommandHandler> logger)
    {
        _noteOperationService = noteOperationService;
        _logger = logger;
    }

    public async Task<Result<NoteResponse>> Handle(
        CreateNoteCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Creating note for user {UserId}. Title: {Title}", request.UserId, request.Title);

        // Map command to operation request - Web source for API requests
        var operationRequest = new CreateNoteOperationRequest
        {
            UserId = request.UserId,
            Title = request.Title,
            Content = request.Content,
            Tags = request.Tags,
            Folder = request.Folder,
            IsArchived = request.IsArchived,
            Images = request.Images,
            Source = NoteSource.Web // Web API always uses Web source
        };

        var result = await _noteOperationService.CreateAsync(operationRequest, cancellationToken);

        return result.Match(
            onSuccess: op => Result<NoteResponse>.Success(op.Note.ToResponse()),
            onFailure: error => Result<NoteResponse>.Failure(error)
        );
    }
}
