using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.Indexing.GetIndexStats;

/// <summary>
/// Query to get index statistics for a user from both PostgreSQL and Pinecone
/// </summary>
public record GetIndexStatsQuery(
    string UserId
) : IRequest<Result<IndexStatsResponse>>;
