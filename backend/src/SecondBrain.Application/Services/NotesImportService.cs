using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Notes;

namespace SecondBrain.Application.Services;

/// <summary>
/// Import service that delegates to INoteOperationService for consistent version tracking.
/// This service acts as a thin wrapper to maintain backward compatibility.
/// </summary>
/// <remarks>
/// <b>ARCHITECTURAL NOTE:</b> All import operations now flow through INoteOperationService
/// to ensure proper source tracking, version history, and summary generation.
/// </remarks>
public class NotesImportService : INotesImportService
{
    private readonly INoteOperationService _noteOperationService;
    private readonly ILogger<NotesImportService> _logger;

    public NotesImportService(
        INoteOperationService noteOperationService,
        ILogger<NotesImportService> logger)
    {
        _noteOperationService = noteOperationService;
        _logger = logger;
    }

    public async Task<ImportNotesResponse> ImportAsync(
        string userId,
        IReadOnlyCollection<ImportNoteRequest> notes,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting import process via NoteOperationService. NoteCount: {NoteCount}", notes.Count);

        // Delegate to the central operation service for consistent handling
        var result = await _noteOperationService.ImportBatchAsync(userId, notes, cancellationToken);

        if (result.IsSuccess)
        {
            var response = result.Value!;
            _logger.LogInformation(
                "Import process completed. Imported: {ImportedCount}, Updated: {UpdatedCount}, Skipped: {SkippedCount}",
                response.ImportedCount, response.UpdatedCount, response.SkippedCount);
            return response;
        }

        // In case of error, return empty response with error details
        _logger.LogError("Import failed: {Error}", result.Error?.Message ?? "Unknown error");
        return new ImportNotesResponse
        {
            SkippedCount = notes.Count,
            Notes = notes.Select(n => new ImportNoteResult
            {
                Id = null,
                Title = n.Title ?? string.Empty,
                Status = "skipped",
                Message = result.Error?.Message ?? "Import operation failed"
            }).ToList()
        };
    }
}
