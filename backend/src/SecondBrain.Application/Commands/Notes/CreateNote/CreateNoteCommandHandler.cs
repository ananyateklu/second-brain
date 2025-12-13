using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.RAG.Interfaces;
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
    private readonly INoteImageRepository _noteImageRepository;
    private readonly INoteSummaryService _summaryService;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<CreateNoteCommandHandler> _logger;

    public CreateNoteCommandHandler(
        INoteRepository noteRepository,
        INoteImageRepository noteImageRepository,
        INoteSummaryService summaryService,
        IServiceScopeFactory serviceScopeFactory,
        ILogger<CreateNoteCommandHandler> logger)
    {
        _noteRepository = noteRepository;
        _noteImageRepository = noteImageRepository;
        _summaryService = summaryService;
        _serviceScopeFactory = serviceScopeFactory;
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

        // Handle image uploads if provided
        if (request.Images != null && request.Images.Count > 0)
        {
            _logger.LogInformation("Processing {Count} images for note {NoteId}", request.Images.Count, createdNote.Id);

            var noteImages = new List<NoteImage>();
            for (var i = 0; i < request.Images.Count; i++)
            {
                var imageDto = request.Images[i];
                noteImages.Add(new NoteImage
                {
                    Id = UuidV7.NewId(),
                    NoteId = createdNote.Id,
                    UserId = request.UserId,
                    Base64Data = imageDto.Base64Data,
                    MediaType = imageDto.MediaType,
                    FileName = imageDto.FileName,
                    AltText = imageDto.AltText,
                    ImageIndex = i,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            var savedImages = await _noteImageRepository.CreateManyAsync(noteImages, cancellationToken);

            // Extract descriptions asynchronously (fire and forget for better UX)
            // Use IServiceScopeFactory to create a new scope for the background task
            // This ensures DI services are available after the HTTP request completes
            var noteId = createdNote.Id;
            var noteTitle = request.Title;
            var imageData = savedImages.Select(img => new ImageInput
            {
                Id = img.Id,
                Base64Data = img.Base64Data,
                MediaType = img.MediaType,
                AltText = img.AltText
            }).ToList();

            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _serviceScopeFactory.CreateScope();
                    var imageDescriptionService = scope.ServiceProvider.GetRequiredService<IImageDescriptionService>();
                    var noteImageRepository = scope.ServiceProvider.GetRequiredService<INoteImageRepository>();
                    var logger = scope.ServiceProvider.GetRequiredService<ILogger<CreateNoteCommandHandler>>();

                    if (!imageDescriptionService.IsAvailable)
                    {
                        logger.LogDebug("Image description service not available, skipping extraction");
                        return;
                    }

                    var results = await imageDescriptionService.ExtractDescriptionsBatchAsync(
                        imageData, noteTitle, CancellationToken.None);

                    foreach (var result in results.Where(r => r.Success && !string.IsNullOrEmpty(r.Description)))
                    {
                        await noteImageRepository.UpdateDescriptionAsync(
                            result.ImageId!,
                            result.Description!,
                            result.Provider ?? "unknown",
                            result.Model ?? "unknown",
                            CancellationToken.None);
                    }

                    logger.LogInformation("Extracted descriptions for {Count}/{Total} images for note {NoteId}",
                        results.Count(r => r.Success), imageData.Count, noteId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Background image description extraction failed for note {NoteId}", noteId);
                }
            });

            createdNote.Images = savedImages;
        }

        _logger.LogInformation(
            "Note created successfully. NoteId: {NoteId}, UserId: {UserId}, HasSummary: {HasSummary}, ImageCount: {ImageCount}",
            createdNote.Id,
            request.UserId,
            !string.IsNullOrEmpty(summary),
            request.Images?.Count ?? 0);

        return Result<NoteResponse>.Success(createdNote.ToResponse());
    }
}
