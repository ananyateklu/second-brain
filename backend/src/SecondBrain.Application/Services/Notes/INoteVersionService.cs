using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Core.Entities;

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Service interface for note version history operations.
/// Provides version tracking, history retrieval, and restore functionality.
/// </summary>
public interface INoteVersionService
{
    /// <summary>
    /// Gets the current version of a note.
    /// </summary>
    Task<NoteVersionResponse?> GetCurrentVersionAsync(string noteId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a note's content as it was at a specific point in time.
    /// </summary>
    Task<NoteVersionResponse?> GetVersionAtTimeAsync(string noteId, DateTime timestamp, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the complete version history of a note.
    /// </summary>
    Task<NoteVersionHistoryResponse> GetVersionHistoryAsync(string noteId, int skip = 0, int take = 50, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a specific version by version number.
    /// </summary>
    Task<NoteVersionResponse?> GetVersionByNumberAsync(string noteId, int versionNumber, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new version snapshot for a note.
    /// Should be called when a note is updated.
    /// </summary>
    Task<int> CreateVersionAsync(Note note, string modifiedBy, string? changeSummary = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates the initial version for a newly created note.
    /// </summary>
    Task<NoteVersionResponse> CreateInitialVersionAsync(Note note, string createdBy, CancellationToken cancellationToken = default);

    /// <summary>
    /// Compares two versions and returns the differences.
    /// </summary>
    Task<NoteVersionDiffResponse?> GetVersionDiffAsync(string noteId, int fromVersion, int toVersion, CancellationToken cancellationToken = default);

    /// <summary>
    /// Restores a note to a previous version.
    /// Creates a new version with the content from the target version.
    /// </summary>
    Task<int> RestoreVersionAsync(string noteId, int targetVersion, string restoredBy, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the total number of versions for a note.
    /// </summary>
    Task<int> GetVersionCountAsync(string noteId, CancellationToken cancellationToken = default);
}
