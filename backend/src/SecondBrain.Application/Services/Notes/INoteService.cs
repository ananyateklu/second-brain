using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Service interface for note operations
/// </summary>
public interface INoteService
{
    /// <summary>
    /// Get all notes for a user
    /// </summary>
    Task<IEnumerable<NoteResponse>> GetAllNotesAsync(string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get a note by ID (verifies ownership)
    /// </summary>
    Task<NoteResponse?> GetNoteByIdAsync(string noteId, string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a new note
    /// </summary>
    Task<NoteResponse> CreateNoteAsync(CreateNoteRequest request, string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update an existing note (verifies ownership)
    /// </summary>
    Task<NoteResponse?> UpdateNoteAsync(string noteId, UpdateNoteRequest request, string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete a note (verifies ownership)
    /// </summary>
    Task<bool> DeleteNoteAsync(string noteId, string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete multiple notes (verifies ownership)
    /// </summary>
    Task<int> BulkDeleteNotesAsync(IEnumerable<string> noteIds, string userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if a note belongs to a user
    /// </summary>
    Task<bool> IsNoteOwnedByUserAsync(string noteId, string userId, CancellationToken cancellationToken = default);
}

