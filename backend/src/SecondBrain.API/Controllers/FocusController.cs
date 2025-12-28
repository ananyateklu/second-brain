using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using SecondBrain.API.Extensions;
using SecondBrain.Application.Commands.Focus.CompleteFocusItem;
using SecondBrain.Application.Commands.Focus.CreateFocusItem;
using SecondBrain.Application.Commands.Focus.DeferFocusItem;
using SecondBrain.Application.Commands.Focus.DeleteFocusItem;
using SecondBrain.Application.Commands.Focus.ReorderFocusItems;
using SecondBrain.Application.Commands.Focus.SetCurrentFocus;
using FocusItemOrder = SecondBrain.Application.Commands.Focus.ReorderFocusItems.FocusItemOrder;
using SecondBrain.Application.Commands.Focus.UpdateFocusItem;
using SecondBrain.Application.DTOs.Focus;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.Focus.GetBacklog;
using SecondBrain.Application.Queries.Focus.GetCompletedItems;
using SecondBrain.Application.Queries.Focus.GetFocusItemById;
using SecondBrain.Application.Queries.Focus.GetTodaysPlan;
using SecondBrain.Application.Services.Focus;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Focus/task management endpoints for productivity dashboard.
/// Supports single current focus and priority levels (P1/P2/P3).
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class FocusController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IFocusAIService _focusAIService;
    private readonly ILogger<FocusController> _logger;

    public FocusController(
        IMediator mediator,
        IFocusAIService focusAIService,
        ILogger<FocusController> logger)
    {
        _mediator = mediator;
        _focusAIService = focusAIService;
        _logger = logger;
    }

    /// <summary>
    /// Get today's plan including current focus and scheduled items.
    /// </summary>
    /// <param name="date">Optional date (defaults to today)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Today's plan with current focus and scheduled items</returns>
    [HttpGet]
    [ProducesResponseType(typeof(TodaysPlanResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<TodaysPlanResponse>> GetTodaysPlan(
        [FromQuery] DateOnly? date = null,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetTodaysPlanQuery(userId, date ?? DateOnly.FromDateTime(DateTime.UtcNow));
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Get backlog items (not scheduled, not completed).
    /// </summary>
    /// <param name="priority">Optional priority filter (1=P1, 2=P2, 3=P3)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of backlog items</returns>
    [HttpGet("backlog")]
    [ProducesResponseType(typeof(BacklogResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<BacklogResponse>> GetBacklog(
        [FromQuery] int? priority = null,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetBacklogQuery(userId, priority);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Get a specific focus item by ID.
    /// </summary>
    /// <param name="id">Focus item ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Focus item details</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(FocusItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FocusItemResponse>> GetById(
        string id,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetFocusItemByIdQuery(id, userId);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Get completed items within a date range.
    /// </summary>
    /// <param name="startDate">Start date</param>
    /// <param name="endDate">End date</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of completed items</returns>
    [HttpGet("completed")]
    [ProducesResponseType(typeof(CompletedItemsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CompletedItemsResponse>> GetCompleted(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var query = new GetCompletedItemsQuery(userId, startDate, endDate);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Create a new focus item.
    /// </summary>
    /// <param name="request">Focus item details</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Created focus item</returns>
    [HttpPost]
    [ProducesResponseType(typeof(FocusItemResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<FocusItemResponse>> Create(
        [FromBody] CreateFocusItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new CreateFocusItemCommand(
            request.Title,
            request.Description,
            request.NoteId,
            request.Priority,
            request.ScheduledDate,
            request.EstimatedMinutes,
            userId);

        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<ActionResult<FocusItemResponse>>(
            item => CreatedAtAction(nameof(GetById), new { id = item.Id }, item),
            error => result.ToActionResult());
    }

    /// <summary>
    /// Update an existing focus item.
    /// </summary>
    /// <param name="id">Focus item ID</param>
    /// <param name="request">Updated details</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated focus item</returns>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(FocusItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FocusItemResponse>> Update(
        string id,
        [FromBody] UpdateFocusItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new UpdateFocusItemCommand(
            id,
            request.Title,
            request.Description,
            request.Priority,
            request.ScheduledDate,
            request.EstimatedMinutes,
            userId,
            request.UpdateDescription,
            request.UpdateScheduledDate,
            request.UpdateEstimatedMinutes,
            request.IsCurrentFocus,
            request.Status);

        var result = await _mediator.Send(command, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Set an item as the current focus.
    /// </summary>
    /// <param name="id">Focus item ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated focus item</returns>
    [HttpPost("{id}/set-current")]
    [ProducesResponseType(typeof(FocusItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FocusItemResponse>> SetCurrentFocus(
        string id,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new SetCurrentFocusCommand(id, userId);
        var result = await _mediator.Send(command, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Mark an item as completed.
    /// </summary>
    /// <param name="id">Focus item ID</param>
    /// <param name="actualMinutes">Optional actual time spent in minutes</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated focus item</returns>
    [HttpPost("{id}/complete")]
    [ProducesResponseType(typeof(FocusItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FocusItemResponse>> Complete(
        string id,
        [FromQuery] int? actualMinutes = null,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new CompleteFocusItemCommand(id, actualMinutes, userId);
        var result = await _mediator.Send(command, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Defer an item to another date.
    /// </summary>
    /// <param name="id">Focus item ID</param>
    /// <param name="request">Defer details</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated focus item</returns>
    [HttpPost("{id}/defer")]
    [ProducesResponseType(typeof(FocusItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FocusItemResponse>> Defer(
        string id,
        [FromBody] DeferFocusItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new DeferFocusItemCommand(id, request.DeferToDate, userId);
        var result = await _mediator.Send(command, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Reorder focus items.
    /// </summary>
    /// <param name="request">Reorder details</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Success</returns>
    [HttpPut("reorder")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> Reorder(
        [FromBody] ReorderFocusItemsRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var items = request.Items.Select(i => new FocusItemOrder(i.Id, i.SortOrder));
        var command = new ReorderFocusItemsCommand(items, userId);
        var result = await _mediator.Send(command, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Delete a focus item.
    /// </summary>
    /// <param name="id">Focus item ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Success</returns>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(
        string id,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        var command = new DeleteFocusItemCommand(id, userId);
        var result = await _mediator.Send(command, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Create a focus item from an existing note.
    /// </summary>
    /// <param name="noteId">Note ID</param>
    /// <param name="request">Optional additional details</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Created focus item</returns>
    [HttpPost("from-note/{noteId}")]
    [ProducesResponseType(typeof(FocusItemResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FocusItemResponse>> CreateFromNote(
        string noteId,
        [FromBody] CreateFocusFromNoteRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        // The title will be set from the note in the command handler
        var command = new CreateFocusItemCommand(
            request?.Title ?? string.Empty, // Will be populated from note if empty
            request?.Description,
            noteId,
            request?.Priority ?? 2,
            request?.ScheduledDate,
            request?.EstimatedMinutes,
            userId);

        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<ActionResult<FocusItemResponse>>(
            item => CreatedAtAction(nameof(GetById), new { id = item.Id }, item),
            error => result.ToActionResult());
    }

    // ============================================
    // AI Endpoints
    // ============================================

    /// <summary>
    /// Get AI-powered focus suggestions based on user's notes.
    /// </summary>
    /// <param name="currentFocusTitle">Optional current focus title for context</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of suggested focus items</returns>
    [HttpPost("ai/suggest")]
    [ProducesResponseType(typeof(FocusSuggestionsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<FocusSuggestionsResponse>> GetAISuggestions(
        [FromQuery] string? currentFocusTitle = null,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        _logger.LogInformation("Getting AI suggestions for user {UserId}", userId);

        var response = await _focusAIService.GetSuggestionsAsync(
            userId,
            currentFocusTitle,
            cancellationToken);

        return Ok(response);
    }

    /// <summary>
    /// Get AI-generated progress summary for completed items.
    /// </summary>
    /// <param name="period">Time period: "today", "week", or "month"</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Progress summary with stats and AI insights</returns>
    [HttpGet("ai/summary")]
    [ProducesResponseType(typeof(ProgressSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProgressSummaryResponse>> GetProgressSummary(
        [FromQuery] string period = "today",
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        _logger.LogInformation("Getting progress summary for user {UserId}, period {Period}", userId, period);

        var response = await _focusAIService.GetProgressSummaryAsync(
            userId,
            period,
            cancellationToken);

        return Ok(response);
    }

    // ============================================
    // Persisted Suggestions Endpoints
    // ============================================

    /// <summary>
    /// Get persisted AI suggestions for the user.
    /// </summary>
    /// <param name="includeAccepted">Whether to include already accepted suggestions</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of persisted suggestions</returns>
    [HttpGet("ai/suggestions")]
    [ProducesResponseType(typeof(List<PersistedFocusSuggestionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<PersistedFocusSuggestionResponse>>> GetPersistedSuggestions(
        [FromQuery] bool includeAccepted = false,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        _logger.LogInformation("Getting persisted suggestions for user {UserId}, includeAccepted: {IncludeAccepted}",
            userId, includeAccepted);

        var suggestions = await _focusAIService.GetPersistedSuggestionsAsync(
            userId,
            includeAccepted,
            cancellationToken);

        return Ok(suggestions);
    }

    /// <summary>
    /// Generate AI suggestions, deduplicate against existing, and persist new ones.
    /// Uses vector similarity to detect duplicates.
    /// </summary>
    /// <param name="request">Optional request with current focus context</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>All suggestions with stats about what was added</returns>
    [HttpPost("ai/suggestions/generate")]
    [ProducesResponseType(typeof(GenerateSuggestionsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<GenerateSuggestionsResponse>> GenerateSuggestions(
        [FromBody] GenerateSuggestionsRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        _logger.LogInformation("Generating suggestions for user {UserId}, currentFocus: {CurrentFocus}",
            userId, request?.CurrentFocusTitle);

        var response = await _focusAIService.GenerateAndPersistSuggestionsAsync(
            userId,
            request?.CurrentFocusTitle,
            cancellationToken);

        return Ok(response);
    }

    /// <summary>
    /// Delete a persisted suggestion.
    /// </summary>
    /// <param name="id">Suggestion ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Success</returns>
    [HttpDelete("ai/suggestions/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteSuggestion(
        string id,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        _logger.LogInformation("Deleting suggestion {SuggestionId} for user {UserId}", id, userId);

        var deleted = await _focusAIService.DeleteSuggestionAsync(id, userId, cancellationToken);

        if (!deleted)
        {
            return NotFound(new { error = "Suggestion not found" });
        }

        return NoContent();
    }

    /// <summary>
    /// Mark a suggestion as accepted (when converted to FocusItem).
    /// </summary>
    /// <param name="id">Suggestion ID</param>
    /// <param name="request">Request containing the created FocusItem ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated suggestion</returns>
    [HttpPost("ai/suggestions/{id}/accept")]
    [ProducesResponseType(typeof(PersistedFocusSuggestionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PersistedFocusSuggestionResponse>> AcceptSuggestion(
        string id,
        [FromBody] AcceptSuggestionRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        _logger.LogInformation("Accepting suggestion {SuggestionId} with FocusItem {FocusItemId} for user {UserId}",
            id, request.FocusItemId, userId);

        var result = await _focusAIService.AcceptSuggestionAsync(
            id,
            request.FocusItemId,
            userId,
            cancellationToken);

        if (result == null)
        {
            return NotFound(new { error = "Suggestion not found" });
        }

        return Ok(result);
    }
}
