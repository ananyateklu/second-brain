using MediatR;
using Microsoft.Extensions.Logging;
using SecondBrain.Application.Services.RAG;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.RagAnalytics.ClusterQueries;

/// <summary>
/// Handler for ClusterQueriesCommand
/// </summary>
public class ClusterQueriesCommandHandler : IRequestHandler<ClusterQueriesCommand, Result<ClusterQueriesResult>>
{
    private readonly ITopicClusteringService _clusteringService;
    private readonly ILogger<ClusterQueriesCommandHandler> _logger;

    public ClusterQueriesCommandHandler(
        ITopicClusteringService clusteringService,
        ILogger<ClusterQueriesCommandHandler> logger)
    {
        _clusteringService = clusteringService;
        _logger = logger;
    }

    public async Task<Result<ClusterQueriesResult>> Handle(
        ClusterQueriesCommand request,
        CancellationToken cancellationToken)
    {
        if (request.ClusterCount < 2 || request.ClusterCount > 20)
        {
            return Result<ClusterQueriesResult>.Failure(
                Error.Validation("Cluster count must be between 2 and 20"));
        }

        _logger.LogInformation(
            "Starting topic clustering. UserId: {UserId}, ClusterCount: {Count}",
            request.UserId, request.ClusterCount);

        try
        {
            var result = await _clusteringService.ClusterQueriesAsync(
                request.UserId, request.ClusterCount, cancellationToken: cancellationToken);

            if (!result.Success)
            {
                return Result<ClusterQueriesResult>.Failure(
                    Error.Custom("ClusteringFailed", result.Error ?? "Clustering failed"));
            }

            return Result<ClusterQueriesResult>.Success(new ClusterQueriesResult(
                Success: true,
                TotalProcessed: result.TotalProcessed,
                ClusterCount: result.ClusterCount,
                TopicLabels: result.TopicLabels
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clustering queries. UserId: {UserId}", request.UserId);
            return Result<ClusterQueriesResult>.Failure(Error.Internal("Failed to cluster queries"));
        }
    }
}
