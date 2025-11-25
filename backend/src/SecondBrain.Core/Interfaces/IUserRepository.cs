using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(string id);
    Task<User?> GetByApiKeyAsync(string apiKey);
    Task<User?> GetByEmailAsync(string email);
    Task<User> CreateAsync(User user);
    Task<User?> UpdateAsync(string id, User user);
    Task<bool> DeleteAsync(string id);
    Task<string?> ResolveUserIdByApiKeyAsync(string apiKey);
}
