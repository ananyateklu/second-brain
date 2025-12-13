using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Chat.BulkDeleteConversations;

/// <summary>
/// Command to bulk delete multiple chat conversations
/// </summary>
public record BulkDeleteConversationsCommand(
    List<string> ConversationIds,
    string UserId
) : IRequest<Result<int>>;
