using MediatR;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Queries.RagAnalytics.GetQueryLogs;

/// <summary>
/// Query to get paginated RAG query logs
/// </summary>
public record GetQueryLogsQuery(
    string UserId,
    int Page = 1,
    int PageSize = 20,
    DateTime? Since = null,
    bool FeedbackOnly = false
) : IRequest<Result<RagQueryLogsResponse>>;
