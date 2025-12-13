using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Indexing.GetIndexingStatus;

/// <summary>
/// Query to get the status of an indexing job
/// </summary>
public record GetIndexingStatusQuery(
    string JobId
) : IRequest<Result<IndexingJobResponse>>;
