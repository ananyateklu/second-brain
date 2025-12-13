using MediatR;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Commands.Chat.CreateConversation;

/// <summary>
/// Command to create a new chat conversation
/// </summary>
public record CreateConversationCommand(
    string Title,
    string Provider,
    string Model,
    string UserId,
    bool RagEnabled = false,
    bool AgentEnabled = false,
    bool AgentRagEnabled = true,
    bool ImageGenerationEnabled = false,
    string? AgentCapabilities = null,
    string? VectorStoreProvider = null
) : IRequest<Result<ChatConversation>>;
