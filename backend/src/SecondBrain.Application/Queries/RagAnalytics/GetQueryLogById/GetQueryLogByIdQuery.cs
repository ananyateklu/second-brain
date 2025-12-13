using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.RagAnalytics.GetQueryLogById;

/// <summary>
/// Query to get a specific RAG query log by ID
/// </summary>
public record GetQueryLogByIdQuery(
    string UserId,
    Guid LogId
) : IRequest<Result<RagQueryLogResponse>>;
