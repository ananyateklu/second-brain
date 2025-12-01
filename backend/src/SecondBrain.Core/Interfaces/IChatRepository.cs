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
}

