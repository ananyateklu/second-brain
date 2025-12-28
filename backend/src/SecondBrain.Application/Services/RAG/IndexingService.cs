using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SecondBrain.Application.Configuration;
using SecondBrain.Application.Services.Embeddings;
using SecondBrain.Application.Services.VectorStore;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;
using SecondBrain.Core.Interfaces;
using SecondBrain.Core.Models;

namespace SecondBrain.Application.Services.RAG;

public class IndexingService : IIndexingService
{
    private readonly INoteRepository _noteRepository;
    private readonly IIndexingJobRepository _indexingJobRepository;
    private readonly IEmbeddingProviderFactory _embeddingProviderFactory;
    private readonly IVectorStore _vectorStore;
    private readonly IChunkingService _chunkingService;
    private readonly EmbeddingProvidersSettings _settings;
    private readonly ILogger<IndexingService> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public IndexingService(
        INoteRepository noteRepository,
        IIndexingJobRepository indexingJobRepository,
        IEmbeddingProviderFactory embeddingProviderFactory,
        IVectorStore vectorStore,
        IChunkingService chunkingService,
        IOptions<EmbeddingProvidersSettings> settings,
        ILogger<IndexingService> logger,
        IServiceScopeFactory serviceScopeFactory)
    {
        _noteRepository = noteRepository;
        _indexingJobRepository = indexingJobRepository;
        _embeddingProviderFactory = embeddingProviderFactory;
        _vectorStore = vectorStore;
        _chunkingService = chunkingService;
        _settings = settings.Value;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
    }

    /// <summary>
    /// Pinecone requires exactly 1536 dimensions. This constant is used to validate embedding providers.
    /// </summary>
    private const int PineconeDimensions = 1536;

    public async Task<IndexingJob> StartIndexingAsync(
        string userId,
        string? embeddingProvider = null,
        string? vectorStoreProvider = null,
        string? embeddingModel = null,
        int? customDimensions = null,
        CancellationToken cancellationToken = default)
    {
        var provider = embeddingProvider ?? _settings.DefaultProvider;

        _logger.LogInformation("Starting indexing job request. UserId: {UserId}, EmbeddingProvider: {Provider}, Model: {Model}, VectorStore: {Store}, CustomDims: {CustomDims}",
            userId, provider, embeddingModel ?? "default", vectorStoreProvider ?? "Default", customDimensions?.ToString() ?? "default");

        // Validate embedding dimensions for Pinecone
        var embeddingProviderInstance = _embeddingProviderFactory.GetProvider(provider);

        // Get dimensions for the selected model (or default model if not specified)
        int providerDimensions;
        string actualModel;

        if (!string.IsNullOrEmpty(embeddingModel))
        {
            // Find the model in available models (fetch dynamically from provider)
            var availableModels = (await embeddingProviderInstance.GetAvailableModelsAsync(cancellationToken)).ToList();
            var selectedModel = availableModels.FirstOrDefault(m =>
                m.ModelId.Equals(embeddingModel, StringComparison.OrdinalIgnoreCase));

            if (selectedModel == null)
            {
                throw new ArgumentException(
                    $"Model '{embeddingModel}' is not available for provider '{provider}'. " +
                    $"Available models: {string.Join(", ", availableModels.Select(m => m.ModelId))}");
            }

            providerDimensions = selectedModel.Dimensions;
            actualModel = selectedModel.ModelId;
        }
        else
        {
            providerDimensions = embeddingProviderInstance.Dimensions;
            actualModel = embeddingProviderInstance.ModelName;
        }

        // If customDimensions is specified, use that for validation (for models that support it like Cohere embed-v4.0)
        var effectiveDimensions = customDimensions ?? providerDimensions;

        if ((vectorStoreProvider == "Pinecone" || vectorStoreProvider == "Both") && effectiveDimensions != PineconeDimensions)
        {
            var errorMessage = $"Pinecone requires {PineconeDimensions}-dimension embeddings. " +
                $"{provider}/{actualModel} produces {effectiveDimensions} dimensions. " +
                $"Use PostgreSQL for this embedding provider/model, or use a model with 1536 dimensions for Pinecone.";

            _logger.LogWarning("Dimension mismatch for Pinecone. Provider: {Provider}, Model: {Model}, Dimensions: {Dimensions}",
                provider, actualModel, effectiveDimensions);

            throw new InvalidOperationException(errorMessage);
        }

        _logger.LogInformation("Embedding provider validated. Provider: {Provider}, Model: {Model}, Dimensions: {Dimensions}, CustomDims: {CustomDims}",
            provider, actualModel, providerDimensions, customDimensions?.ToString() ?? "none");

        // Fetch notes with images for the specific user (multi-tenant)
        // Images are needed for multi-modal RAG (image descriptions are embedded)
        var notes = (await _noteRepository.GetByUserIdWithImagesAsync(userId)).ToList();

        var totalImages = notes.Sum(n => n.Images?.Count ?? 0);
        _logger.LogInformation("Found notes for indexing. NoteCount: {Count}, TotalImages: {ImageCount}", notes.Count, totalImages);

        // Create indexing job with totalNotes already set
        var job = new IndexingJob
        {
            Id = UuidV7.NewId(),
            UserId = userId,
            Status = IndexingStatus.Pending,
            EmbeddingProvider = provider,
            EmbeddingModel = actualModel,
            TotalNotes = notes.Count,
            CreatedAt = DateTime.UtcNow
        };

        job = await _indexingJobRepository.CreateAsync(job);

        // Start indexing in background with a new DI scope
        // Note: We create a new scope because the HTTP request's scope (and DbContext) will be disposed
        // after the request completes, but this background task needs to continue running.
        _ = Task.Run(async () =>
        {
            try
            {
                await ProcessIndexingJobAsync(job.Id, vectorStoreProvider, customDimensions);
            }
            catch (Exception ex)
            {
                // Log any unhandled exceptions from the background task
                _logger.LogError(ex, "Unhandled exception in background indexing task. JobId: {JobId}", job.Id);
            }
        });

        return job;
    }

