using MediatR;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Commands.Chat.UpdateConversationSettings;

/// <summary>
/// Command to update conversation settings (RAG, agent, vector store)
/// </summary>
public record UpdateConversationSettingsCommand(
    string ConversationId,
    string UserId,
    bool? RagEnabled = null,
    string? VectorStoreProvider = null,
    bool? AgentEnabled = null,
    bool? AgentRagEnabled = null,
    string? AgentCapabilities = null
) : IRequest<Result<ChatConversation>>;
