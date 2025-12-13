using MediatR;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Queries.Chat.GetAllConversations;

/// <summary>
/// Query to get all conversations for a user (deprecated - use paged query)
/// </summary>
public record GetAllConversationsQuery(
    string UserId
) : IRequest<Result<IEnumerable<ChatConversation>>>;
