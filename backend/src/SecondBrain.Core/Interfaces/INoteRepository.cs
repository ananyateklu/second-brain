using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

public interface INoteRepository
{
    Task<IEnumerable<Note>> GetAllAsync();
    Task<Note?> GetByIdAsync(string id);
    Task<Note> CreateAsync(Note note);
    Task<Note?> UpdateAsync(string id, Note note);
    Task<bool> DeleteAsync(string id);
    Task<int> DeleteManyAsync(IEnumerable<string> ids, string userId);
    Task<Note?> GetByUserIdAndExternalIdAsync(string userId, string externalId);
    Task<IEnumerable<Note>> GetByUserIdAsync(string userId);
}
