using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.API.Extensions;
using SecondBrain.Application.Commands.Notes.BulkDeleteNotes;
using SecondBrain.Application.Commands.Notes.CreateNote;
using SecondBrain.Application.Commands.Notes.DeleteNote;
using SecondBrain.Application.Commands.Notes.UpdateNote;
using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.Notes.GetAllNotes;
using SecondBrain.Application.Queries.Notes.GetNoteById;

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
    private readonly ILogger<NotesController> _logger;

    public NotesController(IMediator mediator, ILogger<NotesController> logger)
    {
        _mediator = mediator;
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

        var query = new GetAllNotesQuery(userId);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
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
            userId);

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
            userId);

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
}
