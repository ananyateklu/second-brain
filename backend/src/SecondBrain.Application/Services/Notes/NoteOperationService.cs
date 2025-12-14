using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Application.Services.RAG.Interfaces;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Enums;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Domain service implementation for all note mutation operations.
/// Centralizes business logic for validation, versioning, and indexing.
/// </summary>
/// <remarks>
/// <b>ARCHITECTURAL MANDATE:</b> All note mutations MUST use this service.
/// Direct repository access for mutations violates the architecture and will
/// result in inconsistent version tracking.
/// </remarks>
public class NoteOperationService : INoteOperationService
{
    private readonly INoteRepository _noteRepository;
    private readonly INoteImageRepository _noteImageRepository;
    private readonly INoteVersionService _versionService;
    private readonly INoteSummaryService _summaryService;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<NoteOperationService> _logger;

    public NoteOperationService(
        INoteRepository noteRepository,
        INoteImageRepository noteImageRepository,
        INoteVersionService versionService,
        INoteSummaryService summaryService,
        IServiceScopeFactory serviceScopeFactory,
        ILogger<NoteOperationService> logger)
    {
        _noteRepository = noteRepository;
        _noteImageRepository = noteImageRepository;
        _versionService = versionService;
        _summaryService = summaryService;
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    #region Create Operations

    /// <inheritdoc />
    public async Task<Result<NoteOperationResult>> CreateAsync(
        CreateNoteOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Creating note for user {UserId} from source {Source}. Title: {Title}",
            request.UserId, request.Source, request.Title);

        // 1. Validate required fields
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return Result<NoteOperationResult>.Failure(
                Error.Validation("Note title is required and cannot be empty"));
        }

        // 2. Generate AI summary if enabled
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

        // 3. Generate contentJson from markdown if not provided
        var contentJson = request.ContentJson;
        if (string.IsNullOrEmpty(contentJson) && !string.IsNullOrEmpty(request.Content))
        {
            contentJson = MarkdownToTipTapConverter.Convert(request.Content);
            _logger.LogDebug("Generated contentJson from markdown for note: {Title}", request.Title);
        }

        // 4. Create the note entity
        var note = new Note
        {
            Id = UuidV7.NewId(),
            Title = request.Title.Trim(),
            Content = request.Content?.Trim() ?? string.Empty,
            ContentJson = contentJson,
            ContentFormat = !string.IsNullOrEmpty(contentJson)
                ? ContentFormat.TipTapJson
                : ContentFormat.Markdown,
            Summary = summary,
            Tags = request.Tags ?? new List<string>(),
            IsArchived = request.IsArchived,
            Folder = request.Folder?.Trim(),
            UserId = request.UserId,
            ExternalId = request.ExternalId?.Trim(),
            Source = request.Source.ToDbValue(),
            CreatedAt = request.CreatedAt ?? DateTime.UtcNow,
            UpdatedAt = request.UpdatedAt ?? DateTime.UtcNow
        };

        // 4. Persist the note
        var createdNote = await _noteRepository.CreateAsync(note);

        // 5. Handle images BEFORE creating initial version (so version captures image IDs)
        if (request.Images != null && request.Images.Count > 0)
        {
            await ProcessImagesAsync(createdNote.Id, request.UserId, request.Images, cancellationToken);
            // Load images onto the note for version tracking
            createdNote.Images = await _noteImageRepository.GetByNoteIdAsync(createdNote.Id, cancellationToken);
        }

        // 6. Create initial version with source tracking (including images)
        int versionNumber = 1;
        var versionResponse = await _versionService.CreateInitialVersionAsync(
            createdNote, request.UserId, cancellationToken);
        versionNumber = versionResponse.VersionNumber;
        _logger.LogDebug("Created initial version {Version} for note {NoteId} with {ImageCount} images",
            versionNumber, createdNote.Id, createdNote.Images?.Count ?? 0);

        _logger.LogInformation(
            "Note created successfully. NoteId: {NoteId}, Source: {Source}, Version: {Version}",
            createdNote.Id, request.Source, versionNumber);

