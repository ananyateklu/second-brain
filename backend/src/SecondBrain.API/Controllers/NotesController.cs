using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.API.Extensions;
using SecondBrain.Application.Commands.Notes.BulkDeleteNotes;
using SecondBrain.Application.Commands.Notes.CreateNote;
using SecondBrain.Application.Commands.Notes.DeleteNote;
using SecondBrain.Application.Commands.Notes.UpdateNote;
using SecondBrain.Application.DTOs.Common;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Mappings;
using SecondBrain.Application.Queries.Notes.GetAllNotes;
using SecondBrain.Application.Queries.Notes.GetNoteById;
using SecondBrain.Application.Queries.Notes.GetNotesPaged;
using SecondBrain.Application.Services.Notes;
using SecondBrain.Application.Services.RAG.Interfaces;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Notes management endpoints using CQRS pattern with MediatR
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class NotesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly INoteVersionService _versionService;
    private readonly INoteSummaryService _summaryService;
    private readonly ISummaryGenerationBackgroundService _summaryBackgroundService;
    private readonly INoteRepository _noteRepository;
    private readonly INoteImageRepository _noteImageRepository;
    private readonly IImageDescriptionService _imageDescriptionService;
    private readonly ILogger<NotesController> _logger;

    public NotesController(
        IMediator mediator,
        INoteVersionService versionService,
        INoteSummaryService summaryService,
        ISummaryGenerationBackgroundService summaryBackgroundService,
        INoteRepository noteRepository,
        INoteImageRepository noteImageRepository,
        IImageDescriptionService imageDescriptionService,
        ILogger<NotesController> logger)
    {
        _mediator = mediator;
        _versionService = versionService;
        _summaryService = summaryService;
        _summaryBackgroundService = summaryBackgroundService;
        _noteRepository = noteRepository;
        _noteImageRepository = noteImageRepository;
        _imageDescriptionService = imageDescriptionService;
        _logger = logger;
    }

    /// <summary>
    /// Get all notes for the authenticated user.
    /// Returns lightweight response with summary instead of full content for better performance.
    /// </summary>
    /// <returns>List of notes with summaries</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<NoteListResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<NoteListResponse>>> GetAllNotes(CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetAllNotesQuery(userId);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Get paginated notes for the authenticated user.
    /// Returns lightweight response with summary instead of full content for better performance.
    /// </summary>
    /// <param name="page">Page number (1-based, default: 1)</param>
    /// <param name="pageSize">Number of items per page (default: 20, max: 100)</param>
    /// <param name="folder">Optional folder filter</param>
    /// <param name="includeArchived">Include archived notes (default: false)</param>
    /// <param name="search">Optional search query</param>
    /// <param name="sortBy">Field to sort by: createdAt, updatedAt, title (default: updatedAt)</param>
    /// <param name="sortDirection">Sort direction: asc or desc (default: desc)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Paginated list of notes</returns>
    [HttpGet("paged")]
    [ProducesResponseType(typeof(PaginatedResult<NoteListResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PaginatedResult<NoteListResponse>>> GetNotesPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? folder = null,
        [FromQuery] bool includeArchived = false,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        // Parse sort direction (default to Descending if not specified or invalid)
        var sortDir = string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase)
            ? SortDirection.Ascending
            : SortDirection.Descending;

        var query = new GetNotesPagedQuery(userId, page, pageSize, folder, includeArchived, search, sortBy, sortDir);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Get all notes with full content for export/import purposes (e.g., iOS Shortcuts).
    /// Returns full NoteResponse with content field included.
    /// This endpoint is optimized for external integrations that need complete note data.
    /// </summary>
    /// <returns>List of notes with full content</returns>
    [HttpGet("for-export")]
    [ProducesResponseType(typeof(IEnumerable<NoteResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<NoteResponse>>> GetAllNotesForExport(CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var notes = await _noteRepository.GetByUserIdAsync(userId);
        var responses = notes.Select(n => n.ToResponse());

        return Ok(responses);
    }

    /// <summary>
    /// Get a specific note by ID (must belong to authenticated user)
    /// </summary>
    /// <param name="id">Note ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Note details</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(NoteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<NoteResponse>> GetNoteById(string id, CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetNoteByIdQuery(id, userId);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Create a new note
    /// </summary>
    /// <param name="request">Note creation details</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Created note</returns>
    [HttpPost]
    [ProducesResponseType(typeof(NoteResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<NoteResponse>> CreateNote([FromBody] CreateNoteRequest request, CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new CreateNoteCommand(
            request.Title,
            request.Content,
            request.Tags,
            request.IsArchived,
            request.Folder,
            userId,
            request.Images);

        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<ActionResult<NoteResponse>>(
            note => CreatedAtAction(nameof(GetNoteById), new { id = note.Id }, note),
            error => result.ToActionResult());
    }

    /// <summary>
    /// Update an existing note (must belong to authenticated user)
    /// </summary>
    /// <param name="id">Note ID</param>
    /// <param name="request">Updated note details</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated note</returns>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(NoteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<NoteResponse>> UpdateNote(string id, [FromBody] UpdateNoteRequest request, CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new UpdateNoteCommand(
            id,
            request.Title,
            request.Content,
            request.Tags,
            request.IsArchived,
            request.Folder,
            request.UpdateFolder,
            userId,
            request.Images,
            request.DeletedImageIds);

        var result = await _mediator.Send(command, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Delete a note (must belong to authenticated user)
    /// </summary>
    /// <param name="id">Note ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>No content</returns>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeleteNote(string id, CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new DeleteNoteCommand(id, userId);
        var result = await _mediator.Send(command, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Bulk delete multiple notes (must belong to authenticated user)
    /// </summary>
    /// <param name="request">Request containing note IDs to delete</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of deleted notes</returns>
    [HttpPost("bulk-delete")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> BulkDeleteNotes(
        [FromBody] BulkDeleteNotesRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        if (request.NoteIds == null || request.NoteIds.Count == 0)
        {
            return BadRequest(new { error = "At least one note ID is required" });
        }

        var command = new BulkDeleteNotesCommand(request.NoteIds, userId);
        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<ActionResult>(
            deletedCount => Ok(new { deletedCount, message = $"Successfully deleted {deletedCount} note(s)" }),
            error => ResultExtensions.ToErrorActionResult(error));
    }

    // =========================================================================
    // Note Summary Generation Endpoints
    // =========================================================================

    /// <summary>
    /// Generate AI summaries for notes that don't have them.
    /// </summary>
    /// <param name="request">Request containing optional note IDs to generate summaries for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Summary generation results</returns>
    [HttpPost("generate-summaries")]
    [ProducesResponseType(typeof(GenerateSummariesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<GenerateSummariesResponse>> GenerateSummaries(
        [FromBody] GenerateSummariesRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        if (!_summaryService.IsEnabled)
        {
            return BadRequest(new { error = "Note summary generation is disabled" });
        }

        var response = new GenerateSummariesResponse();
        var userNotes = await _noteRepository.GetByUserIdAsync(userId);
        var notesList = userNotes.ToList();

        // If specific note IDs provided, filter to those
        IEnumerable<Core.Entities.Note> notesToProcess;
        if (request.NoteIds.Count > 0)
        {
            var requestedIds = new HashSet<string>(request.NoteIds);
            notesToProcess = notesList.Where(n => requestedIds.Contains(n.Id));
        }
        else
        {
            // Process notes without summaries
            notesToProcess = notesList.Where(n => string.IsNullOrEmpty(n.Summary));
        }

        foreach (var note in notesToProcess)
        {
            response.TotalProcessed++;

            // Skip if already has summary (unless specifically requested)
            if (!string.IsNullOrEmpty(note.Summary) && request.NoteIds.Count == 0)
            {
                response.SkippedCount++;
                response.Results.Add(new SummaryGenerationResult
                {
                    NoteId = note.Id,
                    Title = note.Title,
                    Success = false,
                    Skipped = true,
                    Summary = note.Summary
                });
                continue;
            }

            try
            {
                var summary = await _summaryService.GenerateSummaryAsync(
                    note.Title,
                    note.Content,
                    note.Tags,
                    cancellationToken);

                if (!string.IsNullOrEmpty(summary))
                {
                    // Update the note with the summary
                    note.Summary = summary;
                    await _noteRepository.UpdateAsync(note.Id, note);

                    response.SuccessCount++;
                    response.Results.Add(new SummaryGenerationResult
                    {
                        NoteId = note.Id,
                        Title = note.Title,
                        Success = true,
                        Summary = summary
                    });
                }
                else
                {
                    response.FailureCount++;
                    response.Results.Add(new SummaryGenerationResult
                    {
                        NoteId = note.Id,
                        Title = note.Title,
                        Success = false,
                        Error = "Summary generation returned empty result"
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate summary for note {NoteId}", note.Id);
                response.FailureCount++;
                response.Results.Add(new SummaryGenerationResult
                {
                    NoteId = note.Id,
                    Title = note.Title,
                    Success = false,
                    Error = ex.Message
                });
            }
        }

        return Ok(response);
    }

    // =========================================================================
    // Background Summary Generation Job Endpoints
    // =========================================================================

    /// <summary>
    /// Start a background job to generate AI summaries for notes.
    /// Returns immediately with job ID for polling status.
    /// </summary>
    /// <param name="request">Request containing optional note IDs to generate summaries for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The created summary job</returns>
    [HttpPost("summaries/start")]
    [ProducesResponseType(typeof(SummaryJobResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<SummaryJobResponse>> StartSummaryGeneration(
        [FromBody] GenerateSummariesRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        if (!_summaryService.IsEnabled)
        {
            return BadRequest(new { error = "Note summary generation is disabled" });
        }

        try
        {
            var job = await _summaryBackgroundService.StartSummaryGenerationAsync(
                userId,
                request.NoteIds,
                cancellationToken);

            var response = new SummaryJobResponse
            {
                Id = job.Id,
                Status = job.Status,
                TotalNotes = job.TotalNotes,
                ProcessedNotes = job.ProcessedNotes,
                SuccessCount = job.SuccessCount,
                FailureCount = job.FailureCount,
                SkippedCount = job.SkippedCount,
                Errors = job.Errors,
                StartedAt = job.StartedAt,
                CompletedAt = job.CompletedAt,
                CreatedAt = job.CreatedAt
            };

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            // Already running job
            _logger.LogWarning(ex, "Failed to start summary generation. UserId: {UserId}", userId);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting summary generation. UserId: {UserId}", userId);
            return StatusCode(500, new { error = "Failed to start summary generation" });
        }
    }

    /// <summary>
    /// Get the status of a summary generation job.
    /// </summary>
    /// <param name="jobId">The job ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The job status</returns>
    [HttpGet("summaries/status/{jobId}")]
    [ProducesResponseType(typeof(SummaryJobResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SummaryJobResponse>> GetSummaryJobStatus(
        string jobId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var job = await _summaryBackgroundService.GetJobStatusAsync(jobId, cancellationToken);

            if (job == null)
            {
                return NotFound(new { error = $"Summary job '{jobId}' not found" });
            }

            var response = new SummaryJobResponse
            {
                Id = job.Id,
                Status = job.Status,
                TotalNotes = job.TotalNotes,
                ProcessedNotes = job.ProcessedNotes,
                SuccessCount = job.SuccessCount,
                FailureCount = job.FailureCount,
                SkippedCount = job.SkippedCount,
                Errors = job.Errors,
                StartedAt = job.StartedAt,
                CompletedAt = job.CompletedAt,
                CreatedAt = job.CreatedAt
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting summary job status. JobId: {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to get summary job status" });
        }
    }

    /// <summary>
    /// Cancel an active summary generation job.
    /// </summary>
    /// <param name="jobId">The job ID to cancel</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Success or failure</returns>
    [HttpPost("summaries/cancel/{jobId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> CancelSummaryJob(
        string jobId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var success = await _summaryBackgroundService.CancelJobAsync(jobId, cancellationToken);

            if (!success)
            {
                return NotFound(new { error = $"Summary job '{jobId}' not found or already completed" });
            }

            return Ok(new { message = "Summary job cancelled successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling summary job. JobId: {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to cancel summary job" });
        }
    }

    // =========================================================================
    // Note Version History Endpoints (PostgreSQL 18 Temporal Features)
    // =========================================================================

    /// <summary>
    /// Get version history for a note
    /// </summary>
    /// <param name="id">Note ID</param>
    /// <param name="skip">Number of versions to skip</param>
    /// <param name="take">Number of versions to take</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Version history</returns>
    [HttpGet("{id}/versions")]
    [ProducesResponseType(typeof(NoteVersionHistoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<NoteVersionHistoryResponse>> GetVersionHistory(
        string id,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        // Verify the note belongs to the user
        var noteResult = await _mediator.Send(new GetNoteByIdQuery(id, userId), cancellationToken);
        if (!noteResult.IsSuccess)
        {
            return ResultExtensions.ToErrorActionResult<NoteVersionHistoryResponse>(noteResult.Error!);
        }

        var history = await _versionService.GetVersionHistoryAsync(id, skip, take, cancellationToken);
        return Ok(history);
    }

    /// <summary>
    /// Get a specific version of a note by version number
    /// </summary>
    /// <param name="id">Note ID</param>
    /// <param name="versionNumber">Version number</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Note version</returns>
    [HttpGet("{id}/versions/{versionNumber:int}")]
    [ProducesResponseType(typeof(NoteVersionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<NoteVersionResponse>> GetVersion(
        string id,
        int versionNumber,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        // Verify the note belongs to the user
        var noteResult = await _mediator.Send(new GetNoteByIdQuery(id, userId), cancellationToken);
        if (!noteResult.IsSuccess)
        {
            return ResultExtensions.ToErrorActionResult<NoteVersionResponse>(noteResult.Error!);
        }

        var version = await _versionService.GetVersionByNumberAsync(id, versionNumber, cancellationToken);
        if (version == null)
        {
            return NotFound(new { error = $"Version {versionNumber} not found for note {id}" });
        }

        return Ok(version);
    }

    /// <summary>
    /// Get note content as it was at a specific point in time
    /// </summary>
    /// <param name="id">Note ID</param>
    /// <param name="timestamp">Point in time (ISO 8601 format)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Note version at that time</returns>
    [HttpGet("{id}/versions/at")]
    [ProducesResponseType(typeof(NoteVersionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<NoteVersionResponse>> GetVersionAtTime(
        string id,
        [FromQuery] DateTime timestamp,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        // Verify the note belongs to the user
        var noteResult = await _mediator.Send(new GetNoteByIdQuery(id, userId), cancellationToken);
        if (!noteResult.IsSuccess)
        {
            return ResultExtensions.ToErrorActionResult<NoteVersionResponse>(noteResult.Error!);
        }

        var version = await _versionService.GetVersionAtTimeAsync(id, timestamp, cancellationToken);
        if (version == null)
        {
            return NotFound(new { error = $"No version found for note {id} at {timestamp:O}" });
        }

        return Ok(version);
    }

    /// <summary>
    /// Compare two versions of a note
    /// </summary>
    /// <param name="id">Note ID</param>
    /// <param name="fromVersion">Earlier version number</param>
    /// <param name="toVersion">Later version number</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Version diff</returns>
    [HttpGet("{id}/versions/diff")]
    [ProducesResponseType(typeof(NoteVersionDiffResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<NoteVersionDiffResponse>> GetVersionDiff(
        string id,
        [FromQuery] int fromVersion,
        [FromQuery] int toVersion,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        // Verify the note belongs to the user
        var noteResult = await _mediator.Send(new GetNoteByIdQuery(id, userId), cancellationToken);
        if (!noteResult.IsSuccess)
        {
            return ResultExtensions.ToErrorActionResult<NoteVersionDiffResponse>(noteResult.Error!);
        }

        var diff = await _versionService.GetVersionDiffAsync(id, fromVersion, toVersion, cancellationToken);
        if (diff == null)
        {
            return NotFound(new { error = $"One or both versions not found for note {id}" });
        }

        return Ok(diff);
    }

    /// <summary>
    /// Restore a note to a previous version
    /// </summary>
    /// <param name="id">Note ID</param>
    /// <param name="request">Restore request with target version</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>New version number</returns>
    [HttpPost("{id}/versions/restore")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> RestoreVersion(
        string id,
        [FromBody] RestoreVersionRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        // Verify the note belongs to the user
        var noteResult = await _mediator.Send(new GetNoteByIdQuery(id, userId), cancellationToken);
        if (!noteResult.IsSuccess)
        {
            return ResultExtensions.ToErrorActionResult(noteResult.Error!);
        }

        try
        {
            var newVersionNumber = await _versionService.RestoreVersionAsync(id, request.TargetVersion, userId, cancellationToken);
            return Ok(new
            {
                message = $"Note restored to version {request.TargetVersion}",
                newVersionNumber,
                noteId = id
            });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Extract AI descriptions for images attached to a note.
    /// This endpoint can be used to generate descriptions for images that don't have them yet.
    /// </summary>
    /// <param name="id">Note ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Results of description extraction</returns>
    [HttpPost("{id}/images/extract-descriptions")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ExtractImageDescriptions(string id, CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        // Verify note exists and belongs to user
        var note = await _noteRepository.GetByIdAsync(id);
        if (note == null)
        {
            return NotFound(new { error = $"Note with ID '{id}' was not found" });
        }

        if (note.UserId != userId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied to this note" });
        }

        // Get images for the note
        var images = await _noteImageRepository.GetByNoteIdAsync(id, cancellationToken);
        if (images.Count == 0)
        {
            return Ok(new
            {
                message = "No images found for this note",
                totalImages = 0,
                processedCount = 0,
                successCount = 0
            });
        }

        // Filter images without descriptions
        var imagesToProcess = images
            .Where(img => string.IsNullOrEmpty(img.Description))
            .ToList();

        if (imagesToProcess.Count == 0)
        {
            return Ok(new
            {
                message = "All images already have descriptions",
                totalImages = images.Count,
                processedCount = 0,
                successCount = 0
            });
        }

        if (!_imageDescriptionService.IsAvailable)
        {
            return BadRequest(new { error = "Image description service is not available. Please configure a vision-capable AI provider (Gemini, OpenAI, or Claude)." });
        }

        _logger.LogInformation("Extracting descriptions for {Count} images in note {NoteId}", imagesToProcess.Count, id);

        // Extract descriptions
        var inputs = imagesToProcess.Select(img => new ImageInput
        {
            Id = img.Id,
            Base64Data = img.Base64Data,
            MediaType = img.MediaType,
            AltText = img.AltText
        });

        var results = await _imageDescriptionService.ExtractDescriptionsBatchAsync(inputs, note.Title, cancellationToken);

        // Update images with descriptions
        var successCount = 0;
        foreach (var result in results.Where(r => r.Success && !string.IsNullOrEmpty(r.Description)))
        {
            var updated = await _noteImageRepository.UpdateDescriptionAsync(
                result.ImageId!,
                result.Description!,
                result.Provider ?? "unknown",
                result.Model ?? "unknown",
                cancellationToken);

            if (updated)
            {
                successCount++;
            }
        }

        _logger.LogInformation("Extracted descriptions for {Success}/{Total} images in note {NoteId}",
            successCount, imagesToProcess.Count, id);

        return Ok(new
        {
            message = $"Extracted descriptions for {successCount} of {imagesToProcess.Count} images",
            totalImages = images.Count,
            processedCount = imagesToProcess.Count,
            successCount,
            results = results.Select(r => new
            {
                imageId = r.ImageId,
                success = r.Success,
                error = r.Error,
                provider = r.Provider,
                model = r.Model
            })
        });
    }
}
