using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Indexing.StartIndexing;

/// <summary>
/// Handler for StartIndexingCommand
/// </summary>
public class StartIndexingCommandHandler : IRequestHandler<StartIndexingCommand, Result<IndexingJobResponse>>
{
    private readonly IIndexingService _indexingService;
    private readonly ILogger<StartIndexingCommandHandler> _logger;

    public StartIndexingCommandHandler(
        IIndexingService indexingService,
        ILogger<StartIndexingCommandHandler> logger)
    {
        _indexingService = indexingService;
        _logger = logger;
    }

    public async Task<Result<IndexingJobResponse>> Handle(
        StartIndexingCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Starting indexing. UserId: {UserId}", request.UserId);

        try
        {
            var job = await _indexingService.StartIndexingAsync(
                request.UserId,
                request.EmbeddingProvider,
                request.VectorStoreProvider,
                request.EmbeddingModel,
                request.CustomDimensions,
                cancellationToken);

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

            return Result<IndexingJobResponse>.Success(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid indexing request. UserId: {UserId}", request.UserId);
            return Result<IndexingJobResponse>.Failure(Error.Validation(ex.Message));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid model specified. UserId: {UserId}", request.UserId);
            return Result<IndexingJobResponse>.Failure(Error.Validation(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting indexing. UserId: {UserId}", request.UserId);
            return Result<IndexingJobResponse>.Failure(Error.Internal("Failed to start indexing"));
        }
    }
}
