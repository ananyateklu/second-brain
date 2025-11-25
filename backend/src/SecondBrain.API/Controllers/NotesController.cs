using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Exceptions;
using SecondBrain.Application.Mappings;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Notes management endpoints
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class NotesController : ControllerBase
{
    private readonly INoteRepository _noteRepository;
    private readonly ILogger<NotesController> _logger;

    public NotesController(INoteRepository noteRepository, ILogger<NotesController> logger)
    {
        _noteRepository = noteRepository;
        _logger = logger;
    }

    /// <summary>
    /// Get all notes for the authenticated user
    /// </summary>
    /// <returns>List of notes</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<NoteResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<NoteResponse>>> GetAllNotes()
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            var notes = await _noteRepository.GetByUserIdAsync(userId);
            var response = notes.Select(n => n.ToResponse());
            return Ok(response);
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
    /// <returns>Note details</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(NoteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<NoteResponse>> GetNoteById(string id)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            var note = await _noteRepository.GetByIdAsync(id);
            
            if (note is null)
            {
                throw new NotFoundException("Note", id);
            }

            // Verify note belongs to user
            if (note.UserId != userId)
            {
                _logger.LogWarning("User attempted to access note belonging to another user. UserId: {UserId}, NoteId: {NoteId}, NoteUserId: {NoteUserId}", 
                    userId, id, note.UserId);
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
            }

            return Ok(note.ToResponse());
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
    /// <returns>Created note</returns>
    [HttpPost]
    [ProducesResponseType(typeof(NoteResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<NoteResponse>> CreateNote([FromBody] CreateNoteRequest request)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            var note = request.ToEntity(userId);
            var createdNote = await _noteRepository.CreateAsync(note);
            
            var response = createdNote.ToResponse();
            return CreatedAtAction(nameof(GetNoteById), new { id = response.Id }, response);
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
    /// <returns>Updated note</returns>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(NoteResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<NoteResponse>> UpdateNote(string id, [FromBody] UpdateNoteRequest request)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            var existingNote = await _noteRepository.GetByIdAsync(id);
            
            if (existingNote is null)
            {
                throw new NotFoundException("Note", id);
            }

            // Verify note belongs to user
            if (existingNote.UserId != userId)
            {
                _logger.LogWarning("User attempted to update note belonging to another user. UserId: {UserId}, NoteId: {NoteId}, NoteUserId: {NoteUserId}", 
                    userId, id, existingNote.UserId);
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
            }

            existingNote.UpdateFrom(request);
            var updatedNote = await _noteRepository.UpdateAsync(id, existingNote);
            
            if (updatedNote is null)
            {
                throw new NotFoundException("Note", id);
            }

            return Ok(updatedNote.ToResponse());
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
    /// <returns>No content</returns>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeleteNote(string id)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        try
        {
            // First get the note to verify ownership
            var existingNote = await _noteRepository.GetByIdAsync(id);
            
            if (existingNote is null)
            {
                throw new NotFoundException("Note", id);
            }

            // Verify note belongs to user
            if (existingNote.UserId != userId)
            {
                _logger.LogWarning("User attempted to delete note belonging to another user. UserId: {UserId}, NoteId: {NoteId}, NoteUserId: {NoteUserId}", 
                    userId, id, existingNote.UserId);
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access denied" });
            }

            var deleted = await _noteRepository.DeleteAsync(id);
            
            if (!deleted)
            {
                throw new NotFoundException("Note", id);
            }

            return NoContent();
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
}

