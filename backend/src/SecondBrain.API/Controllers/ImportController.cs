using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.API.Utilities;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Import endpoints for external data
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ImportController : ControllerBase
{
    private readonly INotesImportService _notesImportService;
    private readonly IUserRepository _userRepository;
    private readonly ILogger<ImportController> _logger;

    public ImportController(
        INotesImportService notesImportService,
        IUserRepository userRepository,
        ILogger<ImportController> logger)
    {
        _notesImportService = notesImportService;
        _userRepository = userRepository;
        _logger = logger;
    }

    /// <summary>
    /// Import notes from external sources (e.g., iOS Notes)
    /// Requires authentication via JWT token or API key
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Import results</returns>
    [HttpPost("notes")]
    [ProducesResponseType(typeof(ImportNotesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ImportNotesResponse>> ImportNotes(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Import notes endpoint hit");

        // Get authenticated user from middleware
        var userId = HttpContext.Items["UserId"]?.ToString();
        
        if (string.IsNullOrEmpty(userId))
        {
            _logger.LogWarning("User not authenticated");
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            // 1. Parse request body
            _logger.LogInformation("Step 1: Parsing request body. UserId: {UserId}", userId);
            using var document = await JsonDocument.ParseAsync(Request.Body, cancellationToken: cancellationToken);
            var root = document.RootElement;
            _logger.LogInformation("Step 1 completed: Request body parsed successfully");

            // 2. Normalize to list of notes
            _logger.LogInformation("Step 2: Normalizing request to note list");
            var notes = IosNotesImportHelper.NormalizeRequestToNoteList(root);
            if (notes.Count == 0)
            {
                _logger.LogWarning("Step 2 failed: No notes provided in request or failed to parse any notes");
                throw new ValidationException("notes", "No notes provided.");
            }
            _logger.LogInformation("Step 2 completed: Successfully parsed and normalized notes. NoteCount: {NoteCount}", notes.Count);
            
            for (int i = 0; i < notes.Count; i++)
            {
                var note = notes[i];
                _logger.LogInformation("Parsed note. Index: {Index}, Title: {Title}, ExternalId: {ExternalId}, ContentLength: {ContentLength}, Folder: {Folder}, TagsCount: {TagsCount}, CreatedAt: {CreatedAt}, UpdatedAt: {UpdatedAt}",
                    i + 1, note.Title ?? "(empty)", note.ExternalId ?? "(none)", note.Content?.Length ?? 0, note.Folder ?? "(none)", note.Tags?.Count ?? 0, note.CreatedAt, note.UpdatedAt);
            }

            // 3. Import notes
            _logger.LogInformation("Step 3: Starting import. NoteCount: {NoteCount}, UserId: {UserId}", notes.Count, userId);
            var response = await _notesImportService.ImportAsync(userId, notes, cancellationToken);
            _logger.LogInformation("Step 3 completed: Import finished. Imported: {ImportedCount}, Updated: {UpdatedCount}, Skipped: {SkippedCount}",
                response.ImportedCount, response.UpdatedCount, response.SkippedCount);

            _logger.LogInformation("Import notes endpoint completed successfully");
            return Ok(response);
        }
        catch (ValidationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during import. UserId: {UserId}", userId);
            throw;
        }
    }
}

