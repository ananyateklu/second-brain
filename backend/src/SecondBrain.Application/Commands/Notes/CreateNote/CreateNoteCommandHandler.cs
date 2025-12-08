using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Application.Services.Notes;
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
    private readonly INoteSummaryService _summaryService;
    private readonly ILogger<CreateNoteCommandHandler> _logger;

    public CreateNoteCommandHandler(
        INoteRepository noteRepository,
        INoteSummaryService summaryService,
        ILogger<CreateNoteCommandHandler> logger)
    {
        _noteRepository = noteRepository;
        _summaryService = summaryService;
        _logger = logger;
    }

    public async Task<Result<NoteResponse>> Handle(
        CreateNoteCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Creating note for user. UserId: {UserId}, Title: {Title}", request.UserId, request.Title);

        // Generate AI summary for the note
        string? summary = null;
        if (_summaryService.IsEnabled)
        {
            _logger.LogDebug("Generating summary for new note: {Title}", request.Title);
            summary = await _summaryService.GenerateSummaryAsync(
                request.Title,
                request.Content,
                request.Tags,
                cancellationToken);
        }

        var note = new Note
        {
            Id = UuidV7.NewId(),
            Title = request.Title,
            Content = request.Content,
            Summary = summary,
            Tags = request.Tags,
            IsArchived = request.IsArchived,
            Folder = request.Folder,
            UserId = request.UserId,
            Source = "web",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var createdNote = await _noteRepository.CreateAsync(note);

        _logger.LogInformation(
            "Note created successfully. NoteId: {NoteId}, UserId: {UserId}, HasSummary: {HasSummary}",
            createdNote.Id,
            request.UserId,
            !string.IsNullOrEmpty(summary));

        return Result<NoteResponse>.Success(createdNote.ToResponse());
    }
}
