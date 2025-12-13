using MediatR;
using SecondBrain.Application.DTOs.Common;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Queries.Chat.GetConversationsPaged;

/// <summary>
/// Query to get paginated conversations for a user with sorting support
/// </summary>
public record GetConversationsPagedQuery(
    string UserId,
    int Page = 1,
    int PageSize = 20,
    string? SortBy = null,
    SortDirection SortDirection = SortDirection.Descending
) : IRequest<Result<PaginatedResult<ChatConversation>>>;
