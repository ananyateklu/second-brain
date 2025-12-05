using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Services.Notes;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Notes management endpoints
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class NotesController : ControllerBase
{
    private readonly INoteService _noteService;
    private readonly ILogger<NotesController> _logger;

    public NotesController(INoteService noteService, ILogger<NotesController> logger)
    {
        _noteService = noteService;
        _logger = logger;
    }

    /// <summary>
    /// Get all notes for the authenticated user
    /// </summary>
    /// <returns>List of notes</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<NoteResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<NoteResponse>>> GetAllNotes(CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            var notes = await _noteService.GetAllNotesAsync(userId, cancellationToken);
            return Ok(notes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving notes for user. UserId: {UserId}", userId);
            throw;
        }
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

        try
        {
            var note = await _noteService.GetNoteByIdAsync(id, userId, cancellationToken);

            if (note == null)
            {
                throw new NotFoundException("Note", id);
            }

            return Ok(note);
        }
        catch (UnauthorizedException)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
        }
        catch (NotFoundException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving note. NoteId: {NoteId}, UserId: {UserId}", id, userId);
            throw;
        }
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

        try
        {
            var note = await _noteService.CreateNoteAsync(request, userId, cancellationToken);
            return CreatedAtAction(nameof(GetNoteById), new { id = note.Id }, note);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating note for user. UserId: {UserId}", userId);
            throw;
        }
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

        try
        {
            var note = await _noteService.UpdateNoteAsync(id, request, userId, cancellationToken);

            if (note == null)
            {
                throw new NotFoundException("Note", id);
            }

            return Ok(note);
        }
        catch (UnauthorizedException)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
        }
        catch (NotFoundException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating note. NoteId: {NoteId}, UserId: {UserId}", id, userId);
            throw;
        }
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

        try
        {
            var deleted = await _noteService.DeleteNoteAsync(id, userId, cancellationToken);

            if (!deleted)
            {
                throw new NotFoundException("Note", id);
            }

            return NoContent();
        }
        catch (UnauthorizedException)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
        }
        catch (NotFoundException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting note. NoteId: {NoteId}, UserId: {UserId}", id, userId);
            throw;
        }
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

        try
        {
            _logger.LogInformation("Bulk deleting {Count} notes for user {UserId}",
                request.NoteIds.Count, userId);

            var deletedCount = await _noteService.BulkDeleteNotesAsync(
                request.NoteIds, userId, cancellationToken);

            return Ok(new { deletedCount, message = $"Successfully deleted {deletedCount} note(s)" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk deleting notes. Count: {Count}, UserId: {UserId}",
                request.NoteIds.Count, userId);
            return StatusCode(500, new { error = "Failed to delete notes" });
        }
    }
}
