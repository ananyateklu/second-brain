using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Indexing.GetIndexingStatus;

/// <summary>
/// Handler for GetIndexingStatusQuery
/// </summary>
public class GetIndexingStatusQueryHandler : IRequestHandler<GetIndexingStatusQuery, Result<IndexingJobResponse>>
{
    private readonly IIndexingService _indexingService;
    private readonly ILogger<GetIndexingStatusQueryHandler> _logger;

    public GetIndexingStatusQueryHandler(
        IIndexingService indexingService,
        ILogger<GetIndexingStatusQueryHandler> logger)
    {
        _indexingService = indexingService;
        _logger = logger;
    }

    public async Task<Result<IndexingJobResponse>> Handle(
        GetIndexingStatusQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Getting indexing status. JobId: {JobId}", request.JobId);

        try
        {
            var job = await _indexingService.GetIndexingStatusAsync(request.JobId, cancellationToken);

            if (job == null)
            {
                return Result<IndexingJobResponse>.Failure(Error.NotFound($"Indexing job '{request.JobId}' not found"));
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

            return Result<IndexingJobResponse>.Success(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting indexing status. JobId: {JobId}", request.JobId);
            return Result<IndexingJobResponse>.Failure(Error.Internal("Failed to get indexing status"));
        }
    }
}
