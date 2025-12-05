using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Notes.CreateNote;

/// <summary>
/// Handler for CreateNoteCommand - creates a new note for a user
/// </summary>
public class CreateNoteCommandHandler : IRequestHandler<CreateNoteCommand, Result<NoteResponse>>
{
    private readonly INoteRepository _noteRepository;
    private readonly ILogger<CreateNoteCommandHandler> _logger;

    public CreateNoteCommandHandler(
        INoteRepository noteRepository,
        ILogger<CreateNoteCommandHandler> logger)
    {
        _noteRepository = noteRepository;
        _logger = logger;
    }

    public async Task<Result<NoteResponse>> Handle(
        CreateNoteCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Creating note for user. UserId: {UserId}, Title: {Title}", request.UserId, request.Title);

        var note = new Note
        {
            Id = Guid.NewGuid().ToString(),
            Title = request.Title,
            Content = request.Content,
            Tags = request.Tags,
            IsArchived = request.IsArchived,
            Folder = request.Folder,
            UserId = request.UserId,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var createdNote = await _noteRepository.CreateAsync(note);

        _logger.LogInformation("Note created successfully. NoteId: {NoteId}, UserId: {UserId}", createdNote.Id, request.UserId);

        return Result<NoteResponse>.Success(createdNote.ToResponse());
    }
}
