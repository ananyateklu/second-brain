using MediatR;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Queries.Chat.GetConversationById;

/// <summary>
/// Query to get a specific conversation by ID
/// </summary>
public record GetConversationByIdQuery(
    string ConversationId,
    string UserId
) : IRequest<Result<ChatConversation>>;
