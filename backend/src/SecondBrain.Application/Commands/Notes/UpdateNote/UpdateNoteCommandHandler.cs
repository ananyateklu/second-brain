using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.RAG.Interfaces;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Commands.Notes.UpdateNote;

/// <summary>
/// Handler for UpdateNoteCommand - updates an existing note with ownership verification
/// </summary>
public class UpdateNoteCommandHandler : IRequestHandler<UpdateNoteCommand, Result<NoteResponse>>
{
    private readonly INoteRepository _noteRepository;
    private readonly INoteImageRepository _noteImageRepository;
    private readonly INoteSummaryService _summaryService;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<UpdateNoteCommandHandler> _logger;

    public UpdateNoteCommandHandler(
        INoteRepository noteRepository,
        INoteImageRepository noteImageRepository,
        INoteSummaryService summaryService,
        IServiceScopeFactory serviceScopeFactory,
        ILogger<UpdateNoteCommandHandler> logger)
    {
        _noteRepository = noteRepository;
        _noteImageRepository = noteImageRepository;
        _summaryService = summaryService;
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    public async Task<Result<NoteResponse>> Handle(
        UpdateNoteCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Updating note. NoteId: {NoteId}, UserId: {UserId}", request.NoteId, request.UserId);

        var existingNote = await _noteRepository.GetByIdAsync(request.NoteId);

        if (existingNote == null)
        {
            return Result<NoteResponse>.Failure(
                new Error("NotFound", $"Note with ID '{request.NoteId}' was not found"));
        }

        // Verify ownership
        if (existingNote.UserId != request.UserId)
        {
            _logger.LogWarning(
                "User attempted to update note belonging to another user. UserId: {UserId}, NoteId: {NoteId}, NoteUserId: {NoteUserId}",
                request.UserId, request.NoteId, existingNote.UserId);

            return Result<NoteResponse>.Failure(
                Error.Forbidden("Access denied to this note"));
        }

        // Store old values for summary regeneration check
        var oldContent = existingNote.Content;
        var oldTitle = existingNote.Title;
        var oldTags = existingNote.Tags.ToList();

        // Create an UpdateNoteRequest to use existing mapping logic
        var updateRequest = new UpdateNoteRequest
        {
            Title = request.Title,
            Content = request.Content,
            Tags = request.Tags,
            IsArchived = request.IsArchived,
            Folder = request.Folder,
            UpdateFolder = request.UpdateFolder
        };

        existingNote.UpdateFrom(updateRequest);

        // Check if summary should be regenerated
        var shouldRegenerate = _summaryService.ShouldRegenerateSummary(
            oldContent,
            existingNote.Content,
            oldTitle,
            existingNote.Title,
            oldTags,
            existingNote.Tags);

        if (shouldRegenerate)
        {
            _logger.LogDebug("Regenerating summary for note: {NoteId}", request.NoteId);
            existingNote.Summary = await _summaryService.GenerateSummaryAsync(
                existingNote.Title,
                existingNote.Content,
                existingNote.Tags,
                cancellationToken);
        }
        // If note has no summary yet and summary service is enabled, generate one
        else if (string.IsNullOrEmpty(existingNote.Summary) && _summaryService.IsEnabled)
        {
            _logger.LogDebug("Generating initial summary for note without summary: {NoteId}", request.NoteId);
            existingNote.Summary = await _summaryService.GenerateSummaryAsync(
                existingNote.Title,
                existingNote.Content,
                existingNote.Tags,
                cancellationToken);
        }

        var updatedNote = await _noteRepository.UpdateAsync(request.NoteId, existingNote);

        if (updatedNote == null)
        {
            return Result<NoteResponse>.Failure(
                new Error("UpdateFailed", "Failed to update the note"));
        }

        // Handle image deletions
        if (request.DeletedImageIds != null && request.DeletedImageIds.Count > 0)
        {
            foreach (var imageId in request.DeletedImageIds)
            {
                await _noteImageRepository.DeleteAsync(imageId, cancellationToken);
            }
            _logger.LogInformation("Deleted {Count} images from note {NoteId}", request.DeletedImageIds.Count, request.NoteId);
        }

        // Handle new image uploads
        if (request.Images != null && request.Images.Count > 0)
        {
            var newImages = request.Images.Where(i => string.IsNullOrEmpty(i.Id)).ToList();
            if (newImages.Count > 0)
            {
                _logger.LogInformation("Processing {Count} new images for note {NoteId}", newImages.Count, request.NoteId);

                // Get existing images to determine next index
                var existingImages = await _noteImageRepository.GetByNoteIdAsync(request.NoteId, cancellationToken);
                var nextIndex = existingImages.Count > 0 ? existingImages.Max(i => i.ImageIndex) + 1 : 0;

                var noteImages = new List<NoteImage>();
                foreach (var imageDto in newImages)
                {
                    noteImages.Add(new NoteImage
                    {
                        Id = UuidV7.NewId(),
                        NoteId = request.NoteId,
                        UserId = request.UserId,
                        Base64Data = imageDto.Base64Data,
                        MediaType = imageDto.MediaType,
                        FileName = imageDto.FileName,
                        AltText = imageDto.AltText,
                        ImageIndex = nextIndex++,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }

                var savedImages = await _noteImageRepository.CreateManyAsync(noteImages, cancellationToken);

                // Extract descriptions asynchronously (fire and forget for better UX)
                // Use IServiceScopeFactory to create a new scope for the background task
                // This ensures DI services are available after the HTTP request completes
                var noteId = request.NoteId;
                var noteTitle = updatedNote.Title;
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
                        var logger = scope.ServiceProvider.GetRequiredService<ILogger<UpdateNoteCommandHandler>>();

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
            }
        }

        // Load images for response
        updatedNote.Images = await _noteImageRepository.GetByNoteIdAsync(request.NoteId, cancellationToken);

        _logger.LogInformation(
            "Note updated successfully. NoteId: {NoteId}, SummaryRegenerated: {Regenerated}, ImageCount: {ImageCount}",
            request.NoteId,
            shouldRegenerate,
            updatedNote.Images.Count);

        return Result<NoteResponse>.Success(updatedNote.ToResponse());
    }
}
