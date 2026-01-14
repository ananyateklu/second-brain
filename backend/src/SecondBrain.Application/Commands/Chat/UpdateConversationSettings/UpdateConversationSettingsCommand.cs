using MediatR;
using SecondBrain.Core.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Commands.Chat.UpdateConversationSettings;

/// <summary>
/// Command to update conversation settings (title, provider, model, RAG, agent, vector store)
/// </summary>
public record UpdateConversationSettingsCommand(
    string ConversationId,
    string UserId,
    string? Title = null,
    string? Provider = null,
    string? Model = null,
    bool? RagEnabled = null,
    string? VectorStoreProvider = null,
    bool? AgentEnabled = null,
    bool? AgentRagEnabled = null,
    string? AgentCapabilities = null
) : IRequest<Result<ChatConversation>>;
