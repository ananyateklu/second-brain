using System.Text.Json;
using Asp.Versioning;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using SecondBrain.API.Extensions;
using SecondBrain.Application.Commands.Indexing.CancelIndexing;
using SecondBrain.Application.Commands.Indexing.DeleteIndexedNotes;
using SecondBrain.Application.Commands.Indexing.ReindexNote;
using SecondBrain.Application.Commands.Indexing.StartIndexing;
using SecondBrain.Application.DTOs.Events;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Queries.Indexing.GetEmbeddingProviders;
using SecondBrain.Application.Queries.Indexing.GetIndexingStatus;
using SecondBrain.Application.Queries.Indexing.GetIndexStats;
using SecondBrain.Application.Services.RAG;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Request for streaming indexing endpoint
/// </summary>
public record StartIndexingStreamRequest(
    string VectorStoreProvider,
    string EmbeddingProvider,
    string EmbeddingModel,
    int? Dimensions = null
);

[ApiController]
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class IndexingController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IIndexingService _indexingService;
    private readonly ILogger<IndexingController> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public IndexingController(
        IMediator mediator,
        IIndexingService indexingService,
        ILogger<IndexingController> logger)
    {
        _mediator = mediator;
        _indexingService = indexingService;
        _logger = logger;
    }

    /// <summary>
    /// Start indexing all notes for a user
    /// </summary>
    [HttpPost("start")]
    [ProducesResponseType(typeof(IndexingJobResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IndexingJobResponse>> StartIndexing(
        [FromQuery] string userId = "default-user",
        [FromQuery] string? embeddingProvider = null,
        [FromQuery] string? vectorStoreProvider = null,
        [FromQuery] string? embeddingModel = null,
        [FromQuery] int? customDimensions = null,
        CancellationToken cancellationToken = default)
    {
        var command = new StartIndexingCommand(userId, embeddingProvider, vectorStoreProvider, embeddingModel, customDimensions);
        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<ActionResult<IndexingJobResponse>>(
            onSuccess: job => Ok(job),
            onFailure: error => error.Code switch
            {
                "Validation" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Stream indexing progress via Server-Sent Events for real-time UI updates
    /// </summary>
    [HttpPost("start/stream")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task StreamIndexingAsync(
        [FromBody] StartIndexingStreamRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            await Response.WriteAsync("{\"error\":\"Not authenticated\"}");
            return;
        }

        if (string.IsNullOrWhiteSpace(request.VectorStoreProvider) ||
            string.IsNullOrWhiteSpace(request.EmbeddingProvider) ||
            string.IsNullOrWhiteSpace(request.EmbeddingModel))
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsync("{\"error\":\"VectorStoreProvider, EmbeddingProvider, and EmbeddingModel are required\"}");
            return;
        }

        // Set SSE headers
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        Response.Headers.Append("X-Accel-Buffering", "no");

        _logger.LogInformation(
            "Starting streaming indexing. UserId: {UserId}, VectorStore: {VectorStore}, Provider: {Provider}, Model: {Model}",
            userId, request.VectorStoreProvider, request.EmbeddingProvider, request.EmbeddingModel);

        try
        {
            await foreach (var evt in _indexingService.StreamIndexingAsync(
                userId,
                request.VectorStoreProvider,
                request.EmbeddingProvider,
                request.EmbeddingModel,
                request.Dimensions,
                cancellationToken))
            {
                var eventType = evt switch
                {
                    IndexingStartEvent => "start",
                    IndexingProgressEvent => "progress",
                    IndexingStatsEvent => "stats",
                    IndexingCompleteEvent => "complete",
                    IndexingErrorEvent => "error",
                    _ => "unknown"
                };

                var json = JsonSerializer.Serialize(evt, JsonOptions);
                await Response.WriteAsync($"event: {eventType}\ndata: {json}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Streaming indexing cancelled by client. UserId: {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during streaming indexing. UserId: {UserId}", userId);
            var errorJson = JsonSerializer.Serialize(new IndexingErrorEvent("", "StreamError", ex.Message), JsonOptions);
            await Response.WriteAsync($"event: error\ndata: {errorJson}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Get status of an indexing job
    /// </summary>
    [HttpGet("status/{jobId}")]
    [OutputCache(Duration = 5)] // Short cache for job status
    [ProducesResponseType(typeof(IndexingJobResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IndexingJobResponse>> GetIndexingStatus(
        string jobId,
        CancellationToken cancellationToken = default)
    {
        var query = new GetIndexingStatusQuery(jobId);
        var result = await _mediator.Send(query, cancellationToken);

        return result.Match<ActionResult<IndexingJobResponse>>(
            onSuccess: job => Ok(job),
            onFailure: error => error.Code switch
            {
                "NotFound" => NotFound(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Get index statistics for a user from both PostgreSQL and Pinecone
    /// </summary>
    [HttpGet("stats")]
    [OutputCache(PolicyName = "IndexingStats")]
    [ProducesResponseType(typeof(IndexStatsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<IndexStatsResponse>> GetIndexStats(
        [FromQuery] string userId = "default-user",
        CancellationToken cancellationToken = default)
    {
        var query = new GetIndexStatsQuery(userId);
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }

    /// <summary>
    /// Cancel an active indexing job
    /// </summary>
    [HttpPost("cancel/{jobId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> CancelIndexing(
        string jobId,
        CancellationToken cancellationToken = default)
    {
        var command = new CancelIndexingCommand(jobId);
        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<ActionResult>(
            onSuccess: _ => Ok(new { message = "Indexing job cancelled successfully" }),
            onFailure: error => error.Code switch
            {
                "NotFound" => NotFound(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Reindex a specific note
    /// </summary>
    [HttpPost("reindex/{noteId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> ReindexNote(
        string noteId,
        CancellationToken cancellationToken = default)
    {
        var command = new ReindexNoteCommand(noteId);
        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<ActionResult>(
            onSuccess: _ => Ok(new { message = "Note reindexed successfully" }),
            onFailure: error => error.Code switch
            {
                "NotFound" => NotFound(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Delete all indexed notes for a user from a specific vector store
    /// </summary>
    [HttpDelete("notes")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> DeleteIndexedNotes(
        [FromQuery] string? vectorStoreProvider = null,
        CancellationToken cancellationToken = default)
    {
        var userId = HttpContext.Items["UserId"]?.ToString();

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        if (string.IsNullOrEmpty(vectorStoreProvider))
        {
            return BadRequest(new { error = "vectorStoreProvider is required" });
        }

        var command = new DeleteIndexedNotesCommand(userId, vectorStoreProvider);
        var result = await _mediator.Send(command, cancellationToken);

        return result.Match<ActionResult>(
            onSuccess: _ => Ok(new { message = $"Successfully deleted indexed notes from {vectorStoreProvider}" }),
            onFailure: error => error.Code switch
            {
                "Validation" => BadRequest(new { error = error.Message }),
                _ => StatusCode(500, new { error = error.Message })
            }
        );
    }

    /// <summary>
    /// Get all available embedding providers and their models.
    /// Models are fetched dynamically from each provider's API when possible.
    /// </summary>
    [HttpGet("embedding-providers")]
    [OutputCache(PolicyName = "AIHealth")]
    [ProducesResponseType(typeof(List<EmbeddingProviderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<EmbeddingProviderResponse>>> GetEmbeddingProviders(
        CancellationToken cancellationToken = default)
    {
        var query = new GetEmbeddingProvidersQuery();
        var result = await _mediator.Send(query, cancellationToken);

        return result.ToActionResult();
    }
}
