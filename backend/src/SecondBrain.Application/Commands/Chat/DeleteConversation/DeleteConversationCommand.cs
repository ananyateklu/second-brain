using MediatR;
using SecondBrain.Core.Common;

namespace SecondBrain.Application.Commands.Chat.DeleteConversation;

/// <summary>
/// Command to delete a chat conversation
/// </summary>
public record DeleteConversationCommand(
    string ConversationId,
    string UserId
) : IRequest<Result<bool>>;
