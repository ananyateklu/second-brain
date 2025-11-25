using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.Application.Services;

public class NotesImportService : INotesImportService
{
    private readonly INoteRepository _noteRepository;
    private readonly ILogger<NotesImportService> _logger;

    public NotesImportService(INoteRepository noteRepository, ILogger<NotesImportService> logger)
    {
        _noteRepository = noteRepository;
        _logger = logger;
    }

    public async Task<ImportNotesResponse> ImportAsync(
        string userId,
        IReadOnlyCollection<ImportNoteRequest> notes,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting import process. NoteCount: {NoteCount}", notes.Count);
        var response = new ImportNotesResponse();
        var noteIndex = 0;

        foreach (var dto in notes)
        {
            noteIndex++;
            _logger.LogInformation("Processing note {NoteIndex}/{TotalNotes}. Title: {Title}, ExternalId: {ExternalId}", 
                noteIndex, notes.Count, dto.Title ?? "(empty)", dto.ExternalId ?? "(none)");

            try
            {
                // Try to find existing note by ExternalId if provided
                var existing = !string.IsNullOrWhiteSpace(dto.ExternalId)
                    ? await _noteRepository.GetByUserIdAndExternalIdAsync(userId, dto.ExternalId)
                    : null;

                if (existing is null)
                {
                    // Create new note
                    _logger.LogInformation("Creating new note. Title: {Title}, ContentLength: {ContentLength}, Folder: {Folder}, TagsCount: {TagsCount}, CreatedAt: {CreatedAt}, UpdatedAt: {UpdatedAt}", 
                        dto.Title, dto.Content?.Length ?? 0, dto.Folder ?? "(none)", dto.Tags?.Count ?? 0, dto.CreatedAt, dto.UpdatedAt);
                    
                    var newNote = dto.ToEntity(userId);
                    var created = await _noteRepository.CreateAsync(newNote);
                    
                    _logger.LogInformation("Note successfully created. NoteId: {NoteId}, CreatedAt: {CreatedAt}, UpdatedAt: {UpdatedAt}", 
                        created.Id, created.CreatedAt, created.UpdatedAt);
                    
                    response.ImportedCount++;
                    response.Notes.Add(new ImportNoteResult
                    {
                        Id = created.Id,
                        Title = dto.Title ?? string.Empty,
                        Status = "created",
                        Message = "Note successfully imported"
                    });
                }
                else
                {
                    // Update existing note
                    _logger.LogInformation("Updating existing note. NoteId: {NoteId}, Title: {Title}, ContentLength: {ContentLength}, Folder: {Folder}, TagsCount: {TagsCount}, NewUpdatedAt: {NewUpdatedAt}", 
                        existing.Id, dto.Title, dto.Content?.Length ?? 0, dto.Folder ?? "(none)", dto.Tags?.Count ?? 0, dto.UpdatedAt);
                    
                    existing.UpdateFrom(dto);
                    var updated = await _noteRepository.UpdateAsync(existing.Id, existing);
                    
                    if (updated != null)
                    {
                        _logger.LogInformation("Note successfully updated. NoteId: {NoteId}, UpdatedAt: {UpdatedAt}", existing.Id, updated.UpdatedAt);
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
                        _logger.LogWarning("Note update returned null. NoteId: {NoteId}", existing.Id);
                        throw new Exception("Update operation returned null");
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error and continue with next note
                _logger.LogError(ex, "Error importing note. Title: {Title}, ExternalId: {ExternalId}", 
                    dto.Title ?? "(empty)", dto.ExternalId ?? "(none)");
                
                response.SkippedCount++;
                response.Notes.Add(new ImportNoteResult
                {
                    Id = null,
                    Title = dto.Title ?? string.Empty,
                    Status = "skipped",
                    Message = $"Error importing note: {ex.Message}"
                });
            }
        }

        _logger.LogInformation("Import process completed. Imported: {ImportedCount}, Updated: {UpdatedCount}, Skipped: {SkippedCount}", 
            response.ImportedCount, response.UpdatedCount, response.SkippedCount);

        return response;
    }
}
