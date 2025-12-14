using SecondBrain.Application.DTOs.Requests;
using SecondBrain.Application.DTOs.Responses;
using SecondBrain.Application.Services.Notes.Models;
using SecondBrain.Core.Common;
using SecondBrain.Core.Enums;

namespace SecondBrain.Application.Services.Notes;

/// <summary>
/// Domain service for all note mutation operations.
/// Centralizes business logic including validation, versioning, and indexing.
///
/// <para>
/// <b>ARCHITECTURAL MANDATE:</b> All note mutations MUST go through this service.
/// This includes:
/// <list type="bullet">
///   <item>CQRS command handlers (CreateNoteCommandHandler, UpdateNoteCommandHandler, etc.)</item>
///   <item>Agent plugins (NoteCrudPlugin)</item>
///   <item>Import services (NotesImportService)</item>
///   <item>Any future note mutation entry points</item>
/// </list>
/// </para>
///
/// <para>
/// <b>Benefits:</b>
/// <list type="bullet">
///   <item>Single source of truth for note business logic</item>
///   <item>Consistent version tracking across ALL entry points</item>
///   <item>Type-safe source tracking (NoteSource enum, not strings)</item>
///   <item>Centralized validation and authorization</item>
///   <item>Audit trail for all operations</item>
///   <item>Easy to test (mock one interface)</item>
/// </list>
/// </para>
/// </summary>
public interface INoteOperationService
{
    #region Create Operations

