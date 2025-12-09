using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Thread-safe repository interface for parallel note operations.
/// Uses IDbContextFactory to create isolated DbContext instances per operation,
/// allowing safe concurrent database access.
/// </summary>
public interface IParallelNoteRepository
{
    /// <summary>
    /// Gets all notes for a user with an isolated DbContext (thread-safe).
    /// </summary>
    Task<IEnumerable<Note>> GetByUserIdAsync(string userId);

    /// <summary>
    /// Gets a note by ID with an isolated DbContext (thread-safe).
    /// </summary>
    Task<Note?> GetByIdAsync(string id);

    /// <summary>
    /// Creates a note with an isolated DbContext (thread-safe).
    /// </summary>
    Task<Note> CreateAsync(Note note);

    /// <summary>
    /// Updates a note with an isolated DbContext (thread-safe).
    /// </summary>
    Task<Note?> UpdateAsync(string id, Note note);

    /// <summary>
    /// Soft deletes a note with an isolated DbContext (thread-safe).
    /// </summary>
    Task<bool> SoftDeleteAsync(string id, string deletedBy);

    /// <summary>
    /// Soft deletes multiple notes with an isolated DbContext (thread-safe).
    /// </summary>
    Task<int> SoftDeleteManyAsync(IEnumerable<string> ids, string userId);

    /// <summary>
    /// Deletes a note permanently with an isolated DbContext (thread-safe).
    /// </summary>
    Task<bool> DeleteAsync(string id);
}