        return Result<NoteOperationResult>.Success(
            NoteOperationResultFactory.Created(createdNote, versionNumber, request.Source));
    }

    /// <inheritdoc />
    public async Task<Result<NoteOperationResult>> DuplicateAsync(
        DuplicateNoteOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Duplicating note {SourceNoteId} for user {UserId} from source {Source}",
            request.SourceNoteId, request.UserId, request.Source);

        // 1. Fetch source note
        var sourceNote = await _noteRepository.GetByIdAsync(request.SourceNoteId);
        if (sourceNote == null)
        {
            return Result<NoteOperationResult>.Failure(
                Error.NotFound("Note", request.SourceNoteId));
        }

        // 2. Verify ownership
        if (sourceNote.UserId != request.UserId)
        {
            return Result<NoteOperationResult>.Failure(
                Error.Forbidden("You don't have permission to duplicate this note"));
        }

        // 3. Create duplicate
        var duplicateTitle = string.IsNullOrWhiteSpace(request.NewTitle)
            ? $"Copy of {sourceNote.Title}"
            : request.NewTitle.Trim();

        var createRequest = new CreateNoteOperationRequest
        {
            UserId = request.UserId,
            Title = duplicateTitle,
            Content = sourceNote.Content,
            ContentJson = sourceNote.ContentJson, // Preserve the original contentJson
            Tags = new List<string>(sourceNote.Tags),
            Folder = sourceNote.Folder,
            IsArchived = false,
            Source = request.Source
        };

        var result = await CreateAsync(createRequest, cancellationToken);

        if (result.IsSuccess)
        {
            // Override the result to reflect it's a duplication
            var op = result.Value!;
            return Result<NoteOperationResult>.Success(
                NoteOperationResultFactory.Duplicated(op.Note, op.VersionNumber, request.Source, request.SourceNoteId));
        }

        return result;
    }

    #endregion

    #region Update Operations

    /// <inheritdoc />
    public async Task<Result<NoteOperationResult>> UpdateAsync(
        UpdateNoteOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug(
            "Updating note {NoteId} for user {UserId} from source {Source}",
            request.NoteId, request.UserId, request.Source);

        // 1. Fetch existing note
        var note = await _noteRepository.GetByIdAsync(request.NoteId);
        if (note == null)
        {
            return Result<NoteOperationResult>.Failure(
                Error.NotFound("Note", request.NoteId));
        }

        // 2. Verify ownership
        if (note.UserId != request.UserId)
        {
            _logger.LogWarning(
                "User {UserId} attempted to update note {NoteId} belonging to user {OwnerId}",
                request.UserId, request.NoteId, note.UserId);
            return Result<NoteOperationResult>.Failure(
                Error.Forbidden("You don't have permission to update this note"));
        }

        // 3. Store old values for change detection and summary regeneration
        var oldTitle = note.Title;
        var oldContent = note.Content;
        var oldTags = note.Tags.ToList();
        var oldFolder = note.Folder;
        var oldIsArchived = note.IsArchived;

        // 4. Track what actually changes (before modifying the note)
        var changes = new List<string>();

        if (request.Title != null && request.Title != note.Title)
        {
            changes.Add("title");
        }

        if (request.Content != null && request.Content != note.Content)
        {
            changes.Add("content");
        }

        if (request.Tags != null && !request.Tags.SequenceEqual(note.Tags))
        {
            changes.Add("tags");
        }

        if (request.UpdateFolder && request.Folder != note.Folder)
        {
            changes.Add("folder");
        }

        if (request.IsArchived.HasValue && request.IsArchived != note.IsArchived)
        {
            changes.Add(request.IsArchived.Value ? "archived" : "unarchived");
        }

        // Track image changes
        var hasNewImages = request.Images != null && request.Images.Any(i => string.IsNullOrEmpty(i.Id));
        var hasDeletedImages = request.DeletedImageIds != null && request.DeletedImageIds.Count > 0;
        if (hasNewImages || hasDeletedImages)
        {
            changes.Add("images");
        }

        // 5. No changes? Return early without creating a version
        if (changes.Count == 0)
        {
            _logger.LogDebug("No changes detected for note {NoteId}", request.NoteId);
            return Result<NoteOperationResult>.Success(
                NoteOperationResultFactory.NoChanges(note, request.Source));
        }

        // 6. CRITICAL: Check if this note has any version history
        //    If not, create an initial version with the CURRENT (pre-update) state first
        int versionNumber = 0;
        var existingVersionCount = await _versionService.GetVersionCountAsync(request.NoteId, cancellationToken);
        if (existingVersionCount == 0)
        {
            // No version history exists - create initial version capturing the original state
            // Load current images so they're captured in the initial version
            note.Images = await _noteImageRepository.GetByNoteIdAsync(request.NoteId, cancellationToken);
            _logger.LogInformation(
                "Creating initial version for note {NoteId} (no prior history) with {ImageCount} images",
                request.NoteId, note.Images?.Count ?? 0);
            var initialVersion = await _versionService.CreateInitialVersionAsync(
                note, request.UserId, cancellationToken);
            _logger.LogDebug("Created initial version {Version} for note {NoteId}",
                initialVersion.VersionNumber, request.NoteId);
        }

        // 7. Now apply the changes to the note object
        if (request.Title != null && request.Title != oldTitle)
        {
            note.Title = request.Title.Trim();
        }

        if (request.Content != null && request.Content != oldContent)
        {
            note.Content = request.Content;

            // Regenerate contentJson from markdown if not explicitly provided
            // This ensures agent/API updates that only provide markdown get proper JSON
            if (!request.UpdateContentJson)
            {
                note.ContentJson = MarkdownToTipTapConverter.Convert(request.Content);
                note.ContentFormat = ContentFormat.TipTapJson;
                _logger.LogDebug("Regenerated contentJson from markdown for note {NoteId}", request.NoteId);
            }
        }

        // Update ContentJson if explicitly flagged (UI updates provide both)
        if (request.UpdateContentJson)
        {
            note.ContentJson = request.ContentJson;
            note.ContentFormat = !string.IsNullOrEmpty(request.ContentJson)
                ? ContentFormat.TipTapJson
                : ContentFormat.Markdown;
        }

        if (request.Tags != null && !request.Tags.SequenceEqual(oldTags))
        {
            note.Tags = request.Tags;
        }

        if (request.UpdateFolder && request.Folder != oldFolder)
        {
            note.Folder = request.Folder?.Trim();
        }

        if (request.IsArchived.HasValue && request.IsArchived != oldIsArchived)
        {
            note.IsArchived = request.IsArchived.Value;
        }

        // 8. Update source and timestamp
        note.Source = request.Source.ToDbValue();
        note.UpdatedAt = DateTime.UtcNow;

        // 9. Check if summary should be regenerated
        var shouldRegenerate = _summaryService.ShouldRegenerateSummary(
            oldContent, note.Content,
            oldTitle, note.Title,
            oldTags, note.Tags);

        if (shouldRegenerate)
        {
            _logger.LogDebug("Regenerating summary for note {NoteId}", request.NoteId);
            note.Summary = await _summaryService.GenerateSummaryAsync(
                note.Title, note.Content, note.Tags, cancellationToken);
        }
        else if (string.IsNullOrEmpty(note.Summary) && _summaryService.IsEnabled)
        {
            _logger.LogDebug("Generating initial summary for note {NoteId}", request.NoteId);
            note.Summary = await _summaryService.GenerateSummaryAsync(
                note.Title, note.Content, note.Tags, cancellationToken);
        }

        // 10. Persist note updates first
        var updatedNote = await _noteRepository.UpdateAsync(request.NoteId, note);
        if (updatedNote == null)
        {
            return Result<NoteOperationResult>.Failure(
                Error.Internal("Failed to update note"));
        }

        // 11. Handle image deletions BEFORE creating version
        if (request.DeletedImageIds != null && request.DeletedImageIds.Count > 0)
        {
            foreach (var imageId in request.DeletedImageIds)
            {
                await _noteImageRepository.DeleteAsync(imageId, cancellationToken);
            }
            _logger.LogInformation("Deleted {Count} images from note {NoteId}",
                request.DeletedImageIds.Count, request.NoteId);
        }

        // 12. Handle new images BEFORE creating version
        if (request.Images != null && request.Images.Count > 0)
        {
            var newImages = request.Images.Where(i => string.IsNullOrEmpty(i.Id)).ToList();
            if (newImages.Count > 0)
            {
                await ProcessImagesAsync(request.NoteId, request.UserId, newImages, cancellationToken);
            }
        }

        // 13. Load images onto note BEFORE creating version (so version captures correct image IDs)
        updatedNote.Images = await _noteImageRepository.GetByNoteIdAsync(request.NoteId, cancellationToken);

        // 14. Create version snapshot with the NEW state (including images)
        var changeSummary = BuildChangeSummary(changes, request.Source);
        versionNumber = await _versionService.CreateVersionAsync(
            updatedNote, request.UserId, changeSummary, cancellationToken);
        _logger.LogDebug("Created version {Version} for note {NoteId} with {ImageCount} images",
            versionNumber, request.NoteId, updatedNote.Images?.Count ?? 0);

        _logger.LogInformation(
            "Note updated successfully. NoteId: {NoteId}, Source: {Source}, Changes: {Changes}",
            request.NoteId, request.Source, string.Join(", ", changes));

        return Result<NoteOperationResult>.Success(
            NoteOperationResultFactory.Updated(updatedNote, versionNumber, request.Source, changes));
    }

    /// <inheritdoc />
    public async Task<Result<NoteOperationResult>> AppendAsync(
        AppendToNoteOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ContentToAppend))
        {
            return Result<NoteOperationResult>.Failure(
                Error.Validation("Content to append cannot be empty"));
        }

        // Fetch the note first to get current content
        var note = await _noteRepository.GetByIdAsync(request.NoteId);
        if (note == null)
        {
            return Result<NoteOperationResult>.Failure(
                Error.NotFound("Note", request.NoteId));
        }

        if (note.UserId != request.UserId)
        {
            return Result<NoteOperationResult>.Failure(
                Error.Forbidden("You don't have permission to modify this note"));
        }

        // Build new content
        var separator = request.AddNewline ? "\n" : "";
        var newContent = note.Content + separator + request.ContentToAppend.Trim();

        // Use the standard update flow
        var updateRequest = new UpdateNoteOperationRequest
        {
            NoteId = request.NoteId,
            UserId = request.UserId,
            Source = request.Source,
            Content = newContent
        };

        return await UpdateAsync(updateRequest, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<Result<NoteOperationResult>> SetArchivedAsync(
        SetArchivedOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        var updateRequest = new UpdateNoteOperationRequest
        {
            NoteId = request.NoteId,
            UserId = request.UserId,
            Source = request.Source,
            IsArchived = request.IsArchived
        };

        return await UpdateAsync(updateRequest, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<Result<NoteOperationResult>> MoveToFolderAsync(
        MoveToFolderOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        var updateRequest = new UpdateNoteOperationRequest
        {
            NoteId = request.NoteId,
            UserId = request.UserId,
            Source = request.Source,
            Folder = request.Folder,
            UpdateFolder = true
        };

        return await UpdateAsync(updateRequest, cancellationToken);
    }

    #endregion

    #region Delete Operations

    /// <inheritdoc />
    public async Task<Result<NoteDeleteResult>> DeleteAsync(
        DeleteNoteOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Deleting note {NoteId} for user {UserId}. SoftDelete: {SoftDelete}, Source: {Source}",
            request.NoteId, request.UserId, request.SoftDelete, request.Source);

        // 1. Fetch note
        var note = await _noteRepository.GetByIdAsync(request.NoteId);
        if (note == null)
        {
            return Result<NoteDeleteResult>.Failure(
                Error.NotFound("Note", request.NoteId));
        }

        // 2. Verify ownership
        if (note.UserId != request.UserId)
        {
            return Result<NoteDeleteResult>.Failure(
                Error.Forbidden("You don't have permission to delete this note"));
        }

        // 3. Perform delete
        bool success;
        if (request.SoftDelete)
        {
            success = await _noteRepository.SoftDeleteAsync(request.NoteId, request.UserId);
        }
        else
        {
            success = await _noteRepository.DeleteAsync(request.NoteId);
        }

        if (!success)
        {
            return Result<NoteDeleteResult>.Failure(
                Error.Internal("Failed to delete note"));
        }

        _logger.LogInformation(
            "Note deleted successfully. NoteId: {NoteId}, SoftDelete: {SoftDelete}",
            request.NoteId, request.SoftDelete);

        return Result<NoteDeleteResult>.Success(new NoteDeleteResult
        {
            Success = true,
            NoteId = request.NoteId,
            Source = request.Source,
            WasSoftDelete = request.SoftDelete
        });
    }

    /// <inheritdoc />
    public async Task<Result<bool>> PermanentDeleteAsync(
        string noteId,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var success = await _noteRepository.HardDeleteAsync(noteId);
        if (!success)
        {
            return Result<bool>.Failure(Error.NotFound("Note", noteId));
        }
        return Result<bool>.Success(true);
    }

    /// <inheritdoc />
    public async Task<Result<NoteOperationResult>> RestoreDeletedAsync(
        string noteId,
        string userId,
        NoteSource source,
        CancellationToken cancellationToken = default)
    {
        var success = await _noteRepository.RestoreAsync(noteId);
        if (!success)
        {
            return Result<NoteOperationResult>.Failure(
                Error.NotFound("Deleted note", noteId));
        }

        var note = await _noteRepository.GetByIdAsync(noteId);
        if (note == null)
        {
            return Result<NoteOperationResult>.Failure(
                Error.Internal("Note restored but could not be retrieved"));
        }

        // Create version for the restore
        var versionNumber = await _versionService.CreateVersionAsync(
            note, userId, "Restored from trash", cancellationToken);

        return Result<NoteOperationResult>.Success(
            NoteOperationResultFactory.Updated(note, versionNumber, source, new[] { "restored" }));
    }

    /// <inheritdoc />
    public async Task<Result<BulkDeleteResult>> BulkDeleteAsync(
        BulkDeleteNotesOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Bulk deleting {Count} notes for user {UserId}. SoftDelete: {SoftDelete}",
            request.NoteIds.Count, request.UserId, request.SoftDelete);

        int deletedCount;
        if (request.SoftDelete)
        {
            deletedCount = await _noteRepository.SoftDeleteManyAsync(request.NoteIds, request.UserId);
        }
        else
        {
            deletedCount = await _noteRepository.DeleteManyAsync(request.NoteIds, request.UserId);
        }

        _logger.LogInformation("Bulk delete completed. Deleted: {Count}", deletedCount);

        return Result<BulkDeleteResult>.Success(new BulkDeleteResult
        {
            DeletedCount = deletedCount,
            DeletedIds = request.NoteIds.Take(deletedCount).ToList(),
            Source = request.Source,
            WasSoftDelete = request.SoftDelete
        });
    }

    #endregion

    #region Version Operations

    /// <inheritdoc />
    public async Task<Result<RestoreVersionResult>> RestoreVersionAsync(
        RestoreVersionOperationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Restoring note {NoteId} to version {Version} for user {UserId}",
            request.NoteId, request.TargetVersionNumber, request.UserId);

        // 1. Verify note exists and ownership
        var note = await _noteRepository.GetByIdAsync(request.NoteId);
        if (note == null)
        {
            return Result<RestoreVersionResult>.Failure(
                Error.NotFound("Note", request.NoteId));
        }

        if (note.UserId != request.UserId)
        {
            return Result<RestoreVersionResult>.Failure(
                Error.Forbidden("You don't have permission to restore this note"));
        }

        // 2. Get target version
        var targetVersion = await _versionService.GetVersionByNumberAsync(
            request.NoteId, request.TargetVersionNumber, cancellationToken);
        if (targetVersion == null)
        {
            return Result<RestoreVersionResult>.Failure(
                Error.NotFound($"Version {request.TargetVersionNumber} for note", request.NoteId));
        }

        // 3. Track what fields will change
        var changedFields = new List<string>();
        if (note.Title != targetVersion.Title) changedFields.Add("title");
        if (note.Content != targetVersion.Content) changedFields.Add("content");
        if (!note.Tags.SequenceEqual(targetVersion.Tags)) changedFields.Add("tags");
        if (note.Folder != targetVersion.Folder) changedFields.Add("folder");
        if (note.IsArchived != targetVersion.IsArchived) changedFields.Add("archived");

        // 4. Update the note's actual content to match the target version
        note.Title = targetVersion.Title;
        note.Content = targetVersion.Content;
        note.Tags = new List<string>(targetVersion.Tags);
        note.Folder = targetVersion.Folder;
        note.IsArchived = targetVersion.IsArchived;
        note.Source = NoteSource.Restored.ToDbValue();
        note.UpdatedAt = DateTime.UtcNow;

        // Save the updated note first
        await _noteRepository.UpdateAsync(request.NoteId, note);

        // 5. Create a new version record via version service
        var newVersionNumber = await _versionService.RestoreVersionAsync(
            request.NoteId, request.TargetVersionNumber, request.UserId, cancellationToken);

        // Fetch the updated note to return
        var restoredNote = await _noteRepository.GetByIdAsync(request.NoteId);
        if (restoredNote == null)
        {
            return Result<RestoreVersionResult>.Failure(
                Error.Internal("Note restored but could not be retrieved"));
        }

        _logger.LogInformation(
            "Note {NoteId} restored to version {FromVersion}, new version {NewVersion}",
            request.NoteId, request.TargetVersionNumber, newVersionNumber);

        return Result<RestoreVersionResult>.Success(new RestoreVersionResult
        {
            Note = restoredNote,
            RestoredFromVersion = request.TargetVersionNumber,
            NewVersionNumber = newVersionNumber,
            ChangedFields = changedFields
        });
    }

    #endregion

    #region Import Operations

    /// <inheritdoc />
    public async Task<Result<ImportNotesResponse>> ImportBatchAsync(
        string userId,
        IReadOnlyCollection<ImportNoteRequest> notes,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting batch import for user {UserId}. Count: {Count}", userId, notes.Count);

        var response = new ImportNotesResponse();
        var noteIndex = 0;

        foreach (var dto in notes)
        {
            noteIndex++;
            _logger.LogDebug(
                "Processing import {Index}/{Total}. Title: {Title}, ExternalId: {ExternalId}",
                noteIndex, notes.Count, dto.Title ?? "(empty)", dto.ExternalId ?? "(none)");

            try
            {
                // Determine source based on import type
                var source = dto.Source?.ToLowerInvariant() switch
                {
                    "ios_notes" or "ios" or "apple" => NoteSource.IosNotes,
                    "import" or "external" or "generic" => NoteSource.Import,
                    _ => NoteSource.Import
                };

                // Check for existing note by ExternalId
                var existing = !string.IsNullOrWhiteSpace(dto.ExternalId)
                    ? await _noteRepository.GetByUserIdAndExternalIdAsync(userId, dto.ExternalId)
                    : null;

                if (existing == null)
                {
                    // Create new note
                    var createRequest = new CreateNoteOperationRequest
                    {
                        UserId = userId,
                        Title = dto.Title ?? "Imported Note",
                        Content = dto.Content ?? string.Empty,
                        Tags = dto.Tags ?? new List<string>(),
                        Folder = dto.Folder,
                        IsArchived = false, // Imported notes start as not archived
                        ExternalId = dto.ExternalId,
                        Source = source,
                        CreatedAt = dto.CreatedAt.UtcDateTime,
                        UpdatedAt = dto.UpdatedAt.UtcDateTime
                    };

                    var result = await CreateAsync(createRequest, cancellationToken);

                    if (result.IsSuccess)
                    {
                        response.ImportedCount++;
                        response.Notes.Add(new ImportNoteResult
                        {
                            Id = result.Value!.Note.Id,
                            Title = dto.Title ?? string.Empty,
                            Status = "created",
                            Message = "Note successfully imported"
                        });
                    }
                    else
                    {
                        response.SkippedCount++;
                        response.Notes.Add(new ImportNoteResult
                        {
                            Id = null,
                            Title = dto.Title ?? string.Empty,
                            Status = "skipped",
                            Message = result.Error?.Message ?? "Import failed"
                        });
                    }
                }
                else
                {
                    // Update existing note
                    var updateRequest = new UpdateNoteOperationRequest
                    {
                        NoteId = existing.Id,
                        UserId = userId,
                        Source = source,
                        Title = dto.Title,
                        Content = dto.Content,
                        Tags = dto.Tags,
                        Folder = dto.Folder,
                        UpdateFolder = dto.Folder != null
                    };

                    var result = await UpdateAsync(updateRequest, cancellationToken);

                    if (result.IsSuccess)
                    {
                        response.UpdatedCount++;
                        response.Notes.Add(new ImportNoteResult
                        {
                            Id = existing.Id,
                            Title = dto.Title ?? string.Empty,
                            Status = "updated",
                            Message = "Note successfully updated"
                        });
                    }
                    else
                    {
                        response.SkippedCount++;
                        response.Notes.Add(new ImportNoteResult
                        {
                            Id = existing.Id,
                            Title = dto.Title ?? string.Empty,
                            Status = "skipped",
                            Message = result.Error?.Message ?? "Update failed"
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing note. Title: {Title}", dto.Title ?? "(empty)");
                response.SkippedCount++;
                response.Notes.Add(new ImportNoteResult
                {
                    Id = null,
                    Title = dto.Title ?? string.Empty,
                    Status = "skipped",
                    Message = $"Error: {ex.Message}"
                });
            }
        }

        _logger.LogInformation(
            "Import completed. Imported: {Imported}, Updated: {Updated}, Skipped: {Skipped}",
            response.ImportedCount, response.UpdatedCount, response.SkippedCount);

        return Result<ImportNotesResponse>.Success(response);
    }

    #endregion

    #region Private Helpers

    private string? BuildChangeSummary(IReadOnlyList<string> changes, NoteSource source)
    {
        if (changes.Count == 0)
            return null;

        var changeList = string.Join(", ", changes);
        var sourceLabel = source switch
        {
            NoteSource.Agent => " (by Agent)",
            NoteSource.IosNotes => " (from iOS)",
            NoteSource.Import => " (from import)",
            NoteSource.System => " (system)",
            NoteSource.Api => " (via API)",
            _ => ""
        };

        return $"Updated: {changeList}{sourceLabel}";
    }

    private async Task ProcessImagesAsync(
        string noteId,
        string userId,
        IList<DTOs.NoteImageDto> images,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Processing {Count} images for note {NoteId}", images.Count, noteId);

        // Get existing images to determine next index
        var existingImages = await _noteImageRepository.GetByNoteIdAsync(noteId, cancellationToken);
        var nextIndex = existingImages.Count > 0 ? existingImages.Max(i => i.ImageIndex) + 1 : 0;

        var noteImages = new List<NoteImage>();
        foreach (var imageDto in images)
        {
            noteImages.Add(new NoteImage
            {
                Id = UuidV7.NewId(),
                NoteId = noteId,
                UserId = userId,
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

        // Extract descriptions asynchronously (fire and forget)
        var capturedNoteId = noteId;
        var capturedImages = savedImages.Select(img => new ImageInput
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
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<NoteOperationService>>();

                if (!imageDescriptionService.IsAvailable)
                {
                    logger.LogDebug("Image description service not available, skipping extraction");
                    return;
                }

                var note = await _noteRepository.GetByIdAsync(capturedNoteId);
                var noteTitle = note?.Title ?? "Untitled";

                var results = await imageDescriptionService.ExtractDescriptionsBatchAsync(
                    capturedImages, noteTitle, CancellationToken.None);

                foreach (var result in results.Where(r => r.Success && !string.IsNullOrEmpty(r.Description)))
                {
                    await noteImageRepository.UpdateDescriptionAsync(
                        result.ImageId!,
                        result.Description!,
                        result.Provider ?? "unknown",
                        result.Model ?? "unknown",
                        CancellationToken.None);
                }

                logger.LogInformation(
                    "Extracted descriptions for {Count}/{Total} images for note {NoteId}",
                    results.Count(r => r.Success), capturedImages.Count, capturedNoteId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background image description extraction failed for note {NoteId}", capturedNoteId);
            }
        });
    }

    #endregion
}
