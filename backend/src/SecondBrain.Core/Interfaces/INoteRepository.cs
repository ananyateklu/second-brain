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

    // Soft delete operations
    Task<bool> SoftDeleteAsync(string id, string deletedBy);
    Task<int> SoftDeleteManyAsync(IEnumerable<string> ids, string userId);
    Task<bool> RestoreAsync(string id);
    Task<bool> HardDeleteAsync(string id);
    Task<IEnumerable<Note>> GetDeletedByUserIdAsync(string userId);
}
