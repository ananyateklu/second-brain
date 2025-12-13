using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Indexing.CancelIndexing;

/// <summary>
/// Handler for CancelIndexingCommand
/// </summary>
public class CancelIndexingCommandHandler : IRequestHandler<CancelIndexingCommand, Result<bool>>
{
    private readonly IIndexingService _indexingService;
    private readonly ILogger<CancelIndexingCommandHandler> _logger;

    public CancelIndexingCommandHandler(
        IIndexingService indexingService,
        ILogger<CancelIndexingCommandHandler> logger)
    {
        _indexingService = indexingService;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(
        CancelIndexingCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogDebug("Cancelling indexing job. JobId: {JobId}", request.JobId);

        try
        {
            var success = await _indexingService.CancelIndexingAsync(request.JobId, cancellationToken);

            if (!success)
            {
                return Result<bool>.Failure(Error.NotFound($"Indexing job '{request.JobId}' not found or already completed"));
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling indexing job. JobId: {JobId}", request.JobId);
            return Result<bool>.Failure(Error.Internal("Failed to cancel indexing job"));
        }
    }
}
