using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Embeddings;
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
[ApiVersion("1.0")]
[Route("api/[controller]")]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
public class IndexingController : ControllerBase
{
    private readonly IIndexingService _indexingService;
    private readonly IVectorStore _postgresStore;
    private readonly IVectorStore _pineconeStore;
    private readonly INoteRepository _noteRepository;
    private readonly IEmbeddingProviderFactory _embeddingProviderFactory;
    private readonly ILogger<IndexingController> _logger;

    public IndexingController(
        IIndexingService indexingService,
        [FromKeyedServices(VectorStoreKeys.PostgreSQL)] IVectorStore postgresStore,
        [FromKeyedServices(VectorStoreKeys.Pinecone)] IVectorStore pineconeStore,
        INoteRepository noteRepository,
        IEmbeddingProviderFactory embeddingProviderFactory,
        ILogger<IndexingController> logger)
    {
        _indexingService = indexingService;
        _postgresStore = postgresStore;
        _pineconeStore = pineconeStore;
        _noteRepository = noteRepository;
        _embeddingProviderFactory = embeddingProviderFactory;
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
        CancellationToken cancellationToken = default)
    {
        try
        {
            var job = await _indexingService.StartIndexingAsync(userId, embeddingProvider, vectorStoreProvider, embeddingModel, cancellationToken);

            var response = new IndexingJobResponse
            {
                Id = job.Id,
                Status = job.Status,
                TotalNotes = job.TotalNotes,
                ProcessedNotes = job.ProcessedNotes,
                SkippedNotes = job.SkippedNotes,
                DeletedNotes = job.DeletedNotes,
                TotalChunks = job.TotalChunks,
                ProcessedChunks = job.ProcessedChunks,
                Errors = job.Errors,
                EmbeddingProvider = job.EmbeddingProvider,
                EmbeddingModel = job.EmbeddingModel,
                StartedAt = job.StartedAt,
                CompletedAt = job.CompletedAt,
                CreatedAt = job.CreatedAt
            };

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            // Dimension mismatch or invalid model
            _logger.LogWarning(ex, "Invalid indexing request. UserId: {UserId}", userId);
            return BadRequest(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            // Invalid model name
            _logger.LogWarning(ex, "Invalid model specified. UserId: {UserId}", userId);
            return BadRequest(new { error = ex.Message });
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
    [OutputCache(Duration = 5)] // Short cache for job status
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
                SkippedNotes = job.SkippedNotes,
                DeletedNotes = job.DeletedNotes,
                TotalChunks = job.TotalChunks,
                ProcessedChunks = job.ProcessedChunks,
                Errors = job.Errors,
                EmbeddingProvider = job.EmbeddingProvider,
                EmbeddingModel = job.EmbeddingModel,
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
    [OutputCache(PolicyName = "IndexingStats")]
    [ProducesResponseType(typeof(IndexStatsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<IndexStatsResponse>> GetIndexStats(
        [FromQuery] string userId = "default-user",
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = new IndexStatsResponse();

            // Get all notes for the user to calculate not indexed and stale counts
            var allNotes = (await _noteRepository.GetByUserIdAsync(userId)).ToList();
            var totalNotesCount = allNotes.Count;
            var notesDict = allNotes.ToDictionary(n => n.Id, n => n.UpdatedAt);

            // Get PostgreSQL stats
            try
            {
                var postgresStats = await _postgresStore.GetIndexStatsAsync(userId, cancellationToken);
                var postgresIndexedWithTimestamps = await _postgresStore.GetIndexedNotesWithTimestampsAsync(userId, cancellationToken);

                // Calculate not indexed count
                var postgresIndexedIds = postgresIndexedWithTimestamps.Keys.ToHashSet();
                var postgresNotIndexedCount = allNotes.Count(n => !postgresIndexedIds.Contains(n.Id));

                // Calculate stale notes count (notes where UpdatedAt > NoteUpdatedAt in embedding)
                var postgresStaleCount = 0;
                foreach (var note in allNotes)
                {
                    if (postgresIndexedWithTimestamps.TryGetValue(note.Id, out var indexedUpdatedAt))
                    {
                        if (indexedUpdatedAt.HasValue && note.UpdatedAt > indexedUpdatedAt.Value)
                        {
                            postgresStaleCount++;
                        }
                    }
                }

                response.PostgreSQL = new IndexStatsData
                {
                    TotalEmbeddings = postgresStats.TotalEmbeddings,
                    UniqueNotes = postgresStats.UniqueNotes,
                    LastIndexedAt = postgresStats.LastIndexedAt,
                    EmbeddingProvider = postgresStats.EmbeddingProvider,
                    VectorStoreProvider = postgresStats.VectorStoreProvider,
                    TotalNotesInSystem = totalNotesCount,
                    NotIndexedCount = postgresNotIndexedCount,
                    StaleNotesCount = postgresStaleCount
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
                var pineconeIndexedWithTimestamps = await _pineconeStore.GetIndexedNotesWithTimestampsAsync(userId, cancellationToken);

                // Calculate not indexed count
                var pineconeIndexedIds = pineconeIndexedWithTimestamps.Keys.ToHashSet();
                var pineconeNotIndexedCount = allNotes.Count(n => !pineconeIndexedIds.Contains(n.Id));

                // Calculate stale notes count (notes where UpdatedAt > NoteUpdatedAt in embedding)
                var pineconeStaleCount = 0;
                foreach (var note in allNotes)
                {
                    if (pineconeIndexedWithTimestamps.TryGetValue(note.Id, out var indexedUpdatedAt))
                    {
                        if (indexedUpdatedAt.HasValue && note.UpdatedAt > indexedUpdatedAt.Value)
                        {
                            pineconeStaleCount++;
                        }
                    }
                }

                response.Pinecone = new IndexStatsData
                {
                    TotalEmbeddings = pineconeStats.TotalEmbeddings,
                    UniqueNotes = pineconeStats.UniqueNotes,
                    LastIndexedAt = pineconeStats.LastIndexedAt,
                    EmbeddingProvider = pineconeStats.EmbeddingProvider,
                    VectorStoreProvider = pineconeStats.VectorStoreProvider,
                    TotalNotesInSystem = totalNotesCount,
                    NotIndexedCount = pineconeNotIndexedCount,
                    StaleNotesCount = pineconeStaleCount
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
        try
        {
            var success = await _indexingService.CancelIndexingAsync(jobId, cancellationToken);

            if (!success)
            {
                return NotFound(new { error = $"Indexing job '{jobId}' not found or already completed" });
            }

            return Ok(new { message = "Indexing job cancelled successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling indexing job. JobId: {JobId}", jobId);
            return StatusCode(500, new { error = "Failed to cancel indexing job" });
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

    /// <summary>
    /// Get all available embedding providers and their models.
    /// Models are fetched dynamically from each provider's API when possible.
    /// </summary>
    [HttpGet("embedding-providers")]
    [OutputCache(PolicyName = "AIHealth")]
    [ProducesResponseType(typeof(IEnumerable<EmbeddingProviderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<EmbeddingProviderResponse>>> GetEmbeddingProviders(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var providers = _embeddingProviderFactory.GetAllProviders();
            var response = new List<EmbeddingProviderResponse>();

            foreach (var provider in providers)
            {
                // Fetch available models asynchronously from each provider
                var models = await provider.GetAvailableModelsAsync(cancellationToken);

                response.Add(new EmbeddingProviderResponse
                {
                    Name = provider.ProviderName,
                    IsEnabled = provider.IsEnabled,
                    CurrentModel = provider.ModelName,
                    CurrentDimensions = provider.Dimensions,
                    AvailableModels = models.Select(m => new EmbeddingModelResponse
                    {
                        ModelId = m.ModelId,
                        DisplayName = m.DisplayName,
                        Dimensions = m.Dimensions,
                        SupportsPinecone = m.SupportsPinecone,
                        Description = m.Description,
                        IsDefault = m.IsDefault
                    }).ToList()
                });
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting embedding providers");
            return StatusCode(500, new { error = "Failed to get embedding providers" });
        }
    }
}
