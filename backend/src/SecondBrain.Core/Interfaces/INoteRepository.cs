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

    /// <summary>
    /// Gets paginated notes for a user with sorting support
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="page">Page number (1-based)</param>
    /// <param name="pageSize">Number of items per page</param>
    /// <param name="folder">Optional folder filter</param>
    /// <param name="includeArchived">Include archived notes</param>
    /// <param name="search">Optional search query</param>
    /// <param name="sortBy">Field to sort by (createdAt, updatedAt, title). Default: updatedAt</param>
    /// <param name="sortDescending">Sort in descending order. Default: true</param>
    /// <returns>Tuple of (notes, totalCount)</returns>
    Task<(IEnumerable<Note> Items, int TotalCount)> GetByUserIdPagedAsync(
        string userId,
        int page,
        int pageSize,
        string? folder = null,
        bool includeArchived = false,
        string? search = null,
        string? sortBy = null,
        bool sortDescending = true);

    // Soft delete operations
    Task<bool> SoftDeleteAsync(string id, string deletedBy);
    Task<int> SoftDeleteManyAsync(IEnumerable<string> ids, string userId);
    Task<bool> RestoreAsync(string id);
    Task<bool> HardDeleteAsync(string id);
    Task<IEnumerable<Note>> GetDeletedByUserIdAsync(string userId);
}
