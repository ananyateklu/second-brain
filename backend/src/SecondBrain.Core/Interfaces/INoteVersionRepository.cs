using SecondBrain.Core.Entities;

namespace SecondBrain.Core.Interfaces;

/// <summary>
/// Repository interface for note version history operations.
/// Supports PostgreSQL 18 temporal queries with WITHOUT OVERLAPS constraints.
/// </summary>
public interface INoteVersionRepository
{
    /// <summary>
    /// Gets the current (active) version of a note.
    /// Current versions have an unbounded upper limit on their valid_period.
    /// </summary>
    /// <param name="noteId">The note ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The current version or null if no versions exist</returns>
    Task<NoteVersion?> GetCurrentVersionAsync(string noteId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the version of a note that was active at a specific point in time.
    /// Uses PostgreSQL range containment operator (@>).
    /// </summary>
    /// <param name="noteId">The note ID</param>
    /// <param name="timestamp">The point in time to query</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The version active at that time or null</returns>
    Task<NoteVersion?> GetVersionAtTimeAsync(string noteId, DateTime timestamp, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all versions of a note ordered by time (newest first).
    /// </summary>
    /// <param name="noteId">The note ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of all versions</returns>
    Task<List<NoteVersion>> GetVersionHistoryAsync(string noteId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets paginated version history for a note.
    /// </summary>
    /// <param name="noteId">The note ID</param>
    /// <param name="skip">Number of versions to skip</param>
    /// <param name="take">Number of versions to take</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Paginated list of versions</returns>
    Task<List<NoteVersion>> GetVersionHistoryAsync(string noteId, int skip, int take, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the total count of versions for a note.
    /// </summary>
    /// <param name="noteId">The note ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Count of versions</returns>
    Task<int> GetVersionCountAsync(string noteId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a specific version by note ID and version number.
    /// </summary>
    /// <param name="noteId">The note ID</param>
    /// <param name="versionNumber">The version number</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The version or null</returns>
    Task<NoteVersion?> GetVersionByNumberAsync(string noteId, int versionNumber, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new version of a note.
    /// Automatically closes the current version (if any) by setting its end time.
    /// Uses the database function create_note_version() for atomic operation.
    /// </summary>
    /// <param name="note">The note to create a version from</param>
    /// <param name="modifiedBy">User who made the change</param>
    /// <param name="changeSummary">Optional description of changes</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The new version number</returns>
    Task<int> CreateVersionAsync(Note note, string modifiedBy, string? changeSummary = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates the initial version for a new note.
    /// Should be called when a note is first created.
    /// </summary>
    /// <param name="note">The newly created note</param>
    /// <param name="createdBy">User who created the note</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The created version (version 1)</returns>
    Task<NoteVersion> CreateInitialVersionAsync(Note note, string createdBy, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets versions modified by a specific user.
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <param name="skip">Number to skip</param>
    /// <param name="take">Number to take</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of versions</returns>
    Task<List<NoteVersion>> GetVersionsByUserAsync(string userId, int skip, int take, CancellationToken cancellationToken = default);

    /// <summary>
    /// Compares two versions and returns the differences.
    /// </summary>
    /// <param name="noteId">The note ID</param>
    /// <param name="fromVersion">Earlier version number</param>
    /// <param name="toVersion">Later version number</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Tuple of (fromVersion, toVersion) or null if versions not found</returns>
    Task<(NoteVersion From, NoteVersion To)?> GetVersionDiffAsync(string noteId, int fromVersion, int toVersion, CancellationToken cancellationToken = default);

    /// <summary>
    /// Restores a note to a previous version.
    /// Creates a new version with the content from the specified version.
    /// </summary>
    /// <param name="noteId">The note ID</param>
    /// <param name="targetVersionNumber">Version to restore to</param>
    /// <param name="restoredBy">User performing the restore</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The new version number</returns>
    Task<int> RestoreVersionAsync(string noteId, int targetVersionNumber, string restoredBy, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes all versions for a note.
    /// Should be called when a note is permanently deleted.
    /// </summary>
    /// <param name="noteId">The note ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of versions deleted</returns>
    Task<int> DeleteAllVersionsAsync(string noteId, CancellationToken cancellationToken = default);
}
