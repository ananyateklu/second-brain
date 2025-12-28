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
    /// <param name="note">The note to create a version for.</param>
    /// <param name="modifiedBy">User who made this change.</param>
    /// <param name="changeSummary">Optional description of what changed.</param>
    /// <param name="aiProvider">AI provider name when modified by an agent.</param>
    /// <param name="aiModel">AI model identifier when modified by an agent.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<int> CreateVersionAsync(
        Note note,
        string modifiedBy,
        string? changeSummary = null,
        string? aiProvider = null,
        string? aiModel = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates the initial version for a newly created note.
    /// </summary>
    /// <param name="note">The newly created note.</param>
    /// <param name="createdBy">User who created the note.</param>
    /// <param name="aiProvider">AI provider name when created by an agent.</param>
    /// <param name="aiModel">AI model identifier when created by an agent.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<NoteVersionResponse> CreateInitialVersionAsync(
        Note note,
        string createdBy,
        string? aiProvider = null,
        string? aiModel = null,
        CancellationToken cancellationToken = default);

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
