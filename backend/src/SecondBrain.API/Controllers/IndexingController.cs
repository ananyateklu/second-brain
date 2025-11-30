using Microsoft.AspNetCore.Mvc;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Interfaces;

namespace SecondBrain.API.Controllers;

/// <summary>
/// Service key constants for vector stores
/// </summary>
public static class VectorStoreKeys
{
    public const string PostgreSQL = "PostgreSQL";
    public const string Pinecone = "Pinecone";
}

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class IndexingController : ControllerBase
{
    private readonly IIndexingService _indexingService;
    private readonly IVectorStore _postgresStore;
    private readonly IVectorStore _pineconeStore;
    private readonly ILogger<IndexingController> _logger;

    public IndexingController(
        IIndexingService indexingService,
        [FromKeyedServices(VectorStoreKeys.PostgreSQL)] IVectorStore postgresStore,
        [FromKeyedServices(VectorStoreKeys.Pinecone)] IVectorStore pineconeStore,
        ILogger<IndexingController> logger)
    {
        _indexingService = indexingService;
        _postgresStore = postgresStore;
        _pineconeStore = pineconeStore;
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
        CancellationToken cancellationToken = default)
    {
        try
        {
            var job = await _indexingService.StartIndexingAsync(userId, embeddingProvider, vectorStoreProvider, cancellationToken);

            var response = new IndexingJobResponse
            {
                Id = job.Id,
                Status = job.Status,
                TotalNotes = job.TotalNotes,
                ProcessedNotes = job.ProcessedNotes,
                TotalChunks = job.TotalChunks,
                ProcessedChunks = job.ProcessedChunks,
                Errors = job.Errors,
                EmbeddingProvider = job.EmbeddingProvider,
                StartedAt = job.StartedAt,
                CompletedAt = job.CompletedAt,
                CreatedAt = job.CreatedAt
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting indexing. UserId: {UserId}", userId);
            return StatusCode(500, new { error = "Failed to start indexing" });
        }
    }

    /// <summary>
    /// Get status of an indexing job
    /// </summary>
    [HttpGet("status/{jobId}")]
    [ProducesResponseType(typeof(IndexingJobResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IndexingJobResponse>> GetIndexingStatus(
        string jobId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var job = await _indexingService.GetIndexingStatusAsync(jobId, cancellationToken);

            if (job == null)
            {
                return NotFound(new { error = $"Indexing job '{jobId}' not found" });
            }

            var response = new IndexingJobResponse
            {
                Id = job.Id,
                Status = job.Status,
                TotalNotes = job.TotalNotes,
                ProcessedNotes = job.ProcessedNotes,
                TotalChunks = job.TotalChunks,
                ProcessedChunks = job.ProcessedChunks,
                Errors = job.Errors,
                EmbeddingProvider = job.EmbeddingProvider,
                StartedAt = job.StartedAt,
                CompletedAt = job.CompletedAt,
                CreatedAt = job.CreatedAt
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting indexing status. JobId: {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to get indexing status" });
        }
    }

    /// <summary>
    /// Get index statistics for a user from both PostgreSQL and Pinecone
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(IndexStatsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<IndexStatsResponse>> GetIndexStats(
        [FromQuery] string userId = "default-user",
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = new IndexStatsResponse();

            // Get PostgreSQL stats
            try
            {
                var postgresStats = await _postgresStore.GetIndexStatsAsync(userId, cancellationToken);
                response.PostgreSQL = new IndexStatsData
                {
                    TotalEmbeddings = postgresStats.TotalEmbeddings,
                    UniqueNotes = postgresStats.UniqueNotes,
                    LastIndexedAt = postgresStats.LastIndexedAt,
                    EmbeddingProvider = postgresStats.EmbeddingProvider,
                    VectorStoreProvider = postgresStats.VectorStoreProvider
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error getting PostgreSQL stats. UserId: {UserId}", userId);
                // Continue to try Pinecone even if PostgreSQL fails
            }

            // Get Pinecone stats
            try
            {
                var pineconeStats = await _pineconeStore.GetIndexStatsAsync(userId, cancellationToken);
                response.Pinecone = new IndexStatsData
                {
                    TotalEmbeddings = pineconeStats.TotalEmbeddings,
                    UniqueNotes = pineconeStats.UniqueNotes,
                    LastIndexedAt = pineconeStats.LastIndexedAt,
                    EmbeddingProvider = pineconeStats.EmbeddingProvider,
                    VectorStoreProvider = pineconeStats.VectorStoreProvider
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error getting Pinecone stats. UserId: {UserId}", userId);
                // Continue even if Pinecone fails
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting index stats. UserId: {UserId}", userId);
            return StatusCode(500, new { error = "Failed to get index stats" });
        }
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
        try
        {
            var success = await _indexingService.ReindexNoteAsync(noteId, cancellationToken);

            if (!success)
            {
                return NotFound(new { error = $"Note '{noteId}' not found or failed to reindex" });
            }

            return Ok(new { message = "Note reindexed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reindexing note. NoteId: {NoteId}", noteId);
            return StatusCode(500, new { error = "Failed to reindex note" });
        }
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

        try
        {
            bool success = false;
            string storeName = vectorStoreProvider;

            if (vectorStoreProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
            {
                success = await _postgresStore.DeleteByUserIdAsync(userId, cancellationToken);
            }
            else if (vectorStoreProvider.Equals("Pinecone", StringComparison.OrdinalIgnoreCase))
            {
                success = await _pineconeStore.DeleteByUserIdAsync(userId, cancellationToken);
            }
            else
            {
                return BadRequest(new { error = $"Invalid vectorStoreProvider. Must be 'PostgreSQL' or 'Pinecone'" });
            }

            if (!success)
            {
                _logger.LogWarning("Failed to delete indexed notes. UserId: {UserId}, VectorStoreProvider: {VectorStoreProvider}", 
                    userId, vectorStoreProvider);
                return StatusCode(500, new { error = $"Failed to delete indexed notes from {storeName}" });
            }

            _logger.LogInformation("Successfully deleted indexed notes. UserId: {UserId}, VectorStoreProvider: {VectorStoreProvider}", 
                userId, vectorStoreProvider);
            return Ok(new { message = $"Successfully deleted indexed notes from {storeName}" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting indexed notes. UserId: {UserId}, VectorStoreProvider: {VectorStoreProvider}", 
                userId, vectorStoreProvider);
            return StatusCode(500, new { error = "Failed to delete indexed notes" });
        }
    }
}
