using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Import.ImportNotes;

/// <summary>
/// Handler for ImportNotesCommand
/// </summary>
public class ImportNotesCommandHandler : IRequestHandler<ImportNotesCommand, Result<ImportNotesResponse>>
{
    private readonly INotesImportService _notesImportService;
    private readonly ILogger<ImportNotesCommandHandler> _logger;

    public ImportNotesCommandHandler(
        INotesImportService notesImportService,
        ILogger<ImportNotesCommandHandler> logger)
    {
        _notesImportService = notesImportService;
        _logger = logger;
    }

    public async Task<Result<ImportNotesResponse>> Handle(
        ImportNotesCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting import for user {UserId}. NoteCount: {NoteCount}",
            request.UserId, request.Notes.Count);

        try
        {
            if (request.Notes.Count == 0)
            {
                return Result<ImportNotesResponse>.Failure(Error.Validation("No notes provided"));
            }

            var response = await _notesImportService.ImportAsync(request.UserId, request.Notes, cancellationToken);

            _logger.LogInformation("Import completed. Imported: {ImportedCount}, Updated: {UpdatedCount}, Skipped: {SkippedCount}",
                response.ImportedCount, response.UpdatedCount, response.SkippedCount);

            return Result<ImportNotesResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during import. UserId: {UserId}", request.UserId);
            return Result<ImportNotesResponse>.Failure(Error.Internal("Import failed"));
        }
    }
}
