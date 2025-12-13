using SecondBrain.Application.DTOs.Common;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Services.Chat;

/// <summary>
/// Service interface for chat conversation operations
/// </summary>
public interface IChatConversationService
{
    /// <summary>
    /// Get all conversations for a user
    /// </summary>
    Task<IEnumerable<ChatConversation>> GetAllConversationsAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get paginated conversation headers (without messages) for a user
    /// </summary>
    Task<PaginatedResult<ChatConversation>> GetConversationsPagedAsync(
        string userId, int page = 1, int pageSize = 20, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a conversation by ID (verifies ownership)
    /// </summary>
    Task<ChatConversation?> GetConversationByIdAsync(string conversationId, string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a new conversation
    /// </summary>
    Task<ChatConversation> CreateConversationAsync(
        string title,
        string provider,
        string model,
        string userId,
        bool ragEnabled = false,
        bool agentEnabled = false,
        bool agentRagEnabled = true,
        bool imageGenerationEnabled = false,
        string? agentCapabilities = null,
        string? vectorStoreProvider = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Update conversation settings
    /// </summary>
    Task<ChatConversation?> UpdateConversationSettingsAsync(
        string conversationId,
        string userId,
        bool? ragEnabled = null,
        string? vectorStoreProvider = null,
        bool? agentEnabled = null,
        bool? agentRagEnabled = null,
        string? agentCapabilities = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete a conversation (verifies ownership)
    /// </summary>
    Task<bool> DeleteConversationAsync(string conversationId, string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete multiple conversations (verifies ownership)
    /// </summary>
    Task<int> BulkDeleteConversationsAsync(IEnumerable<string> conversationIds, string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Add a message to a conversation
    /// </summary>
    Task<ChatConversation?> AddMessageToConversationAsync(
        string conversationId,
        string userId,
        ChatMessage message,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if a conversation belongs to a user
    /// </summary>
    Task<bool> IsConversationOwnedByUserAsync(string conversationId, string userId, CancellationToken cancellationToken = default);
}