    private async Task ProcessIndexingJobAsync(string jobId, string? vectorStoreProvider, int? customDimensions = null)
    {
        // Create a new scope for the background task to get fresh scoped services (DbContext, repositories)
        using var scope = _serviceScopeFactory.CreateScope();
        var indexingJobRepository = scope.ServiceProvider.GetRequiredService<IIndexingJobRepository>();
        var noteRepository = scope.ServiceProvider.GetRequiredService<INoteRepository>();
        var embeddingProviderFactory = scope.ServiceProvider.GetRequiredService<IEmbeddingProviderFactory>();
        var vectorStore = scope.ServiceProvider.GetRequiredService<IVectorStore>();

        IndexingJob? job = null;

        try
        {
            job = await indexingJobRepository.GetByIdAsync(jobId);
            if (job == null)
            {
                _logger.LogError("Indexing job not found. JobId: {JobId}", jobId);
                return;
            }

            // Configure vector store override if provided
            if (!string.IsNullOrEmpty(vectorStoreProvider) && vectorStore is CompositeVectorStore compositeStore)
            {
                compositeStore.SetProviderOverride(vectorStoreProvider);
                _logger.LogInformation("Overriding vector store provider to: {Provider}", vectorStoreProvider);
            }

            // Update job status to running
            job.Status = IndexingStatus.Running;
            job.StartedAt = DateTime.UtcNow;
            await indexingJobRepository.UpdateAsync(jobId, job);

            // Get embedding provider
            var embeddingProvider = embeddingProviderFactory.GetProvider(job.EmbeddingProvider);
            if (!embeddingProvider.IsEnabled)
            {
                throw new InvalidOperationException($"Embedding provider '{job.EmbeddingProvider}' is not enabled");
            }

            // Fetch notes with images for the specific user (multi-tenant)
            // Images are needed for multi-modal RAG (image descriptions are embedded)
            var allNotes = (await noteRepository.GetByUserIdWithImagesAsync(job.UserId)).ToList();
            var currentNoteIds = allNotes.Select(n => n.Id).ToHashSet();

            var totalImages = allNotes.Sum(n => n.Images?.Count ?? 0);
            _logger.LogInformation("Found {TotalNotes} total notes with {TotalImages} images. Checking for deleted notes and changes...", allNotes.Count, totalImages);

            // Cleanup: Remove embeddings for notes that no longer exist in the database
            var indexedNoteIds = await vectorStore.GetIndexedNoteIdsAsync(job.UserId, CancellationToken.None);
            var deletedNoteIds = indexedNoteIds.Except(currentNoteIds).ToList();

            if (deletedNoteIds.Any())
            {
                _logger.LogInformation("Found {Count} deleted notes to remove from index", deletedNoteIds.Count);
                foreach (var deletedNoteId in deletedNoteIds)
                {
                    try
                    {
                        await vectorStore.DeleteByNoteIdAsync(deletedNoteId, CancellationToken.None);
                        _logger.LogDebug("Removed embeddings for deleted note. NoteId: {NoteId}", deletedNoteId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to remove embeddings for deleted note. NoteId: {NoteId}", deletedNoteId);
                        job.Errors.Add($"Cleanup failed for deleted note {deletedNoteId}: {ex.Message}");
                    }
                }
            }

            // First pass: identify notes that need re-indexing (incremental indexing)
            var notesToIndex = new List<Note>();
            var skippedCount = 0;

            foreach (var note in allNotes)
            {
                var existingUpdatedAt = await vectorStore.GetNoteUpdatedAtAsync(note.Id, CancellationToken.None);
                if (existingUpdatedAt.HasValue && existingUpdatedAt.Value >= note.UpdatedAt)
                {
                    _logger.LogDebug("Will skip unchanged note. NoteId: {NoteId}, UpdatedAt: {UpdatedAt}", note.Id, note.UpdatedAt);
                    skippedCount++;
                }
                else
                {
                    notesToIndex.Add(note);
                }
            }

            // Update job with accurate count of notes to index and stats
            job.TotalNotes = notesToIndex.Count;
            job.SkippedNotes = skippedCount;
            job.DeletedNotes = deletedNoteIds.Count;
            await indexingJobRepository.UpdateAsync(jobId, job);

            _logger.LogInformation("Starting indexing. JobId: {JobId}, NotesToIndex: {NotesToIndex}, Skipped: {Skipped}, Deleted: {Deleted}",
                jobId, notesToIndex.Count, skippedCount, deletedNoteIds.Count);

            // Second pass: index only the notes that need it
            foreach (var note in notesToIndex)
            {
                // Check if job was cancelled externally (e.g., via API)
                var currentJob = await indexingJobRepository.GetByIdAsync(jobId);
                if (currentJob?.Status == IndexingStatus.Cancelled)
                {
                    _logger.LogInformation("Indexing job was cancelled. JobId: {JobId}", jobId);
                    break;
                }

                try
                {
                    await IndexNoteAsync(note, embeddingProvider, vectorStore, CancellationToken.None, customDimensions, job.EmbeddingModel);
                    job.ProcessedNotes++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error indexing note. NoteId: {NoteId}", note.Id);
                    job.Errors.Add($"Note {note.Id}: {ex.Message}");
                }

                // Update progress after each note for real-time UI updates
                await indexingJobRepository.UpdateAsync(jobId, job);
            }

            _logger.LogInformation("Indexing stats. JobId: {JobId}, Indexed: {Indexed}, Skipped: {Skipped}",
                jobId, job.ProcessedNotes, skippedCount);

            // Mark job as completed
            job.Status = job.Errors.Any() ? IndexingStatus.PartiallyCompleted : IndexingStatus.Completed;
            job.CompletedAt = DateTime.UtcNow;
            await indexingJobRepository.UpdateAsync(jobId, job);

            _logger.LogInformation("Indexing completed. JobId: {JobId}, ProcessedNotes: {ProcessedNotes}, Errors: {ErrorCount}",
                jobId, job.ProcessedNotes, job.Errors.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in indexing job. JobId: {JobId}", jobId);

            if (job != null)
            {
                job.Status = IndexingStatus.Failed;
                job.CompletedAt = DateTime.UtcNow;
                job.Errors.Add($"Fatal error: {ex.Message}");
                await indexingJobRepository.UpdateAsync(jobId, job);
            }
        }
    }

    private async Task IndexNoteAsync(
        Note note,
        IEmbeddingProvider embeddingProvider,
        IVectorStore vectorStore,
        CancellationToken cancellationToken,
        int? customDimensions = null,
        string? modelOverride = null)
    {
        // Determine effective model: explicit override > provider default
        var effectiveModel = !string.IsNullOrEmpty(modelOverride) ? modelOverride : embeddingProvider.ModelName;

        _logger.LogInformation(
            "Starting note indexing. NoteId: {NoteId}, UserId: {UserId}, Title: {Title}, Provider: {Provider}, Model: {Model}, CustomDims: {CustomDims}",
            note.Id, note.UserId, note.Title, embeddingProvider.ProviderName, effectiveModel, customDimensions?.ToString() ?? "default");

        // Delete existing embeddings for this note
        await vectorStore.DeleteByNoteIdAsync(note.Id, cancellationToken);

        // Chunk the note
        var chunks = _chunkingService.ChunkNote(note);
        _logger.LogInformation("Generated chunks for note. NoteId: {NoteId}, ChunkCount: {Count}", note.Id, chunks.Count);

        // Generate embeddings for each chunk
        var embeddings = new List<NoteEmbedding>();

        foreach (var chunk in chunks)
        {
            // Pass customDimensions and modelOverride to support runtime configuration
            var embeddingResponse = await embeddingProvider.GenerateEmbeddingAsync(
                chunk.Content, cancellationToken, customDimensions, modelOverride);

            if (!embeddingResponse.Success)
            {
                _logger.LogWarning(
                    "Failed to generate embedding for note chunk. NoteId: {NoteId}, ChunkIndex: {ChunkIndex}, Provider: {Provider}, Model: {Model}, Error: {Error}",
                    note.Id, chunk.ChunkIndex, embeddingProvider.ProviderName, effectiveModel, embeddingResponse.Error);
                continue;
            }

            // Validate embedding dimensions
            var expectedDimensions = GetExpectedDimensions(embeddingProvider.ProviderName);
            if (expectedDimensions.HasValue && embeddingResponse.Embedding.Count != expectedDimensions.Value)
            {
                _logger.LogWarning(
                    "Embedding dimension mismatch. NoteId: {NoteId}, ChunkIndex: {ChunkIndex}, Expected: {Expected}, Actual: {Actual}, Provider: {Provider}",
                    note.Id, chunk.ChunkIndex, expectedDimensions.Value, embeddingResponse.Embedding.Count, embeddingProvider.ProviderName);
            }
            else
            {
                _logger.LogDebug(
                    "Generated embedding for chunk. NoteId: {NoteId}, ChunkIndex: {ChunkIndex}, Dimensions: {Dimensions}, Provider: {Provider}, Model: {Model}",
                    note.Id, chunk.ChunkIndex, embeddingResponse.Embedding.Count, embeddingProvider.ProviderName, effectiveModel);
            }

            // Use model from response if available, otherwise use effective model
            var actualModel = !string.IsNullOrEmpty(embeddingResponse.Model) ? embeddingResponse.Model : effectiveModel;

            var noteEmbedding = new NoteEmbedding
            {
                Id = $"{note.Id}_chunk_{chunk.ChunkIndex}",
                NoteId = note.Id,
                UserId = note.UserId,
                ChunkIndex = chunk.ChunkIndex,
                Content = chunk.Content,
                Embedding = new Pgvector.Vector(embeddingResponse.Embedding.Select(d => (float)d).ToArray()),
                EmbeddingDimensions = embeddingResponse.Embedding.Count, // Track embedding dimensions
                EmbeddingProvider = embeddingProvider.ProviderName,
                EmbeddingModel = actualModel, // Store actual model used (from response or override)
                CreatedAt = DateTime.UtcNow,
                NoteUpdatedAt = note.UpdatedAt, // Track note modification for incremental indexing
                NoteTitle = note.Title,
                NoteTags = note.Tags,
                NoteSummary = note.Summary // Store AI-generated summary for improved RAG context
            };

            embeddings.Add(noteEmbedding);
        }

        // Store embeddings in vector store
        if (embeddings.Any())
        {
            await vectorStore.UpsertBatchAsync(embeddings, cancellationToken);
            _logger.LogInformation(
                "Indexed note successfully. NoteId: {NoteId}, UserId: {UserId}, ChunkCount: {ChunkCount}, Provider: {Provider}, Model: {Model}",
                note.Id, note.UserId, embeddings.Count, embeddingProvider.ProviderName, effectiveModel);
        }
        else
        {
            _logger.LogWarning(
                "No embeddings generated for note. NoteId: {NoteId}, ChunkCount: {ChunkCount}",
                note.Id, chunks.Count);
        }
    }

    /// <summary>
    /// Gets the expected dimensions from the configured embedding provider settings.
    /// Returns null if provider is unknown (dimensions will be determined dynamically).
    /// </summary>
    private int? GetExpectedDimensions(string providerName)
    {
        return providerName.ToUpperInvariant() switch
        {
            "OPENAI" => _settings.OpenAI.Dimensions,
            "GEMINI" => _settings.Gemini.Dimensions,
            "OLLAMA" => _settings.Ollama.Dimensions,
            _ => null // Unknown provider - dimensions will be determined dynamically
        };
    }

    public async Task<IndexingJob?> GetIndexingStatusAsync(
        string jobId,
        CancellationToken cancellationToken = default)
    {
        return await _indexingJobRepository.GetByIdAsync(jobId);
    }

    public async Task<IndexStats> GetIndexStatsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        return await _vectorStore.GetIndexStatsAsync(userId, cancellationToken);
    }

    public async Task<bool> ReindexNoteAsync(
        string noteId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var note = await _noteRepository.GetByIdAsync(noteId);
            if (note == null)
            {
                _logger.LogWarning("Note not found for reindexing. NoteId: {NoteId}", noteId);
                return false;
            }

            var embeddingProvider = _embeddingProviderFactory.GetDefaultProvider();
            await IndexNoteAsync(note, embeddingProvider, _vectorStore, cancellationToken);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reindexing note. NoteId: {NoteId}", noteId);
            return false;
        }
    }

    public async Task<bool> CancelIndexingAsync(
        string jobId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var job = await _indexingJobRepository.GetByIdAsync(jobId);

            if (job == null)
            {
                _logger.LogWarning("Indexing job not found for cancellation. JobId: {JobId}", jobId);
                return false;
            }

            // Only cancel jobs that are pending or running
            if (job.Status != IndexingStatus.Pending && job.Status != IndexingStatus.Running)
            {
                _logger.LogInformation(
                    "Cannot cancel indexing job - already in terminal state. JobId: {JobId}, Status: {Status}",
                    jobId, job.Status);
                return false;
            }

            // Update job status to cancelled
            job.Status = IndexingStatus.Cancelled;
            job.CompletedAt = DateTime.UtcNow;
            job.Errors.Add("Job was cancelled by user");

            await _indexingJobRepository.UpdateAsync(jobId, job);

            _logger.LogInformation(
                "Indexing job cancelled successfully. JobId: {JobId}, ProcessedNotes: {ProcessedNotes}, TotalNotes: {TotalNotes}",
                jobId, job.ProcessedNotes, job.TotalNotes);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling indexing job. JobId: {JobId}", jobId);
            return false;
        }
    }
}