    /// <summary>
    /// Creates a new note with full version tracking.
    /// </summary>
    /// <param name="request">The creation request with all note data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: NoteOperationResult with the created note and version info.
    /// Failure: Validation errors if title is empty or other constraints violated.
    /// </returns>
    /// <remarks>
    /// This method:
    /// <list type="bullet">
    ///   <item>Validates required fields (title)</item>
    ///   <item>Generates AI summary if configured</item>
    ///   <item>Creates the note in the repository</item>
    ///   <item>Creates initial version (v1) with source tracking</item>
    ///   <item>Processes images if provided</item>
    ///   <item>Triggers embedding/indexing asynchronously</item>
    /// </list>
    /// </remarks>
    Task<Result<NoteOperationResult>> CreateAsync(
        CreateNoteOperationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Duplicates an existing note.
    /// </summary>
    /// <param name="request">The duplication request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: NoteOperationResult with the duplicated note.
    /// Failure: NotFound if source note doesn't exist, Forbidden if not owned.
    /// </returns>
    Task<Result<NoteOperationResult>> DuplicateAsync(
        DuplicateNoteOperationRequest request,
        CancellationToken cancellationToken = default);

    #endregion

    #region Update Operations

    /// <summary>
    /// Updates an existing note. Only provided fields are updated.
    /// </summary>
    /// <param name="request">The update request with changed fields.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: NoteOperationResult with the updated note.
    ///   - If no changes detected, VersionNumber will be 0 and Changes will be empty.
    /// Failure: NotFound if note doesn't exist, Forbidden if not owned.
    /// </returns>
    /// <remarks>
    /// This method:
    /// <list type="bullet">
    ///   <item>Verifies note ownership</item>
    ///   <item>Detects what actually changed</item>
    ///   <item>Skips update if nothing changed</item>
    ///   <item>Creates new version with change summary</item>
    ///   <item>Regenerates AI summary if content/title changed</item>
    ///   <item>Processes images if provided</item>
    ///   <item>Triggers re-indexing if content changed</item>
    /// </list>
    /// </remarks>
    Task<Result<NoteOperationResult>> UpdateAsync(
        UpdateNoteOperationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Appends content to the end of a note.
    /// </summary>
    /// <param name="request">The append request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: NoteOperationResult with changes = ["content"].
    /// Failure: NotFound, Forbidden, or Validation errors.
    /// </returns>
    Task<Result<NoteOperationResult>> AppendAsync(
        AppendToNoteOperationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Archives or unarchives a note.
    /// </summary>
    /// <param name="request">The archive request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: NoteOperationResult with changes = ["archived"].
    /// Failure: NotFound, Forbidden, or no change if already at target state.
    /// </returns>
    Task<Result<NoteOperationResult>> SetArchivedAsync(
        SetArchivedOperationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Moves a note to a different folder.
    /// </summary>
    /// <param name="request">The move request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: NoteOperationResult with changes = ["folder"].
    /// Failure: NotFound, Forbidden, or no change if already in target folder.
    /// </returns>
    Task<Result<NoteOperationResult>> MoveToFolderAsync(
        MoveToFolderOperationRequest request,
        CancellationToken cancellationToken = default);

    #endregion

    #region Delete Operations

    /// <summary>
    /// Deletes a note (soft or hard delete based on request).
    /// </summary>
    /// <param name="request">The delete request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: NoteDeleteResult with deletion details.
    /// Failure: NotFound if note doesn't exist, Forbidden if not owned.
    /// </returns>
    Task<Result<NoteDeleteResult>> DeleteAsync(
        DeleteNoteOperationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Permanently deletes a soft-deleted note.
    /// </summary>
    /// <param name="noteId">The note ID to permanently delete.</param>
    /// <param name="userId">User ID for ownership verification.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: true if deleted.
    /// Failure: NotFound if note doesn't exist or isn't soft-deleted.
    /// </returns>
    Task<Result<bool>> PermanentDeleteAsync(
        string noteId,
        string userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Restores a soft-deleted note.
    /// </summary>
    /// <param name="noteId">The note ID to restore.</param>
    /// <param name="userId">User ID for ownership verification.</param>
    /// <param name="source">Source of the restore operation.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: NoteOperationResult with the restored note.
    /// Failure: NotFound if note doesn't exist or isn't soft-deleted.
    /// </returns>
    Task<Result<NoteOperationResult>> RestoreDeletedAsync(
        string noteId,
        string userId,
        NoteSource source,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Bulk deletes multiple notes.
    /// </summary>
    /// <param name="request">The bulk delete request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: BulkDeleteResult with counts and IDs.
    /// Note: Partial success is possible - check DeletedCount vs FailedIds.
    /// </returns>
    Task<Result<BulkDeleteResult>> BulkDeleteAsync(
        BulkDeleteNotesOperationRequest request,
        CancellationToken cancellationToken = default);

    #endregion

    #region Version Operations

    /// <summary>
    /// Restores a note to a previous version.
    /// Creates a new version with the restored content.
    /// </summary>
    /// <param name="request">The restore version request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: RestoreVersionResult with the restored note and version info.
    /// Failure: NotFound if note or version doesn't exist.
    /// </returns>
    Task<Result<RestoreVersionResult>> RestoreVersionAsync(
        RestoreVersionOperationRequest request,
        CancellationToken cancellationToken = default);

    #endregion

    #region Import Operations

    /// <summary>
    /// Imports multiple notes in a batch with full version tracking.
    /// </summary>
    /// <param name="userId">User ID for the imported notes.</param>
    /// <param name="notes">Collection of notes to import.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// Success: ImportNotesResponse with import statistics.
    /// Note: Partial success is possible - check counts and per-note results.
    /// </returns>
    /// <remarks>
    /// This method:
    /// <list type="bullet">
    ///   <item>Detects duplicates via ExternalId</item>
    ///   <item>Creates new notes or updates existing</item>
    ///   <item>Tracks source as IosNotes or Import based on input</item>
    ///   <item>Creates version history for all operations</item>
    ///   <item>Continues processing even if individual notes fail</item>
    /// </list>
    /// </remarks>
    Task<Result<ImportNotesResponse>> ImportBatchAsync(
        string userId,
        IReadOnlyCollection<ImportNoteRequest> notes,
        CancellationToken cancellationToken = default);

    #endregion
}
