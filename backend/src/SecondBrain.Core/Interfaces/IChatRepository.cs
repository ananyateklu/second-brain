using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

public interface IChatRepository
{
    Task<IEnumerable<ChatConversation>> GetAllAsync(string userId);
    Task<ChatConversation?> GetByIdAsync(string id);
    Task<ChatConversation> CreateAsync(ChatConversation conversation);
    Task<ChatConversation?> UpdateAsync(string id, ChatConversation conversation);
    Task<bool> DeleteAsync(string id);
    Task<int> DeleteManyAsync(IEnumerable<string> ids, string userId);
    Task<ChatConversation?> AddMessageAsync(string id, ChatMessage message);

    // Optimized queries (compiled queries for performance)
    /// <summary>
    /// Gets conversation headers (without messages) for list/sidebar display.
    /// Uses compiled query for optimal performance.
    /// </summary>
    Task<IEnumerable<ChatConversation>> GetConversationHeadersAsync(string userId);

    /// <summary>
    /// Checks if a conversation exists and belongs to the specified user.
    /// Uses compiled query for optimal performance.
    /// </summary>
    Task<bool> ExistsForUserAsync(string conversationId, string userId);

    // Soft delete operations
    Task<bool> SoftDeleteAsync(string id, string deletedBy);
    Task<int> SoftDeleteManyAsync(IEnumerable<string> ids, string userId);
    Task<bool> RestoreAsync(string id);
    Task<bool> HardDeleteAsync(string id);
    Task<IEnumerable<ChatConversation>> GetDeletedByUserIdAsync(string userId);
}

