using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.RagAnalytics.ClusterQueries;

/// <summary>
/// Command to run topic clustering on recent queries
/// </summary>
public record ClusterQueriesCommand(
    string UserId,
    int ClusterCount = 5
) : IRequest<Result<ClusterQueriesResult>>;

/// <summary>
/// Result of topic clustering operation
/// </summary>
public record ClusterQueriesResult(
    bool Success,
    int TotalProcessed,
    int ClusterCount,
    List<string> TopicLabels,
    string? Error = null
);
